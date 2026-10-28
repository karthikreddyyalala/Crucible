// A local stand-in for the agent pipeline so the UI is fully demoable
// without AWS/Bedrock credentials. The heuristics intentionally mirror the
// real prompt rules: probe vague answers, never pass an unproven answer,
// cap follow-ups at two. Swap api.ts to HTTP when the backend is live.

import type {
  AnswerEvaluation,
  CoachResponse,
  IntakeProfile,
  InterviewDecision,
  InterviewLevel,
  InterviewMode,
  MemoryProfile,
  PlannedQuestion,
  QuestionPlan,
  RecurringWeakness,
} from "@/types/contracts";
import type { TurnInput } from "./api";

const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

const ROLE_LABEL: Record<string, string> = {
  sde: "Software Engineer",
  ai_engineer: "AI Engineer",
};

const QUESTION_BANK: Record<string, Omit<PlannedQuestion, "id" | "weightedFromWeakness">[]> = {
  sde: [
    {
      type: "behavioral",
      prompt:
        "Tell me about a time you owned a project end-to-end under a deadline you didn't think was realistic. What did you actually do?",
      targetDifficulty: 3,
    },
    {
      type: "technical",
      prompt:
        "You have a service whose p99 latency spikes only during traffic bursts, never at steady state. Walk me through how you'd diagnose the root cause.",
      targetDifficulty: 4,
    },
    {
      type: "system_design",
      prompt:
        "Design the backend for a feature that lets 5 million users get notified within seconds when a person they follow goes live. Start by telling me what you'd clarify first.",
      targetDifficulty: 4,
    },
    {
      type: "technical",
      prompt:
        "A teammate's PR doubles read throughput but you suspect it introduces a subtle race. How do you prove or disprove that before it ships?",
      targetDifficulty: 3,
    },
    {
      type: "behavioral",
      prompt:
        "Describe a technical decision you pushed for that turned out to be wrong. How did you find out, and what did it cost?",
      targetDifficulty: 3,
    },
  ],
  ai_engineer: [
    {
      type: "behavioral",
      prompt:
        "Tell me about an ML or LLM feature you shipped to real users. What broke in production that your eval suite never caught?",
      targetDifficulty: 4,
    },
    {
      type: "technical",
      prompt:
        "Your RAG system returns confidently wrong answers about 8% of the time. Walk me through how you'd attribute each failure to retrieval vs. generation.",
      targetDifficulty: 4,
    },
    {
      type: "system_design",
      prompt:
        "Design an evaluation pipeline for a multi-agent system where the output is open-ended text. How do you make 'is this good' measurable? Clarify scope first.",
      targetDifficulty: 5,
    },
    {
      type: "technical",
      prompt:
        "Explain how you'd cut inference cost on a high-traffic Claude endpoint by 40% without users noticing a quality drop. Name the specific levers.",
      targetDifficulty: 4,
    },
    {
      type: "behavioral",
      prompt:
        "Describe a time stakeholders wanted a model behavior you believed was unsafe or wrong. What did you do?",
      targetDifficulty: 3,
    },
  ],
};

const INTAKE_BY_ROLE: Record<string, Omit<IntakeProfile, "targetRole">> = {
  sde: {
    candidateSkills: ["TypeScript", "Go", "PostgreSQL", "Kubernetes", "gRPC", "distributed systems"],
    yearsExperience: 4,
    projectHighlights: [
      {
        title: "Realtime pricing engine",
        description: "Rebuilt a pricing path to cut p99 from 940ms to 180ms under burst load.",
        technologies: ["Go", "Redis", "Kafka"],
      },
      {
        title: "Multi-region failover",
        description: "Led active-active failover for the checkout service across 3 regions.",
        technologies: ["Kubernetes", "Envoy", "Terraform"],
      },
    ],
    targetCompany: "Stripe",
    jdRequirements: [
      "Strong distributed systems fundamentals",
      "Experience operating services at scale",
      "Bias toward measurable reliability",
    ],
    resumeToJdGaps: [
      "Resume shows breadth but thin evidence of leading an incident postmortem",
      "Limited demonstrated experience with formal capacity planning",
    ],
  },
  ai_engineer: {
    candidateSkills: ["Python", "PyTorch", "LangGraph", "RAG", "evals", "vector search", "Bedrock"],
    yearsExperience: 3,
    projectHighlights: [
      {
        title: "Agentic support copilot",
        description: "Shipped a multi-agent support tool that deflected 38% of tier-1 tickets.",
        technologies: ["LangGraph", "Claude", "Pinecone"],
      },
      {
        title: "Eval harness",
        description: "Built an offline eval suite that caught regressions before each model swap.",
        technologies: ["Python", "pytest", "Bedrock"],
      },
    ],
    targetCompany: "Anthropic",
    jdRequirements: [
      "Rigorous evaluation methodology for non-deterministic systems",
      "Production LLM experience, not just notebooks",
      "Cost and latency awareness at scale",
    ],
    resumeToJdGaps: [
      "Strong eval framing but little evidence of safety/red-team work",
      "Unclear ownership of production on-call for model endpoints",
    ],
  },
};

