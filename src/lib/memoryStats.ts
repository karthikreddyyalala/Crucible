import type { CodingAttempt, MemoryProfile, RecurringWeakness, SessionSummary } from "@/types/contracts";
import { humanizeTag } from "@/lib/humanize";

export type TrendDirection = "up" | "down" | "flat";

export interface MemorySummary {
  hasData: boolean;
  sessionsCompleted: number;
  latestAvg: number | null;
  /** latest score minus the previous session's; null when < 2 sessions. */
  delta: number | null;
  trend: TrendDirection | null;
  /** weaknesses ranked by frequency (highest first), capped at 5. */
  topWeaknesses: RecurringWeakness[];
  strongAreas: string[];
}

const MAX_WEAKNESSES = 5;

// Pure aggregation of a MemoryProfile into the numbers the dashboard renders.
// Kept side-effect free so it's trivially testable and reusable.
export function summarizeMemory(profile: MemoryProfile): MemorySummary {
  const trend = profile.improvementTrend;
  const sessionsCompleted = trend.length;
  const latestAvg = sessionsCompleted > 0 ? trend[sessionsCompleted - 1].avgScore : null;

  let delta: number | null = null;
  let direction: TrendDirection | null = null;
  if (sessionsCompleted >= 2) {
    delta = trend[sessionsCompleted - 1].avgScore - trend[sessionsCompleted - 2].avgScore;
    direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  }

  const topWeaknesses = [...profile.recurringWeaknesses]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, MAX_WEAKNESSES);

  return {
    hasData: sessionsCompleted > 0,
    sessionsCompleted,
    latestAvg,
    delta,
    trend: direction,
    topWeaknesses,
    strongAreas: profile.strongAreas,
  };
}

// ---- Weak spots that shrink -------------------------------------------------

export type WeakSpotStatus = "still" | "new" | "fixed";

export interface WeakSpotHistory {
  tag: string;
  frequency: number;
  /** One entry per recent session, oldest first: did this weak spot show up? */
  dots: boolean[];
  hits: number;
  /** null when no recent session recorded it (rows from before tags were kept). */
  status: WeakSpotStatus | null;
}

export const HISTORY_WINDOW = 8;

const STATUS_ORDER: Record<WeakSpotStatus, number> = { still: 0, new: 1, fixed: 2 };

// Looks fixed: absent from the last 2+ sessions. New: first seen in the latest.
// Still showing up: in the latest, or gone for only one session (too soon to call it fixed).
export function weakSpotStatus(dots: boolean[]): WeakSpotStatus | null {
  const last = dots.lastIndexOf(true);
  if (last === -1) return null;
  if (last === dots.length - 1) return dots.indexOf(true) === last ? "new" : "still";
  return dots.length - 1 - last >= 2 ? "fixed" : "still";
}

export function weakSpotHistory(
  weaknesses: RecurringWeakness[],
  sessions: SessionSummary[],
): WeakSpotHistory[] {
  // The API lists newest first; reversing before a stable date sort keeps that
  // order for same-day sessions. ponytail: same-day order is only as good as the API's.
  const recent = [...sessions]
    .reverse()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .slice(-HISTORY_WINDOW);
  return weaknesses
    .map((w) => {
      const dots = recent.map((s) => s.weaknessTags?.includes(w.tag) ?? false);
      return {
        tag: w.tag,
        frequency: w.frequency,
        dots,
        hits: dots.filter(Boolean).length,
        status: weakSpotStatus(dots),
      };
    })
    .sort((a, b) => rank(a.status) - rank(b.status));
}

/** Text alternative for the dot strip. */
export function dotsLabel(hits: number, total: number): string {
  if (total === 1) return hits ? "Showed up in your only session" : "Didn't show up in your only session";
  return `Showed up in ${hits} of your last ${total} sessions`;
}

function rank(s: WeakSpotStatus | null): number {
  return s === null ? 3 : STATUS_ORDER[s];
}

