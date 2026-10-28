import { describe, it, expect } from "vitest";
import { describeError, designCalls, formatValue, isMac } from "./format";

describe("formatValue", () => {
  it("writes values the way Python prints them", () => {
    expect(formatValue([0, 1])).toBe("[0, 1]");
    expect(formatValue(null)).toBe("None");
    expect(formatValue([true, false])).toBe("[True, False]");
    expect(formatValue(["a", "b"])).toBe('["a", "b"]');
    expect(formatValue({ a: 1 })).toBe('{"a": 1}');
  });

  it("cuts very long values short", () => {
    expect(formatValue("x".repeat(5000)).length).toBeLessThan(1100);
  });
});

describe("describeError", () => {
  it("names the line of a load error first", () => {
    expect(describeError("SyntaxError: invalid syntax (line 4)", true)).toEqual({
      text: "SyntaxError on line 4: invalid syntax",
      line: 4,
    });
  });

  it("says which line raised during a test", () => {
    expect(describeError("IndexError: list index out of range (line 7)", false)).toEqual({
      text: "Line 7 raised IndexError: list index out of range",
      line: 7,
    });
  });

  it("keeps the design call that failed", () => {
    expect(describeError("Error in call 3 (search): KeyError: 'x' (line 9)", false)).toEqual({
      text: "In call 3 (search), line 9 raised KeyError: 'x'",
      line: 9,
    });
  });

  it("passes plain messages through", () => {
    expect(describeError("Couldn't find a function named two_sum", true)).toEqual({
      text: "Couldn't find a function named two_sum",
      line: null,
    });
  });
});

describe("designCalls", () => {
  it("pairs each call with what it should and did return", () => {
    const rows = designCalls(
      { ops: ["Dict", "add", "search"], args: [[], ["cat"], ["c.t"]] },
      [null, null, true],
      [null, null, false],
    );
    expect(rows.map((r) => r.call)).toEqual(["Dict()", 'add("cat")', 'search("c.t")']);
    expect(rows[2]).toMatchObject({ expected: "True", got: "False", ok: false });
    expect(rows[1].ok).toBe(true);
  });

  it("marks calls that never ran", () => {
    const rows = designCalls({ ops: ["Dict", "add"], args: [[], ["a"]] }, [null, null], [null]);
    expect(rows[1]).toMatchObject({ got: "—", ok: false });
  });
});

describe("isMac", () => {
  it("detects Apple platforms", () => {
    expect(isMac("MacIntel")).toBe(true);
    expect(isMac("Win32")).toBe(false);
  });
});
