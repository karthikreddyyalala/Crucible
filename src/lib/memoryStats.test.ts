import { describe, it, expect } from "vitest";
import { codingHistory, dashboardTakeaway, formatSeconds, dotsLabel, summarizeMemory, weakSpotHistory, weakSpotStatus } from "./memoryStats";
import type { CodingAttempt, MemoryProfile, SessionSummary } from "@/types/contracts";

function profile(over: Partial<MemoryProfile> = {}): MemoryProfile {
  return {
    candidateId: "c1",
    recurringWeaknesses: [],
    improvementTrend: [],
    strongAreas: [],
    ...over,
  };
}

describe("summarizeMemory", () => {
  it("reports no data for an empty profile", () => {
    const s = summarizeMemory(profile());
    expect(s.hasData).toBe(false);
    expect(s.sessionsCompleted).toBe(0);
    expect(s.latestAvg).toBeNull();
    expect(s.delta).toBeNull();
    expect(s.trend).toBeNull();
  });

  it("counts a single session with no delta or trend", () => {
    const s = summarizeMemory(
      profile({ improvementTrend: [{ sessionDate: "2026-07-01", avgScore: 2.4 }] })
    );
    expect(s.hasData).toBe(true);
    expect(s.sessionsCompleted).toBe(1);
    expect(s.latestAvg).toBe(2.4);
    expect(s.delta).toBeNull();
    expect(s.trend).toBeNull();
  });

  it("computes a positive delta and 'up' trend when improving", () => {
    const s = summarizeMemory(
      profile({
        improvementTrend: [
          { sessionDate: "2026-07-01", avgScore: 2.0 },
          { sessionDate: "2026-07-05", avgScore: 3.5 },
        ],
      })
    );
    expect(s.sessionsCompleted).toBe(2);
    expect(s.latestAvg).toBe(3.5);
    expect(s.delta).toBeCloseTo(1.5);
    expect(s.trend).toBe("up");
  });

  it("computes a negative delta and 'down' trend when regressing", () => {
    const s = summarizeMemory(
      profile({
        improvementTrend: [
          { sessionDate: "2026-07-01", avgScore: 3.0 },
          { sessionDate: "2026-07-05", avgScore: 2.2 },
        ],
      })
    );
    expect(s.delta).toBeCloseTo(-0.8);
    expect(s.trend).toBe("down");
  });

  it("reports a flat trend when the score is unchanged", () => {
    const s = summarizeMemory(
      profile({
        improvementTrend: [
          { sessionDate: "2026-07-01", avgScore: 3.0 },
          { sessionDate: "2026-07-05", avgScore: 3.0 },
        ],
      })
    );
    expect(s.delta).toBe(0);
    expect(s.trend).toBe("flat");
  });

  it("uses the latest two points for delta across many sessions", () => {
    const s = summarizeMemory(
      profile({
        improvementTrend: [
          { sessionDate: "2026-07-01", avgScore: 1.0 },
          { sessionDate: "2026-07-03", avgScore: 4.0 },
          { sessionDate: "2026-07-05", avgScore: 3.0 },
        ],
      })
    );
    expect(s.sessionsCompleted).toBe(3);
    expect(s.latestAvg).toBe(3.0);
    expect(s.delta).toBeCloseTo(-1.0);
    expect(s.trend).toBe("down");
  });

  it("ranks weaknesses by frequency, highest first, capped at 5", () => {
    const s = summarizeMemory(
      profile({
        recurringWeaknesses: [
          { tag: "a", frequency: 1, lastSeen: "2026-07-01" },
          { tag: "b", frequency: 6, lastSeen: "2026-07-01" },
          { tag: "c", frequency: 3, lastSeen: "2026-07-01" },
          { tag: "d", frequency: 2, lastSeen: "2026-07-01" },
          { tag: "e", frequency: 5, lastSeen: "2026-07-01" },
          { tag: "f", frequency: 4, lastSeen: "2026-07-01" },
        ],
      })
    );
    expect(s.topWeaknesses.map((w) => w.tag)).toEqual(["b", "e", "f", "c", "d"]);
    expect(s.topWeaknesses).toHaveLength(5);
  });

  it("passes through strong areas", () => {
    const s = summarizeMemory(profile({ strongAreas: ["ownership", "clarity"] }));
    expect(s.strongAreas).toEqual(["ownership", "clarity"]);
  });
});

