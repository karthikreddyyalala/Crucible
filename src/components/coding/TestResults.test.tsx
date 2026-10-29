import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { TestResult } from "@/lib/coding/types";
import type { PublicProblem } from "@/lib/coding/types";
import { TestResults, type ShownRun } from "./TestResults";

const problem = {
  id: "code-two-sum",
  title: "Two Sum",
  difficulty: "easy",
  topics: ["array"],
  statement: "",
  signature: "",
  starterCode: "",
  functionName: "two_sum",
  kind: "function",
  compare: "exact",
  visibleTestCount: 2,
  examples: [
    { input: "nums = [3, 8], target = 11", output: "[0, 1]", explanation: "" },
    { input: "nums = [4, 4, 9], target = 8", output: "[0, 1]", explanation: "" },
  ],
  tests: [
    { args: [[3, 8], 11], expected: [0, 1] },
    { args: [[4, 4, 9], 8], expected: [0, 1] },
    { args: [[1, 2], 3], expected: [0, 1] },
    { args: [[5, 5], 10], expected: [0, 1] },
  ],
} as PublicProblem;

const row = (index: number, passed: boolean, extra: Partial<TestResult> = {}): TestResult => ({
  index, passed, got: passed ? [0, 1] : [1, 2], expected: [0, 1], error: null, stdout: "", ms: 0, ...extra,
});

function show(props: Partial<Parameters<typeof TestResults>[0]> = {}) {
  const onRetry = vi.fn();
  render(
    <TestResults status="ready" progress="" loadedBefore run={null} problem={problem} onRetry={onRetry} shortcut="⌘⏎" {...props} />,
  );
  return { onRetry };
}

// The copy also goes to the sr-only live region; this finds the visible one.
const shown = (text: string) => screen.getAllByText(text).find((el) => !el.hasAttribute("aria-live"));

const results = (rows: TestResult[], kind: ShownRun["kind"] = "run"): ShownRun =>
  ({ outcome: { kind: "results", results: rows }, kind, seq: 1 });

describe("TestResults", () => {
  it("explains Run and Submit before the first run", () => {
    show();
    expect(screen.getByText(/Run your code against the examples with Run/)).toBeInTheDocument();
    expect(screen.getByText(/Submit runs the hidden tests too/)).toBeInTheDocument();
  });

  it("mentions the one-time download while Python isn't loaded", () => {
    show({ status: "idle", loadedBefore: false });
    expect(screen.getByText(/about 10 MB/)).toBeInTheDocument();
  });

  it("shows the first-time loading line, then the short one", () => {
    show({ status: "loading", loadedBefore: false, progress: "Downloading Python" });
    expect(shown("Loading Python (first time only, ~10 MB)…")).toBeInTheDocument();
    expect(screen.getByText("Downloading Python")).toBeInTheDocument();
  });

  it("shows the short loading line after Python has loaded once", () => {
    show({ status: "loading", loadedBefore: true });
    expect(shown("Loading Python…")).toBeInTheDocument();
  });

  it("offers a retry when Python fails to load", () => {
    const { onRetry } = show({ status: "error" });
    expect(shown("Couldn't load Python. Check your connection and retry.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading Python" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("explains a timeout and keeps showing it while Python restarts", () => {
    show({ status: "loading", run: { outcome: { kind: "timeout" }, kind: "run", seq: 1 } });
    expect(
      shown("Stopped after 5 seconds. This usually means an infinite loop. Your code is safe; try again."),
    ).toBeInTheDocument();
  });

  it("never says Python when JavaScript is selected", () => {
    const { container } = render(
      <TestResults status="error" progress="" loadedBefore run={null} problem={problem} onRetry={vi.fn()} shortcut="⌘⏎" language="javascript" />,
    );
    expect(container.textContent).not.toMatch(/Python|connection/);
    expect(screen.getByRole("button", { name: /Restart JavaScript/ })).toBeInTheDocument();
  });

  it("shows JavaScript values in a JavaScript run", () => {
    show({ language: "javascript", run: results([row(0, false, { got: null })]) });
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("names the line of a syntax error", () => {
    show({ run: results([row(-1, false, { got: null, expected: null, error: "SyntaxError: invalid syntax (line 4)" })]) });
    expect(shown("SyntaxError on line 4: invalid syntax")).toBeInTheDocument();
  });

  it("lists each example and announces the count politely", () => {
    show({ run: results([row(0, true), row(1, false)]) });
    expect(screen.getByText("Example 1")).toBeInTheDocument();
    expect(screen.getByText("Example 2")).toBeInTheDocument();
    const live = screen.getByText("1 of 2 examples passed.");
    expect(live).toHaveAttribute("aria-live", "polite");
  });

  it("opens the first failing example and toggles it", () => {
    show({ run: results([row(0, true), row(1, false, { stdout: "debug\n" })]) });
    const toggle = screen.getByRole("button", { name: /Example 2/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("nums = [4, 4, 9], target = 8")).toBeInTheDocument();
    expect(screen.getByText("[1, 2]")).toBeInTheDocument();
    expect(screen.getByText("debug")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("nums = [4, 4, 9], target = 8")).toBeNull();
  });

  it("describes a runtime error in the failing row", () => {
    show({ run: results([row(0, false, { got: null, error: "IndexError: list index out of range (line 7)" }), row(1, true)]) });
    expect(screen.getByText("Line 7 raised IndexError: list index out of range")).toBeInTheDocument();
  });

  it("sums up hidden tests in one row without their inputs", () => {
    show({ run: results([row(0, true), row(1, true), row(2, true), row(3, false)], "submit") });
    expect(screen.getByText(/^Hidden tests:/)).toHaveTextContent(/of 2 passed$/);
    expect(screen.queryByText("Example 3")).toBeNull();
    expect(screen.queryByText(/nums = \[1, 2\]/)).toBeNull();
    expect(screen.getByText("2 of 2 examples passed. Hidden tests: 1 of 2 passed.")).toBeInTheDocument();
  });
});
