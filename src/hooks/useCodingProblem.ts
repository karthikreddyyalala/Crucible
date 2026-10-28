import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { PublicProblem } from "@/lib/coding/types";

/** The fields of backend CodingProblem.public() the workspace renders. */
export interface CodingProblem extends PublicProblem {
  topics: string[];
  statement: string;
  signature: string;
  starterCode: string;
  kind: "function" | "design" | "roundtrip";
  examples: { input: string; output: string; explanation: string }[];
}

type Status = "loading" | "ready" | "error";

// Successful loads only; a failure is dropped so retry asks again.
const cache = new Map<string, Promise<CodingProblem>>();

function fetchProblem(id: string): Promise<CodingProblem> {
  let pending = cache.get(id);
  if (!pending) {
    pending = api.getProblem(id) as Promise<CodingProblem>;
    cache.set(id, pending);
    pending.catch(() => cache.delete(id));
  }
  return pending;
}

export function useCodingProblem(problemId: string | null | undefined) {
  const [state, setState] = useState<{ status: Status; problem: CodingProblem | null }>({
    status: problemId ? "loading" : "error",
    problem: null,
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!problemId) {
      setState({ status: "error", problem: null });
      return;
    }
    let live = true;
    setState({ status: "loading", problem: null });
    fetchProblem(problemId).then(
      (problem) => live && setState({ status: "ready", problem }),
      () => live && setState({ status: "error", problem: null }),
    );
    return () => {
      live = false;
    };
  }, [problemId, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}