describe("weakSpotStatus", () => {
  const T = true;
  const F = false;
  it("is still showing up when present in the latest and earlier", () => {
    expect(weakSpotStatus([T, F, T])).toBe("still");
  });
  it("is new when first seen in the latest session", () => {
    expect(weakSpotStatus([F, F, T])).toBe("new");
    expect(weakSpotStatus([T])).toBe("new");
  });
  it("looks fixed when absent from the last two or more sessions", () => {
    expect(weakSpotStatus([T, F, F])).toBe("fixed");
    expect(weakSpotStatus([T, T, F, F, F])).toBe("fixed");
  });
  it("is too soon to call fixed after a single clean session", () => {
    expect(weakSpotStatus([T, T, F])).toBe("still");
  });
  it("has no status when no recent session recorded it", () => {
    expect(weakSpotStatus([])).toBeNull();
    expect(weakSpotStatus([F, F])).toBeNull();
  });
});

function sess(id: string, date: string, tags?: string[]): SessionSummary {
  return { sessionId: id, date, mode: "full", level: "mid", survived: 1, total: 2, weaknessTags: tags };
}
const w = (tag: string, frequency = 1) => ({ tag, frequency, lastSeen: "2026-10-01" });

describe("weakSpotHistory", () => {
  it("lays dots oldest to newest, last 8 only, and orders still, new, fixed", () => {
    // newest first, the way the API returns them; s0 falls outside the window
    const sessions = [
      sess("s9", "2026-10-09", ["new-one", "stuck"]),
      sess("s8", "2026-10-08", ["stuck"]),
      sess("s7", "2026-10-07", []),
      sess("s6", "2026-10-06", ["gone"]),
      sess("s5", "2026-10-05"),
      sess("s4", "2026-10-04"),
      sess("s3", "2026-10-03"),
      sess("s2", "2026-10-02"),
      sess("s0", "2026-10-01", ["stuck", "gone", "new-one"]),
    ];
    const out = weakSpotHistory([w("gone", 9), w("new-one", 5), w("stuck", 2)], sessions);
    expect(out.map((h) => [h.tag, h.status])).toEqual([
      ["stuck", "still"],
      ["new-one", "new"],
      ["gone", "fixed"],
    ]);
    expect(out[0].dots).toEqual([false, false, false, false, false, false, true, true]);
    expect(out[0].hits).toBe(2);
  });

  it("gives no status for weak spots no listed session recorded", () => {
    const out = weakSpotHistory([w("old")], [sess("a", "2026-10-01"), sess("b", "2026-10-02", [])]);
    expect(out[0]).toMatchObject({ status: null, hits: 0, dots: [false, false] });
  });
});

describe("dotsLabel", () => {
  it("reads naturally for one or many sessions", () => {
    expect(dotsLabel(3, 8)).toBe("Showed up in 3 of your last 8 sessions");
    expect(dotsLabel(1, 1)).toBe("Showed up in your only session");
    expect(dotsLabel(0, 1)).toBe("Didn't show up in your only session");
  });
});

describe("dashboardTakeaway", () => {
  const summary = summarizeMemory(
    profile({ improvementTrend: [{ sessionDate: "2026-10-01", avgScore: 3 }] }),
  );
  it("leads with the latest session and the next weak spot, humanized", () => {
    const spots = weakSpotHistory([w("vague-impact")], [sess("a", "2026-10-01", ["vague-impact"])]);
    expect(dashboardTakeaway(summary, sess("a", "2026-10-01"), spots)).toBe(
      "You held up on 1 of 2 answers last session. Vague impact is the next thing to work on.",
    );
  });
  it("celebrates a fixed weak spot when nothing else is open", () => {
    const spots = weakSpotHistory(
      [w("rambling")],
      [sess("c", "2026-10-03", []), sess("b", "2026-10-02", []), sess("a", "2026-10-01", ["rambling"])],
    );
    expect(dashboardTakeaway(summary, undefined, spots)).toBe(
      "You've finished 1 session. Rambling looks fixed. Keep it that way.",
    );
  });
});


