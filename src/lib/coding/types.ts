export interface TestResult {
  index: number;
  passed: boolean;
  got: unknown;
  expected: unknown;
  error: string | null;
  stdout: string;
  ms: number;
}

// What GET /api/coding/problems/{id} returns (backend CodingProblem.public()).
export interface PublicProblem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  statement: string;
  kind: "function" | "design" | "roundtrip";
  functionName: string;
  signature: string;
  starterCode: string;
  starterCodeJs: string;
  examples: { input: string; output: string; explanation: string }[];
  visibleTestCount: number;
  tests: { args: unknown; expected: unknown }[];
  compare: string;
  checkArg: number | null;
  [key: string]: unknown;
}

export type CodingLanguage = "python" | "javascript";

export type RunnerRequest =
  | { type: "load" }
  | { type: "run"; id: number; code: string; problem: PublicProblem; onlyVisible: boolean };

export type RunnerResponse =
  | { type: "loading"; progress: string }
  | { type: "ready" }
  | { type: "result"; id: number; results: TestResult[] }
  | { type: "fatal"; message: string };

export type RunOutcome =
  | { kind: "results"; results: TestResult[] }
  | { kind: "timeout" }
  | { kind: "error"; message: string };