/** The one plain-language sentence the dashboard opens with. */
export function dashboardTakeaway(
  summary: MemorySummary,
  latest: SessionSummary | undefined,
  spots: WeakSpotHistory[],
): string {
  const n = summary.sessionsCompleted;
  const first =
    latest && latest.total > 0
      ? `You held up on ${latest.survived} of ${latest.total} answers last session.`
      : summary.trend === "up"
        ? "Your average went up last session."
        : summary.trend === "down"
          ? "Your average slipped a little last session."
          : `You've finished ${n} ${n === 1 ? "session" : "sessions"}.`;

  const focus = spots.find((s) => s.status !== "fixed");
  const fixed = spots.find((s) => s.status === "fixed");
  const second = focus
    ? `${humanizeTag(focus.tag)} is the next thing to work on.`
    : fixed
      ? `${humanizeTag(fixed.tag)} looks fixed. Keep it that way.`
      : "No weak spot keeps coming back yet.";
  return `${first} ${second}`;
}

// ---- Coding history -----------------------------------------------------------

export const CODING_ROWS_SHOWN = 6;

export interface CodingRow {
  key: string;
  title: string;
  language: "Python" | "JavaScript";
  /** "12 of 14 tests", or "Not submitted". */
  tests: string;
  /** "11 min", "under a minute", or null when the time is unknown. */
  time: string | null;
  solved: boolean;
  /** Only positive comparisons with the previous try of the same problem. */
  note: string | null;
}

export interface CodingHistory {
  takeaway: string;
  rows: CodingRow[];
}

export function formatSeconds(seconds: number | null): string | null {
  if (seconds === null) return null;
  return seconds < 60 ? "under a minute" : `${Math.round(seconds / 60)} min`;
}

const isSolved = (a: CodingAttempt) => a.submitted && a.testsTotal > 0 && a.testsPassed === a.testsTotal;
const passRate = (a: CodingAttempt) => (a.testsTotal > 0 ? a.testsPassed / a.testsTotal : 0);

function repeatNote(a: CodingAttempt, prev: CodingAttempt | undefined): string | null {
  if (!prev) return null;
  if (passRate(a) > passRate(prev)) return "More tests passing than last time";
  if (isSolved(a) && a.seconds !== null && prev.seconds !== null && a.seconds < prev.seconds) {
    return "Faster than last time";
  }
  return null;
}

/**
 * The dashboard's coding section: one sentence plus the latest attempts, newest first.
 * `titles` maps problemId to its display title; unknown ids are humanized.
 * Null when no session has a coding attempt.
 */
export function codingHistory(
  sessions: SessionSummary[],
  titles: Record<string, string>,
): CodingHistory | null {
  // Newest first. Same-day sessions keep the API's newest-first order; later
  // questions in a session count as newer.
  const attempts = [...sessions]
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
    .flatMap((s) => [...(s.coding ?? [])].reverse().map((a, i) => ({ a, key: `${s.sessionId}-${i}` })));
  if (attempts.length === 0) return null;

  const title = (id: string) => titles[id] ?? humanizeTag(id.replace(/^code-/, ""));
  const n = new Set(attempts.map(({ a }) => a.problemId)).size;
  const solved = attempts.map(({ a }) => a).filter(isSolved);
  const solvedCount = new Set(solved.map((a) => a.problemId)).size;
  const fastest = solved
    .flatMap((a) => (a.seconds === null ? [] : [{ id: a.problemId, seconds: a.seconds }]))
    .sort((x, y) => x.seconds - y.seconds)[0];

  const noun = n === 1 ? "problem" : "problems";
  const takeaway =
    solvedCount === 0
      ? `You've tried ${n} ${noun}. Submit with every test passing to solve ${n === 1 ? "it" : "one"}.`
      : `You've solved ${solvedCount} of ${n} ${noun}.` +
        (fastest ? ` Fastest: ${title(fastest.id)} in ${formatSeconds(fastest.seconds)}.` : "");

  const rows = attempts.slice(0, CODING_ROWS_SHOWN).map(({ a, key }, i): CodingRow => ({
    key,
    title: title(a.problemId),
    language: a.language === "javascript" ? "JavaScript" : "Python",
    tests: a.submitted ? `${a.testsPassed} of ${a.testsTotal} tests` : "Not submitted",
    time: formatSeconds(a.seconds),
    solved: isSolved(a),
    note: repeatNote(a, attempts.slice(i + 1).find((o) => o.a.problemId === a.problemId)?.a),
  }));
  return { takeaway, rows };
}