// Max probing follow-ups per question; mirrors backend FOLLOW_UP_BUDGET.
const FOLLOW_UP_BUDGET: Record<string, number> = { behavioral: 3, technical: 3, system_design: 6, coding: 6 };

// A few real problem ids per difficulty (each must exist in coding/problems.public.json,
// which the workspace loads through api.getProblem). One-sentence prompts, like the Planner's.
type CodingDifficulty = "easy" | "medium" | "hard";
const CODING_PROBLEMS: Record<CodingDifficulty, { id: string; prompt: string }[]> = {
  easy: [
    { id: "code-two-sum", prompt: "Let's do a coding problem: given a list of numbers and a target, find the two that add up to it." },
    { id: "code-valid-parentheses", prompt: "Let's do a coding problem: check whether a string of brackets is balanced." },
    { id: "code-contains-duplicate", prompt: "Let's do a coding problem: tell me whether any number appears more than once in a list." },
    { id: "code-best-time-to-buy-and-sell-stock", prompt: "Let's do a coding problem: given daily prices, find the best profit from one buy and one later sell." },
  ],
  medium: [
    { id: "code-group-anagrams", prompt: "Let's do a coding problem: group a list of words into sets of anagrams." },
    { id: "code-top-k-frequent-elements", prompt: "Let's do a coding problem: return the k most frequent numbers in a list." },
    { id: "code-longest-substring-without-repeating-characters", prompt: "Let's do a coding problem: find the length of the longest part of a string with no repeated characters." },
    { id: "code-product-of-array-except-self", prompt: "Let's do a coding problem: for each position, return the product of every other number, without using division." },
  ],
  hard: [
    { id: "code-minimum-window-substring", prompt: "Let's do a coding problem: find the shortest part of one string that contains every character of another." },
    { id: "code-merge-k-sorted-lists", prompt: "Let's do a coding problem: merge k sorted linked lists into one sorted list." },
  ],
};

// Spec 1.5: coding mode is two problems, easier first; a full mock has one.
const CODING_ROUND: Record<InterviewLevel, CodingDifficulty[]> = {
  junior: ["easy", "easy"], mid: ["easy", "medium"], senior: ["medium", "hard"],
};
const FULL_MOCK_CODING: Record<InterviewLevel, CodingDifficulty> = { junior: "easy", mid: "medium", senior: "medium" };

function codingQuestions(difficulties: CodingDifficulty[], level: InterviewLevel): Omit<PlannedQuestion, "id">[] {
  const used = new Set<string>();
  return difficulties.map((d) => {
    const problem = pick(CODING_PROBLEMS[d].filter((p) => !used.has(p.id)));
    used.add(problem.id);
    const targetDifficulty = d === "easy" ? 2 : d === "hard" ? 5 : level === "senior" ? 4 : 3;
    return { type: "coding", prompt: problem.prompt, targetDifficulty, weightedFromWeakness: false, exemplarId: problem.id };
  });
}

