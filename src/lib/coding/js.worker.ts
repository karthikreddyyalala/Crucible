import { run } from "./jsHarness";
import type { RunnerRequest, RunnerResponse, TestResult } from "./types";

const post = (message: RunnerResponse) => self.postMessage(message);

// Nothing to download: JavaScript is ready as soon as it's asked.
self.onmessage = (event: MessageEvent<RunnerRequest>) => {
  const request = event.data;
  if (request.type === "load") return post({ type: "ready" });
  let results: TestResult[];
  try {
    results = run(request.code, request.problem, request.onlyVisible);
  } catch (e) {
    // the harness never throws, so this is a bug here; still hand the user a result row
    results = [{ index: -1, passed: false, got: null, expected: null, error: e instanceof Error ? e.message : String(e), stdout: "", ms: 0 }];
  }
  post({ type: "result", id: request.id, results });
};
