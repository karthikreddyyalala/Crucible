import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { PublicProblem, RunnerRequest, RunnerResponse, TestResult } from "@/lib/coding/types";
import { usePythonRunner } from "./usePythonRunner";

class FakeWorker {
  sent: RunnerRequest[] = [];
  terminated = false;
  onmessage: ((e: MessageEvent<RunnerResponse>) => void) | null = null;
  postMessage(msg: RunnerRequest) {
    this.sent.push(msg);
  }
  terminate() {
    this.terminated = true;
  }
  emit(msg: RunnerResponse) {
    this.onmessage?.({ data: msg } as MessageEvent<RunnerResponse>);
  }
}

const problem: PublicProblem = {
  id: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  topics: ["array"],
  statement: "Find two numbers that add up to the target.",
  kind: "function",
  functionName: "two_sum",
  signature: "def two_sum(nums, target):",
  starterCode: "def two_sum(nums, target):\n    pass\n",
  starterCodeJs: "function twoSum(nums, target) {}\n",
  examples: [],
  checkArg: null,
  visibleTestCount: 1,
  tests: [{ args: [[2, 7], 9], expected: [0, 1] }],
  compare: "exact",
};

const row: TestResult = { index: 0, passed: true, got: [0, 1], expected: [0, 1], error: null, stdout: "", ms: 1 };

let workers: FakeWorker[];
const createWorker = () => {
  const w = new FakeWorker();
  workers.push(w);
  return w as unknown as Worker;
};
const last = () => workers[workers.length - 1];

function setup(timeoutMs = 5000) {
  return renderHook(() => usePythonRunner({ timeoutMs, createWorker }));
}