function attempt(problemId: string, over: Partial<CodingAttempt> = {}): CodingAttempt {
  return {
    questionId: `q-${problemId}`,
    problemId,
    language: "python",
    testsPassed: 10,
    testsTotal: 10,
    submitted: true,
    seconds: 660,
    ...over,
  };
}
const coded = (id: string, date: string, coding: CodingAttempt[]): SessionSummary => ({
  ...sess(id, date),
  coding,
});
const TITLES = { "code-two-sum": "Two Sum", "code-3sum": "3Sum" };

describe("formatSeconds", () => {
  it("rounds to minutes, says under a minute, and omits unknown", () => {
    expect(formatSeconds(660)).toBe("11 min");
    expect(formatSeconds(689)).toBe("11 min");
    expect(formatSeconds(59)).toBe("under a minute");
    expect(formatSeconds(0)).toBe("under a minute");
    expect(formatSeconds(null)).toBeNull();
  });
});

describe("codingHistory", () => {
  it("is null when no session has coding attempts", () => {
    expect(codingHistory([sess("a", "2026-10-01"), coded("b", "2026-10-02", [])], TITLES)).toBeNull();
  });

  it("counts distinct problems solved and names the fastest solve", () => {
    const out = codingHistory(
      [
        coded("b", "2026-10-02", [
          attempt("code-two-sum", { seconds: 660 }),
          attempt("code-3sum", { seconds: 1500 }),
          attempt("code-valid-anagram", { testsPassed: 9 }),
        ]),
        coded("a", "2026-10-01", [
          attempt("code-two-sum", { seconds: 900 }),
          attempt("code-group-anagrams", { seconds: 120, submitted: false }),
          attempt("code-3sum", { seconds: 30, testsPassed: 4 }),
        ]),
      ],
      TITLES,
    );
    expect(out?.takeaway).toBe("You've solved 2 of 4 problems. Fastest: Two Sum in 11 min.");
  });

  it("drops the fastest clause when no solve has a time, and handles nothing solved", () => {
    expect(
      codingHistory([coded("a", "2026-10-01", [attempt("code-two-sum", { seconds: null })])], TITLES)?.takeaway,
    ).toBe("You've solved 1 of 1 problem.");
    expect(
      codingHistory([coded("a", "2026-10-01", [attempt("code-two-sum", { submitted: false })])], TITLES)?.takeaway,
    ).toBe("You've tried 1 problem. Submit with every test passing to solve it.");
  });

  it("lists newest first, at most 6, with titles, languages, tests and time", () => {
    const out = codingHistory(
      [
        coded("old", "2026-10-01", [attempt("code-a"), attempt("code-b"), attempt("code-c")]),
        coded("new", "2026-10-03", [
          attempt("code-two-sum", { language: "javascript", testsPassed: 12, testsTotal: 14 }),
          attempt("code-merge-k-sorted-lists", { submitted: false, seconds: null }),
          attempt("code-3sum", { seconds: 45 }),
        ]),
        coded("mid", "2026-10-02", [attempt("code-d")]),
      ],
      TITLES,
    );
    expect(out?.rows.map((r) => r.title)).toEqual([
      "3Sum",
      "Merge k sorted lists",
      "Two Sum",
      "D",
      "C",
      "B",
    ]);
    expect(out?.rows[0]).toMatchObject({ language: "Python", tests: "10 of 10 tests", time: "under a minute", solved: true });
    expect(out?.rows[1]).toMatchObject({ tests: "Not submitted", time: null, solved: false });
    expect(out?.rows[2]).toMatchObject({ language: "JavaScript", tests: "12 of 14 tests", time: "11 min", solved: false });
  });

  it("calls out only positive changes against the previous try of the same problem", () => {
    const out = codingHistory(
      [
        coded("c", "2026-10-03", [
          attempt("code-two-sum", { seconds: 300 }), // solved, faster than 660
          attempt("code-3sum", { testsPassed: 8 }), // more passing than 5
          attempt("code-a", { seconds: 900 }), // slower: no label
        ]),
        coded("b", "2026-10-02", [
          attempt("code-two-sum"),
          attempt("code-3sum", { testsPassed: 5 }),
          attempt("code-a", { seconds: 400 }),
        ]),
      ],
      TITLES,
    );
    expect(out?.rows.map((r) => [r.title, r.note])).toEqual([
      ["A", null],
      ["3Sum", "More tests passing than last time"],
      ["Two Sum", "Faster than last time"],
      ["A", null],
      ["3Sum", null],
      ["Two Sum", null],
    ]);
  });
});
