"""Text-mode interview loop. Runs a full session in the terminal.

Usage (from backend/ with venv active):
    python -m cli.run_interview --resume path/to/resume.txt --jd path/to/jd.txt --role sde

Memory is saved to /tmp/interviewai_memory.json after each session and reloaded
at the start of the next one, so the Planner automatically targets your weak areas.
"""
import argparse
import json
import uuid
from datetime import date
from pathlib import Path

from config.settings import Settings
from llm.client import LLMClient
from models.contracts import MemoryProfile
from graph.session_start import build_session_start_graph
from graph.interview_turn import build_interview_turn_graph, InterviewTurnState
from graph.session_end import build_session_end_graph

_MEMORY_FILE = Path("/tmp/interviewai_memory.json")


def _load_memory(candidate_id: str) -> MemoryProfile:
    if _MEMORY_FILE.exists():
        data = json.loads(_MEMORY_FILE.read_text())
        if data.get("candidateId") == candidate_id:
            return MemoryProfile.model_validate(data)
    return MemoryProfile(
        candidateId=candidate_id, recurringWeaknesses=[], improvementTrend=[], strongAreas=[],
    )


def _save_memory(memory: MemoryProfile) -> None:
    _MEMORY_FILE.write_text(memory.model_dump_json(by_alias=True, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", required=True)
    parser.add_argument("--jd", required=True)
    parser.add_argument("--role", default="sde")
    parser.add_argument("--candidate-id", default="local-dev")
    args = parser.parse_args()

    settings = Settings()
    llm = LLMClient(region=settings.aws_region)

    existing_memory = _load_memory(args.candidate_id)
    if existing_memory.recurring_weaknesses:
        top_weak = [w.tag for w in existing_memory.recurring_weaknesses[:3]]
        print(f"\nMemory loaded — targeting your weak areas: {', '.join(top_weak)}")

    session_graph = build_session_start_graph(
        llm=llm, intake_model=settings.intake_model, planner_model=settings.planner_model,
    )
    session_result = session_graph.invoke({
        "session_id": str(uuid.uuid4()),
        "resume_text": open(args.resume).read(),
        "jd_text": open(args.jd).read(),
        "role_key": args.role,
        "memory": existing_memory,
    })
    plan = session_result["plan"]

    print(f"\n{'='*60}")
    print(f"Interview ready — {len(plan.questions)} questions")
    print(f"{'='*60}\n")

    turn_graph = build_interview_turn_graph(
        llm=llm,
        interviewer_model=settings.interviewer_model,
        evaluator_model=settings.evaluator_model,
    )

    state: InterviewTurnState = {
        "plan": plan,
        "current_question_idx": 0,
        "follow_up_count": 0,
        "candidate_answer": "",
        "evaluations": [],
    }

    current_q = plan.questions[0]
    print(f"[Q1/{len(plan.questions)}] {current_q.prompt}\n")

    while True:
        answer = input("You: ").strip()
        if not answer:
            continue

        state["candidate_answer"] = answer
        result = turn_graph.invoke(dict(state))
        state.update(result)

        decision = result["decision"]

        if decision.action in ("follow_up", "clarify"):
            print(f"\nInterviewer: {decision.say or decision.follow_up_prompt}\n")

        elif decision.action in ("advance", "complete"):
            ev = result.get("evaluation")
            if ev:
                survived = "PASS" if ev.would_survive_real_interview else "FAIL"
                print(f"\n[{survived}] {ev.survival_reasoning}")
                scores_str = ", ".join(f"{k}={v}" for k, v in ev.rubric_scores.items())
                print(f"Scores: {scores_str}")
                if ev.weakness_tags:
                    print(f"Weaknesses: {', '.join(ev.weakness_tags)}")
                print()

            if decision.action == "complete" or result.get("session_complete"):
                print(f"\n{'='*60}")
                print("Session complete.")
                all_evals = result.get("evaluations") or []
                passed = sum(1 for e in all_evals if e.would_survive_real_interview)
                print(f"Results: {passed}/{len(all_evals)} answers would survive a real interview.")

                # Persist memory for next session
                if all_evals:
                    print("\nAggregating session results into memory...")
                    end_graph = build_session_end_graph(llm=llm, memory_model=settings.memory_model)
                    end_result = end_graph.invoke({
                        "candidate_id": args.candidate_id,
                        "session_date": date.today().isoformat(),
                        "evaluations": all_evals,
                        "existing_memory": existing_memory,
                    })
                    updated = end_result["updated_memory"]
                    _save_memory(updated)
                    if updated.recurring_weaknesses:
                        top = [w.tag for w in updated.recurring_weaknesses[:3]]
                        print(f"Weak areas to focus on next session: {', '.join(top)}")

                print(f"{'='*60}\n")
                break

            next_idx = result["current_question_idx"]
            if next_idx < len(plan.questions):
                next_q = plan.questions[next_idx]
                print(f"[Q{next_idx + 1}/{len(plan.questions)}] {next_q.prompt}\n")


if __name__ == "__main__":
    main()
