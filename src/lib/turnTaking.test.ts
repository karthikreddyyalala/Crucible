import { describe, it, expect } from "vitest";
import { silenceBeforeSendMs, SILENCE_SEND_MS, MID_THOUGHT_SEND_MS } from "./turnTaking";

describe("silenceBeforeSendMs", () => {
  it("sends after the normal pause when the thought is complete", () => {
    expect(silenceBeforeSendMs("We shipped on day nineteen and p99 dropped to 180 ms")).toBe(SILENCE_SEND_MS);
    expect(silenceBeforeSendMs("I'd use a queue.")).toBe(SILENCE_SEND_MS);
  });

  it("waits longer when the candidate trails off mid-thought", () => {
    for (const t of ["So the first thing I did was, um", "we cut scope and", "it failed because", "I'd put it in the", "basically..."]) {
      expect(silenceBeforeSendMs(t)).toBe(MID_THOUGHT_SEND_MS);
    }
  });

  it("does not mistake words that merely end in a connector", () => {
    expect(silenceBeforeSendMs("we used Redis as the brand")).toBe(SILENCE_SEND_MS);
  });
});
