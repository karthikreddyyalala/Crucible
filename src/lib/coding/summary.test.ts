import { describe, it, expect } from "vitest";
import { summarizeOutcome, summarizeResults } from "./summary";
import type { TestResult } from "./types";

const row = (index: number, passed: boolean, over: Partial<TestResult> = {}): TestResult => ({
  index, passed, got: passed ? [0, 1] : [1, 0], expected: [0, 1], error: null, stdout: "", ms: 1, ...over,
});

describe("summarizeResults", () => {
  it("counts examples and names the first failing one with expected vs got", () => {
    const s = summarizeResults([row(0, true), row(1, true), row(2, false)], 3);
    expect(s.summary).toBe("Examples: 2/3 passed (example 3 failed: expected [0, 1], got [1, 0]).");
    expect(s).toMatchObject({ visiblePassed: 2, visibleTotal: 3, hiddenPassed: 0, hiddenTotal: 0 });
  });

  it("adds the hidden-test count on a submit", () => {
    const results = [row(0, true), row(1, true), ...Array.from({ length: 10 }, (_, i) => row(i + 2, i < 8))];
    const s = summarizeResults(results, 2);
    expect(s.summary).toBe("Examples: 2/2 passed. Hidden tests: 8/10 passed.");
    expect(s).toMatchObject({ visiblePassed: 2, visibleTotal: 2, hiddenPassed: 8, hiddenTotal: 10 });
  });

  it("reports a runtime error on an example instead of expected vs got", () => {
    const s = summarizeResults([row(0, false, { error: "IndexError: list index out of range (line 4)", got: null })], 1);
    expect(s.summary).toBe("Examples: 0/1 passed (example 1 failed: IndexError: list index out of range (line 4)).");
  });

  it("reports code that can't load as a load error", () => {
    const s = summarizeResults([row(-1, false, { error: "SyntaxError: invalid syntax (line 4)" })], 3);
    expect(s.summary).toBe("Load error: SyntaxError: invalid syntax (line 4)");
    expect(s).toMatchObject({ visiblePassed: 0, visibleTotal: 0 });
  });

  it("shows a missing return value as Python's None", () => {
    expect(summarizeResults([row(0, false, { got: null })], 1).summary).toContain("got None");
  });

  it("shows strings as JSON and caps very long values", () => {
    const s = summarizeResults([row(0, false, { expected: "abc", got: "x".repeat(500) })], 1);
    expect(s.summary).toContain('expected "abc", got "xxx');
    expect(s.summary.length).toBeLessThan(260);
  });
});

describe("summarizeResults — size limits", () => {
  const huge = "E".repeat(10_000);

  it("cuts a huge example error to 300 characters", () => {
    const s = summarizeResults([row(0, false, { error: `ValueError: ${huge}` })], 1);
    expect(s.summary.length).toBeLessThan(400);
    expect(s.summary).toContain("…");
  });

  it("cuts a huge load error and keeps the whole summary under 1,000 characters", () => {
    expect(summarizeResults([row(-1, false, { error: huge })], 1).summary.length).toBeLessThanOrEqual(1000);
    expect(summarizeOutcome({ kind: "error", message: huge }, 1).summary.length).toBeLessThanOrEqual(1000);
  });
});

describe("summarizeOutcome", () => {
  it("describes a timeout", () => {
    expect(summarizeOutcome({ kind: "timeout" }, 3).summary).toBe("Timed out after 5 seconds (possible infinite loop)");
  });

  it("describes a runner failure", () => {
    expect(summarizeOutcome({ kind: "error", message: "The Python worker crashed" }, 3).summary)
      .toBe("Runner error: The Python worker crashed");
  });

  it("summarizes results", () => {
    expect(summarizeOutcome({ kind: "results", results: [row(0, true)] }, 1).summary).toBe("Examples: 1/1 passed.");
  });
});