beforeEach(() => {
  workers = [];
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("usePythonRunner", () => {
  it("goes idle -> loading -> ready and reports progress", () => {
    const { result } = setup();
    expect(result.current.status).toBe("idle");
    expect(workers).toHaveLength(0);

    act(() => result.current.load());
    expect(result.current.status).toBe("loading");
    expect(last().sent).toEqual([{ type: "load" }]);

    act(() => last().emit({ type: "loading", progress: "Loading packages" }));
    expect(result.current.progress).toBe("Loading packages");

    act(() => last().emit({ type: "ready" }));
    expect(result.current.status).toBe("ready");
  });

  it("resolves a run with the results that match its id", async () => {
    const { result } = setup();
    act(() => result.current.load());
    act(() => last().emit({ type: "ready" }));

    let outcome: Promise<unknown> = Promise.resolve();
    act(() => {
      outcome = result.current.run("def two_sum(): ...", problem, true);
    });
    expect(result.current.status).toBe("running");
    const req = last().sent[1];
    if (req.type !== "run") throw new Error("expected a run request");
    expect(req).toMatchObject({ code: "def two_sum(): ...", problem, onlyVisible: true });

    // a stale result for another id is ignored
    act(() => last().emit({ type: "result", id: req.id + 99, results: [] }));
    expect(result.current.status).toBe("running");

    act(() => last().emit({ type: "result", id: req.id, results: [row] }));
    await expect(outcome).resolves.toEqual({ kind: "results", results: [row] });
    expect(result.current.status).toBe("ready");
  });

  it("run while idle loads first, then runs once ready", async () => {
    const { result } = setup();
    let outcome: Promise<unknown> = Promise.resolve();
    act(() => {
      outcome = result.current.run("code", problem, false);
    });
    expect(result.current.status).toBe("loading");
    expect(last().sent).toEqual([{ type: "load" }]);

    act(() => last().emit({ type: "ready" }));
    expect(last().sent).toHaveLength(2);
    const req = last().sent[1];
    if (req.type !== "run") throw new Error("expected a run request");
    expect(result.current.status).toBe("running");

    act(() => last().emit({ type: "result", id: req.id, results: [row] }));
    await expect(outcome).resolves.toEqual({ kind: "results", results: [row] });
  });

  it("times out: terminates, starts a fresh worker, resolves timeout, ends ready", async () => {
    const { result } = setup(5000);
    act(() => result.current.load());
    act(() => last().emit({ type: "ready" }));
    const first = last();

    let outcome: Promise<unknown> = Promise.resolve();
    act(() => {
      outcome = result.current.run("while True: pass", problem, false);
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    await expect(outcome).resolves.toEqual({ kind: "timeout" });
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(last().sent).toEqual([{ type: "load" }]);
    expect(result.current.status).toBe("loading");

    act(() => last().emit({ type: "ready" }));
    expect(result.current.status).toBe("ready");
  });

  it("does not time out a run that finished in time", async () => {
    const { result } = setup(5000);
    act(() => result.current.load());
    act(() => last().emit({ type: "ready" }));
    let outcome: Promise<unknown> = Promise.resolve();
    act(() => {
      outcome = result.current.run("code", problem, false);
    });
    const req = last().sent[1];
    if (req.type !== "run") throw new Error("expected a run request");
    act(() => last().emit({ type: "result", id: req.id, results: [row] }));
    await outcome;
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(workers).toHaveLength(1);
    expect(result.current.status).toBe("ready");
  });

  it("fatal -> error with the message, then retry recreates the worker and recovers", () => {
    const { result } = setup();
    act(() => result.current.load());
    const first = last();
    act(() => first.emit({ type: "fatal", message: "Failed to fetch" }));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Failed to fetch");

    act(() => result.current.retry());
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(result.current.status).toBe("loading");
    expect(result.current.error).toBeNull();

    act(() => last().emit({ type: "ready" }));
    expect(result.current.status).toBe("ready");
  });

  it("resolves a pending run as an error when loading fails", async () => {
    const { result } = setup();
    let outcome: Promise<unknown> = Promise.resolve();
    act(() => {
      outcome = result.current.run("code", problem, false);
    });
    act(() => last().emit({ type: "fatal", message: "offline" }));
    await expect(outcome).resolves.toEqual({ kind: "error", message: "offline" });
  });

  it("rejects a second run while one is in progress", async () => {
    const { result } = setup();
    act(() => result.current.load());
    act(() => last().emit({ type: "ready" }));
    act(() => {
      void result.current.run("code", problem, false);
    });
    await expect(result.current.run("code", problem, false)).rejects.toThrow("A run is already in progress");
  });

  it("javascript: a fresh worker after every run, so one run's globals can't leak into the next", async () => {
    const { result } = renderHook(() => usePythonRunner({ createWorker, language: "javascript" }));
    act(() => result.current.load());
    act(() => last().emit({ type: "ready" }));
    const first = last();
    let outcome: Promise<unknown> = Promise.resolve();
    act(() => {
      outcome = result.current.run("code", problem, true);
    });
    const req = first.sent[1];
    if (req.type !== "run") throw new Error("expected a run request");
    act(() => first.emit({ type: "result", id: req.id, results: [row] }));
    await expect(outcome).resolves.toEqual({ kind: "results", results: [row] });
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(result.current.status).toBe("ready");

    // the next run goes straight to the new worker, and the old one's late crash is ignored
    act(() => {
      void result.current.run("code", problem, true);
    });
    expect(last().sent.at(-1)).toMatchObject({ type: "run", code: "code" });
    act(() => (first as unknown as Worker).onerror?.({ message: "Uncaught Error: late" } as ErrorEvent));
    expect(result.current.status).toBe("running");
  });

  it("names the language in its messages", () => {
    const { result } = renderHook(() => usePythonRunner({ createWorker, language: "javascript" }));
    act(() => result.current.load());
    act(() => (last() as unknown as Worker).onerror?.({ message: "" } as ErrorEvent));
    expect(result.current.error).toBe("The JavaScript worker crashed");
  });

  it("terminates the worker on unmount", () => {
    const { result, unmount } = setup();
    act(() => result.current.load());
    const w = last();
    unmount();
    expect(w.terminated).toBe(true);
  });
});
