import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PublicProblem } from "@/lib/coding/types";
import { ProblemPanel } from "./ProblemPanel";

const problem = {
  id: "code-longest-substring",
  title: "Longest Substring Without Repeating Characters",
  difficulty: "medium",
  topics: ["sliding window", "hash map"],
  statement: "Given a string `s`, return the length of the longest part with no repeats.\n\n- Use `<b>bold</b>` as text.",
  signature: "def f(s):",
  starterCode: "def f(s):\n    pass\n",
  functionName: "f",
  kind: "function",
  compare: "exact",
  visibleTestCount: 1,
  examples: [{ input: 's = "abca"', output: "3", explanation: "" }],
  tests: [{ args: ["abca"], expected: 3 }],
} as PublicProblem;

describe("ProblemPanel", () => {
  it("shows the difficulty but never the topics (they name the technique)", () => {
    render(<ProblemPanel status="ready" problem={problem} onRetry={vi.fn()} />);
    expect(screen.getByRole("heading", { level: 1, name: problem.title })).toBeInTheDocument();
    expect(screen.getByText("medium")).toBeInTheDocument();
    expect(screen.queryByText(/sliding window/i)).toBeNull();
    expect(screen.queryByText(/hash map/i)).toBeNull();
  });

  it("renders the statement as text, never as HTML", () => {
    const { container } = render(<ProblemPanel status="ready" problem={problem} onRetry={vi.fn()} />);
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("<b>bold</b>")).toBeInTheDocument();
  });
});
