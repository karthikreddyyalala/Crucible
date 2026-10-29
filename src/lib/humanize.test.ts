import { describe, it, expect } from "vitest";
import { formatAverage, formatDay, humanizeTag } from "./humanize";

describe("humanizeTag", () => {
  it("turns dashed and underscored tags into words", () => {
    expect(humanizeTag("vague-impact")).toBe("Vague impact");
    expect(humanizeTag("no_edge_cases")).toBe("No edge cases");
    expect(humanizeTag("rambling")).toBe("Rambling");
    expect(humanizeTag("")).toBe("");
  });
});

describe("formatDay", () => {
  it("shows the calendar day stored, in any time zone", () => {
    expect(formatDay("2026-10-05", { day: "numeric" })).toBe("5");
    expect(formatDay("2026-10-05T23:30:00Z", { day: "numeric" })).toBe("5");
  });
});

describe("formatAverage", () => {
  it("is one decimal, out of 5", () => {
    expect(formatAverage(3.456)).toBe("3.5 of 5");
  });
});
