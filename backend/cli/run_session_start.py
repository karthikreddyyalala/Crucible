"""Manual runner: real Claude-on-Bedrock call to eyeball personalization quality.

Usage:
    python -m cli.run_session_start --resume path/to/resume.txt \
        --jd path/to/jd.txt --role sde
"""
import argparse
import uuid

from config.settings import Settings
from llm.client import LLMClient
from models.contracts import MemoryProfile
from graph.session_start import build_session_start_graph


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--resume", required=True)
    parser.add_argument("--jd", required=True)
    parser.add_argument("--role", default="sde")
    args = parser.parse_args()

    settings = Settings()
    llm = LLMClient(region=settings.aws_region)
    graph = build_session_start_graph(
        llm=llm, intake_model=settings.intake_model, planner_model=settings.planner_model,
        intake_temperature=settings.intake_temperature, planner_temperature=settings.planner_temperature,
    )

    empty_memory = MemoryProfile(
        candidateId="local-dev", recurringWeaknesses=[], improvementTrend=[], strongAreas=[],
    )
    result = graph.invoke({
        "session_id": str(uuid.uuid4()),
        "resume_text": open(args.resume).read(),
        "jd_text": open(args.jd).read(),
        "role_key": args.role,
        "memory": empty_memory,
    })

    print("\n=== IntakeProfile ===")
    print(result["profile"].model_dump_json(by_alias=True, indent=2))
    print("\n=== QuestionPlan ===")
    print(result["plan"].model_dump_json(by_alias=True, indent=2))


if __name__ == "__main__":
    main()
