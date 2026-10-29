import { describe, it, expect } from "vitest";
import { silenceBeforeSendMs, isRealInterruption, SILENCE_SEND_MS, MID_THOUGHT_SEND_MS } from "./turnTaking";

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

describe("isRealInterruption", () => {
  const line = "Okay. Walk me through how the cache stays consistent with the database.";

  it("ignores his own words leaking back through the speakers", () => {
    expect(isRealInterruption("walk me through how the cache", line)).toBe(false);
    expect(isRealInterruption("Consistent with the database.", line)).toBe(false);
  });

  it("ignores single words, fillers and backchannels", () => {
    expect(isRealInterruption("sorry", line)).toBe(false);
    expect(isRealInterruption("Mm-hm.", line)).toBe(false);
    expect(isRealInterruption("uh yeah okay", line)).toBe(false);
    expect(isRealInterruption("", line)).toBe(false);
  });

  it("stops him for two or more new words", () => {
    expect(isRealInterruption("Sorry, can I clarify something?", line)).toBe(true);
    expect(isRealInterruption("wait, we used Redis", line)).toBe(true);
  });

  it("ignores case and punctuation", () => {
    expect(isRealInterruption("WALK me, through!", line)).toBe(false);
  });
});