// Follow-up probes keyed loosely to question type — one ask each.
const PROBES: Record<string, string[]> = {
  behavioral: [
    "What did you personally do there — not the team, you?",
    "What was the measurable outcome? Give me a number if you have one.",
    "Looking back, what would you do differently?",
  ],
  technical: [
    "Walk me through the mechanism — how does that actually work under the hood?",
    "What breaks it? Give me one edge case and how you'd catch it.",
    "What's the complexity, and where does it fall over at scale?",
  ],
  system_design: [
    "Before the components — what would you clarify about the requirements?",
    "Where's the bottleneck in that design, and what tradeoff would you make for it?",
    "What happens when that component fails?",
    "How does the data model change once a single database can't hold it?",
    "How would you know in production that this design is falling behind?",
    "What would you build last, and what would you deliberately not build?",
  ],
};

// Graduated hints for "I don't know": a direction first, then a concrete case.
const HINTS: Record<string, string[]> = {
  behavioral: [
    "Think of any situation that comes close — a class project, a side project, an internship. What happened?",
    "Even a small example works. What's one time something went wrong and you had to fix it?",
  ],
  technical: [
    "Forget scale for a second. If this were running on one machine, what's the first thing you'd look at?",
    "Here's a concrete case: two requests hit the same piece of state at the same moment. What could go wrong?",
  ],
  system_design: [
    "Start smaller — how would you build it for a thousand users on a single server?",
    "Okay, say one server can't keep up. What's the first piece you'd split out, and why?",
  ],
};


// The client sends the whole thread for a question ("Q: " = Marcus, "A: " = candidate).
// The newest reply is everything after Marcus's last line, like the backend's
// _screen_thread; "" when the thread ends with his line (an event turn).
function latestReply(answer: string): string {
  const segments = answer.split(/\n(?=[QA]: )/);
  const lastQ = segments.map((seg) => seg.startsWith("Q: ")).lastIndexOf(true);
  return segments.slice(lastQ + 1).map((seg) => seg.replace(/^A: /, "")).join("\n").trim();
}

