import { describe, it, expect } from "vitest";
import { humanizeTag } from "./humanize";

describe("humanizeTag", () => {
  it("turns dashed and underscored tags into words", () => {
    expect(humanizeTag("vague-impact")).toBe("Vague impact");
    expect(humanizeTag("no_edge_cases")).toBe("No edge cases");
    expect(humanizeTag("rambling")).toBe("Rambling");
    expect(humanizeTag("")).toBe("");
  });
});
