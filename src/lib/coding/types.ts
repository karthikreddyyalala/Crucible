export interface TestResult {
  index: number;
  passed: boolean;
  got: unknown;
  expected: unknown;
  error: string | null;
  stdout: string;
  ms: number;
}

export interface PublicProblem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  functionName: string;
  visibleTestCount: number;
  tests: { args: unknown; expected: unknown }[];
  compare: string;
  [key: string]: unknown;
}

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