const DONT_KNOW = /\b(i\s*don'?t\s*know|not\s*sure|no\s*idea|no\s*clue|i'?m\s*stuck|i\s*can'?t\s*think|never\s*(done|worked|had)|i\s*have\s*no)\b/i;
const CLARIFY = /\b(repeat|rephrase|say\s*that\s*again|what\s*do\s*you\s*mean|can\s*you\s*clarify|could\s*you\s*explain\s*the\s*question|can\s*i\s*assume|should\s*i\s*assume)\b/i;
const ASKED_BACK = /\b(what about you|how about you|and you|how are you|how'?s your day)\b/i;

// Demo stand-in for backend/safety/moderation.py: insults aimed at the interviewer.
// Deliberately small; the backend's screen is the real one.
const ABUSE = /\b(?:f+u+c+k+\s*(?:you|u|off)|screw\s+you|stfu|shut\s+up(?!\s+(?:the|my|that|this|those)\b)|(?:you'?re|you\s+are|ur)\s+(?:an?\s+|so\s+|such\s+an?\s+)?(?:idiot|moron|stupid|useless|dumb|pathetic)|(?:stupid|dumb|useless)\s+(?:bot|ai|marcus))\b/i;

// What Marcus re-asks after a warning outside the planned questions (mirrors _PHASE_ASK).
const PHASE_ASK: Record<string, string> = {
  warmup: "how are you doing today?",
  background: "tell me a bit about your background.",
  closing: "what questions do you have for me?",
};

const CHECKIN = "How's it going — want to talk me through where you are?";
const PLAN_COMPLEXITY = "Before you code it — what's the time and space complexity of that plan?";
const BRUTE_FORCE = "That's okay — start with the brute force. What's the simplest thing that would work, even if it's slow?";
const COMPLEXITY = "What's the time and space complexity?";
const EDGE_CASES = "What edge cases would you test?";

// What a run summary (lib/coding/summary.ts) says went wrong, as Marcus's question; null if nothing did.
function failureAsk(summary: string): string | null {
  const broken = summary.match(/^(?:Load error|Runner error): (.*)$/);
  if (broken) return `It didn't run: ${broken[1]}. What's going on there?`;
  if (summary.startsWith("Timed out")) return "It timed out — that usually means a loop that never ends. Where could that happen in your code?";
  const example = summary.match(/example (\d+) failed/);
  if (example) return `Example ${example[1]} fails. Walk me through what your code does on that input — where does it go wrong?`;
  const hidden = summary.match(/Hidden tests: (\d+)\/(\d+)/);
  if (hidden && Number(hidden[1]) < Number(hidden[2])) return "The examples pass, but some hidden tests fail. What inputs might you not be handling?";
  return null;
}

// A coding question opens by asking for the approach (as the real Interviewer does).
const opening = (q: PlannedQuestion): string =>
  q.type === "coding" ? `${q.prompt} Before you start coding, talk me through your approach.` : q.prompt;

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

function bridgeTo(from: PlannedQuestion, next: PlannedQuestion): string {
  if (next.type === from.type) return pick(["Let's try another one.", "Next one.", "Okay, moving on."]);
  return next.type === "behavioral"
    ? "Let me switch gears to something about how you work."
    : next.type === "technical"
    ? "Let me switch to something more technical."
    : next.type === "coding"
    ? "Let's write some code."
    : "Let's do some system design.";
}

function looksVague(answer: string): boolean {
  const trimmed = answer.trim();
  const hasNumbers = /\d/.test(trimmed);
  const sentences = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
  const hedges = /(basically|kind of|sort of|we just|stuff|things|made sure|a lot of)/i.test(trimmed);
  if (trimmed.length < 180) return true;
  if (sentences < 2) return true;
  if (!hasNumbers && hedges) return true;
  return false;
}

function scoreAnswer(
  question: PlannedQuestion,
  answer: string,
  followUpCount: number,
  testResults = ""
): AnswerEvaluation {
  const trimmed = answer.trim();
  const hasNumbers = /\d/.test(trimmed);
  const length = trimmed.length;
  const strong = !looksVague(answer) && hasNumbers && length > 260;

  const criteriaByType: Record<string, string[]> = {
    behavioral: ["structure", "specificity", "impact", "ownership"],
    technical: ["correctness", "depth", "edge_cases", "communication"],
    system_design: ["requirements", "scalability", "tradeoffs", "depth"],
    coding: ["correctness", "efficiency", "code_quality", "communication"],
  };
  const criteria = criteriaByType[question.type];
  // Coding: correctness follows the last run, not the talk. Never run counts as failing.
  const testsFail = question.type === "coding" && (!testResults || failureAsk(testResults) !== null);

  const base = strong ? 4 : looksVague(answer) ? 2 : 3;
  const rubricScores: Record<string, number> = {};
  criteria.forEach((c, i) => {
    let s = base + (i % 2 === 0 ? 0.5 : -0.5);
    if (!hasNumbers && (c === "impact" || c === "edge_cases" || c === "tradeoffs")) s -= 1;
    rubricScores[c] = Math.max(0, Math.min(5, Math.round(s * 2) / 2));
  });
  if (question.type === "coding") rubricScores.correctness = testsFail ? 2 : 4.5;

  const weaknessTags: string[] = [];
  if (!hasNumbers) weaknessTags.push(question.type === "behavioral" ? "vague-impact" : "no-edge-cases");
  if (looksVague(answer)) weaknessTags.push("rambling");
  if (question.type === "behavioral" && !/\bI\b/.test(trimmed)) weaknessTags.push("no-ownership");
  if (question.type === "system_design" && !/(tradeoff|bottleneck|scale)/i.test(trimmed))
    weaknessTags.push("no-tradeoffs");
  if (testsFail) weaknessTags.push("failing-tests");

  const survives = Object.values(rubricScores).every((v) => v >= 3);
  const reasoning = survives
    ? `Concrete and specific — ${
        hasNumbers ? "quantified outcome and" : ""
      } a clear mechanism a real interviewer could follow without re-asking.`
    : testsFail
    ? "The final code still fails tests, and a real interviewer would hold the round on that."
    : `A real interviewer would keep digging: ${
        weaknessTags.includes("no-edge-cases")
          ? "no edge cases or numbers to verify the claim"
          : "the impact and personal ownership stay abstract"
      }.`;

  return {
    questionId: question.id,
    transcript: answer,
    rubricScores,
    weaknessTags: [...new Set(weaknessTags)],
    followUpCount,
    wouldSurviveRealInterview: survives,
    survivalReasoning: reasoning,
  };
}

export const mockEngine = {
  buildSession(
    role: string,
    mode: InterviewMode = "full",
    level: InterviewLevel = "mid"
  ): { profile: IntakeProfile; plan: QuestionPlan } {
    const key = QUESTION_BANK[role] ? role : "sde";
    const intake = INTAKE_BY_ROLE[key];
    const profile: IntakeProfile = { ...intake, targetRole: ROLE_LABEL[key] };
    const pool = mode === "full" ? QUESTION_BANK[key] : QUESTION_BANK[key].filter((q) => q.type === mode);
    const source = pool.length > 0 ? pool : QUESTION_BANK[key];
    const bank = source.map((q, i) => ({ ...q, weightedFromWeakness: i === 1 }));
    const first = (type: PlannedQuestion["type"]) => bank.filter((q) => q.type === type).slice(0, 1);
    // Spec 1.5: a full mock is one of each, in the Planner's order.
    const ordered =
      mode === "coding" ? codingQuestions(CODING_ROUND[level], level)
      : mode === "full"
      ? [...first("behavioral"), ...codingQuestions([FULL_MOCK_CODING[level]], level), ...first("technical"), ...first("system_design")]
      : bank;
    const plan: QuestionPlan = {
      sessionId: `sess-${Date.now()}`,
      questions: ordered.map((q, i) => ({ ...q, id: `q${i}` })),
    };
    return { profile, plan };
  },

  nameUsable(name: string): boolean {
    return name.trim() !== "" && !ABUSE.test(name);
  },

  // The /session/turn stand-in: conduct screen first (abuse never reaches decide),
  // fixed replies per strike like the backend's _conduct_decision.
  turn(input: TurnInput): { decision: InterviewDecision; strikes: number } {
    if (!ABUSE.test(latestReply(input.answer))) return { decision: mockEngine.decide(input), strikes: input.strikes };
    const strikes = input.strikes + 1;
    const currentQuestionId = input.question.id;
    if (strikes >= 3) {
      return { strikes, decision: { action: "end", followUpPrompt: null, currentQuestionId, say: "I'm going to end the interview here. Take care." } };
    }
    const warning = strikes === 1
      ? "Let's keep this professional. "
      : "I'll be straightforward: if that happens again, I'll have to end the interview. ";
    const restate = PHASE_ASK[input.phase] ? `So — ${PHASE_ASK[input.phase]}` : `So, back to the question: ${input.question.prompt}`;
    const say = warning + restate;
    return { strikes, decision: { action: "clarify", followUpPrompt: null, currentQuestionId, say } };
  },

  // Offline stand-in for the Interviewer Agent: same rules as the real prompt
  // (react honestly, probe vague answers, hint on "I don't know", answer
  // clarifying questions), with scripted wording instead of an LLM.
  decide(input: TurnInput): InterviewDecision {
    const { question, followUpCount, isLast, phase, nextQuestion, candidateName } = input;
    const reply = latestReply(input.answer);
    const out = (action: InterviewDecision["action"], say: string, followUpPrompt: string | null = null) =>
      ({ action, say, followUpPrompt, currentQuestionId: question.id });

    if (phase === "warmup") {
      const reaction = ASKED_BACK.test(reply)
        ? "I'm doing well, thanks for asking."
        : /\b(nervous|anxious|stressed)\b/i.test(reply)
        ? "That's completely normal — we'll take it one step at a time, and it's fine to think out loud."
        : /\b(tired|bad|not great|rough|exhausted)\b/i.test(reply)
        ? "Sorry to hear that. We'll keep this focused."
        : /\b(good|great|well|fine|fantastic)\b/i.test(reply)
        ? "Glad to hear it."
        : "Thanks.";
      return out("advance",
        `${reaction} So here's the plan: I'll ask you a few questions, pitched at the ${input.level} level, and I'll dig in where I'm curious. Feel free to ask me to clarify anything. To start, walk me through your background in a couple of minutes — what have you been working on most recently?`);
    }

    if (phase === "background") {
      const hook = reply.match(/\b([A-Z][a-zA-Z0-9+#.]{2,})\b/g)?.find((w) => !/^(I|I'm|The|And|But|So|My|We|At|In|Then|After|Before|Currently|Right|Most|Recently)$/.test(w));
      const reaction = hook
        ? `Thanks — the ${hook} part is something I might come back to.`
        : "Thanks, that's useful context.";
      return out("advance", `${reaction} Let's get into it. ${opening(nextQuestion ?? question)}`);
    }

    if (phase === "closing") {
      const done = !reply.includes("?") && /\b(no|nope|nothing|that'?s (all|it)|i'?m good|all good|bye|thank)/i.test(reply);
      if (done) {
        const who = firstName(candidateName);
        return out("complete", `Thanks${who ? `, ${who}` : ""} — I enjoyed this. I'll write up my feedback now; you'll see it on the next screen. Take care.`);
      }
      return out("clarify", /on-?call|day to day|typical|week|work like/i.test(reply)
        ? "Day to day it's a mix of building and owning what you build in production, on-call included — a week every couple of months, with a real runbook behind it. It's a lot of responsibility early, which most people end up liking. Anything else?"
        : "Honestly, what separates people on this team is how clearly they reason about tradeoffs out loud — more than knowing every tool. Anything else you'd like to ask?");
    }

    const budget = FOLLOW_UP_BUDGET[question.type];
    const resolve = (reaction: string) =>
      isLast || !nextQuestion
        ? out("complete", `${reaction} That's everything I wanted to cover. What questions do you have for me?`)
        : out("advance", `${reaction} ${bridgeTo(question, nextQuestion)} ${opening(nextQuestion)}`);

    // Coding round, per stage: probe the plan, stay quiet while they code, then review.
    if (question.type === "coding") {
      const asked = (line: string) => input.answer.includes(line);
      if (input.event === "checkin") return out("clarify", CHECKIN);
      // "submit": the candidate just pressed Submit; review starts from the results.
      const stage = input.event === "submit" ? "review" : input.codingStage || "approach";
      if (stage === "approach") {
        if (DONT_KNOW.test(reply) && !asked(BRUTE_FORCE)) return out("follow_up", BRUTE_FORCE, BRUTE_FORCE);
        if (!asked(PLAN_COMPLEXITY)) return out("follow_up", `Okay. ${PLAN_COMPLEXITY}`, PLAN_COMPLEXITY);
        return out("clarify", "Sounds good — go ahead and code it.");
      }
      if (stage === "coding") {
        return out("clarify", /\b(done|finished|ready|submit)\b/i.test(reply)
          ? "When you're happy with it, hit Submit and we'll go through the results together."
          : "Okay — keep going. Think out loud whenever it helps.");
      }
      const failing = failureAsk(input.testResults ?? "");
      if (followUpCount >= budget) return resolve("Okay, let's leave it there — worth revisiting afterwards.");
      if (failing) {
        return asked(failing)
          ? out("clarify", "Take another look, fix it, and submit again when you're ready.")
          : out("follow_up", failing, failing);
      }
      if (!asked(COMPLEXITY)) return out("follow_up", `Okay, it passes. ${COMPLEXITY}`, COMPLEXITY);
      if (!asked(EDGE_CASES)) return out("follow_up", EDGE_CASES, EDGE_CASES);
      return resolve("Okay, that's a working solution.");
    }

    if (CLARIFY.test(reply) || (reply.endsWith("?") && reply.length < 160 && !DONT_KNOW.test(reply))) {
      return /\b(repeat|again|rephrase)\b/i.test(reply)
        ? out("clarify", `Sure. ${question.prompt}`)
        : out("clarify", "Fair question — make whatever reasonable assumption you think is right and say it out loud. I'll tell you if it's off. Go ahead whenever you're ready.");
    }

    if (DONT_KNOW.test(reply) && reply.length < 220) {
      if (followUpCount < HINTS[question.type].length) {
        const hint = HINTS[question.type][followUpCount];
        const opener = followUpCount === 0 ? "That's okay, let's work through it together." : "No problem — let me make it smaller.";
        return out("follow_up", `${opener} ${hint}`, hint);
      }
      return resolve("Okay, let's leave that one — it's worth reviewing afterwards.");
    }

    if (followUpCount < Math.min(budget, PROBES[question.type].length) && looksVague(reply)) {
      const probe = PROBES[question.type][followUpCount];
      const reaction = reply.length < 80
        ? "Okay, that's pretty brief."
        : pick(["Okay.", "Alright, I'm following.", "Right."]);
      return out("follow_up", `${reaction} ${probe}`, probe);
    }

    const strong = /\d/.test(reply) && reply.length > 260;
    return resolve(strong
      ? pick([
          "That's concrete — you gave real numbers and were clear about your own part.",
          "Okay, the numbers make that easy to believe.",
          "Right, I can follow exactly what you did there.",
        ])
      : followUpCount >= Math.min(budget, PROBES[question.type].length)
      ? "Okay. I still don't have the specifics I was looking for there, but let's keep going."
      : "Okay, I've got a reasonable picture of that.");
  },

  evaluate(question: PlannedQuestion, transcript: string, followUpCount: number, testResults?: string): AnswerEvaluation {
    return scoreAnswer(question, transcript, followUpCount, testResults);
  },

  aggregate(
    evaluations: AnswerEvaluation[],
    sessionDate: string,
    prior: MemoryProfile | null
  ): MemoryProfile {
    // Nothing scored (a session ended early): memory stays as it was, like the backend.
    if (evaluations.length === 0) {
      return prior ?? { candidateId: "local-dev", recurringWeaknesses: [], improvementTrend: [], strongAreas: [] };
    }
    const weaknessMap = new Map<string, RecurringWeakness>();
    prior?.recurringWeaknesses.forEach((w) => weaknessMap.set(w.tag, { ...w }));
    evaluations.forEach((e) =>
      e.weaknessTags.forEach((tag) => {
        const existing = weaknessMap.get(tag);
        if (existing) {
          existing.frequency += 1;
          existing.lastSeen = sessionDate;
        } else {
          weaknessMap.set(tag, { tag, frequency: 1, lastSeen: sessionDate });
        }
      })
    );

    const allScores = evaluations.flatMap((e) => Object.values(e.rubricScores));
    const avg = allScores.length
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
      : 0;

    const strong = new Set(prior?.strongAreas ?? []);
    evaluations.forEach((e) =>
      Object.entries(e.rubricScores).forEach(([k, v]) => {
        if (v >= 4) strong.add(k);
      })
    );

    return {
      candidateId: prior?.candidateId ?? "local-dev",
      recurringWeaknesses: [...weaknessMap.values()].sort((a, b) => b.frequency - a.frequency),
      improvementTrend: [...(prior?.improvementTrend ?? []), { sessionDate, avgScore: avg }],
      strongAreas: [...strong],
    };
  },

  coach(question: PlannedQuestion, weaknessTags: string[]): CoachResponse {
    const frame =
      question.type === "behavioral"
        ? "Open with the Situation and your specific Task, walk through the Actions you personally took, and close with a quantified Result."
        : question.type === "system_design"
        ? "Clarify the requirements and scale first, sketch the high-level components, then go deep on one — naming the tradeoffs and failure modes explicitly."
        : "State the core approach and why it's correct, explain the key decision, then name the edge cases and how you'd handle them.";

    const improvements = [
      `Restructures the answer so it directly targets: ${
        weaknessTags.length ? weaknessTags.join(", ") : "clarity and specificity"
      }.`,
      "Replaces vague phrasing with a concrete, quantified outcome.",
      "Foregrounds your own decisions and reasoning so ownership is unmistakable.",
    ];

    return {
      modelAnswer:
        `A 5/5 version of your answer would keep your real example but tell it tighter. ${frame} ` +
        `Ground every claim in a specific number or decision you made, and end on the measurable impact — ` +
        `that's the difference between "it got better" and an answer an interviewer trusts. ` +
        `(This is a local preview; connect the backend to generate a fully personalized model answer.)`,
      improvements,
    };
  },
};
