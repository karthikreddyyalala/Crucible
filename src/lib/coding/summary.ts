import type { RunOutcome, TestResult } from "./types";

// The compact run report the store keeps per question and sends to Marcus and the
// Evaluator as testResults (the backend fences it as untrusted text, max 4,000 chars).
export interface RunSummary {
  visiblePassed: number;
  visibleTotal: number;
  hiddenPassed: number;
  hiddenTotal: number;
  summary: string;
}

const MAX_VALUE = 80;
const MAX_ERROR = 300;
const MAX_SUMMARY = 1000; // well under the server's 4,000, so a turn is never rejected for it

const cut = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

// Python-ish display: "[0, 1]" and "None" rather than JSON's "[0,1]" and "null"; long values cut short.
function show(value: unknown): string {
  const text =
    value === null || value === undefined ? "None"
    : Array.isArray(value) ? `[${value.map(show).join(", ")}]`
    : JSON.stringify(value);
  return cut(text, MAX_VALUE);
}

const empty = (summary: string): RunSummary =>
  ({ visiblePassed: 0, visibleTotal: 0, hiddenPassed: 0, hiddenTotal: 0, summary: summary.slice(0, MAX_SUMMARY) });

/** Rows with index < visibleCount are the examples; index -1 means the code didn't load. */
export function summarizeResults(results: TestResult[], visibleCount: number): RunSummary {
  const loadError = results.find((r) => r.index < 0);
  if (loadError) return empty(`Load error: ${cut(loadError.error ?? "the code didn't load", MAX_ERROR)}`);

  const visible = results.filter((r) => r.index < visibleCount);
  const hidden = results.filter((r) => r.index >= visibleCount);
  const visiblePassed = visible.filter((r) => r.passed).length;
  const hiddenPassed = hidden.filter((r) => r.passed).length;

  const failed = visible.find((r) => !r.passed);
  const why = failed
    ? ` (example ${failed.index + 1} failed: ${
        failed.error ? cut(failed.error, MAX_ERROR) : `expected ${show(failed.expected)}, got ${show(failed.got)}`
      })`
    : "";
  let summary = `Examples: ${visiblePassed}/${visible.length} passed${why}.`;
  if (hidden.length > 0) summary += ` Hidden tests: ${hiddenPassed}/${hidden.length} passed.`;

  return { visiblePassed, visibleTotal: visible.length, hiddenPassed, hiddenTotal: hidden.length, summary: summary.slice(0, MAX_SUMMARY) };
}

export function summarizeOutcome(outcome: RunOutcome, visibleCount: number): RunSummary {
  if (outcome.kind === "timeout") return empty("Timed out after 5 seconds (possible infinite loop)");
  if (outcome.kind === "error") return empty(`Runner error: ${cut(outcome.message, MAX_ERROR)}`);
  return summarizeResults(outcome.results, visibleCount);
}
