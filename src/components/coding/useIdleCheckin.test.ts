import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { IDLE_CHECKIN_MS, useIdleCheckin } from "./useIdleCheckin";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const setup = (enabled = true) => {
  const onIdle = vi.fn();
  const hook = renderHook(({ enabled, activity }) => useIdleCheckin(enabled, activity, onIdle), {
    initialProps: { enabled, activity: "a|0" },
  });
  return { onIdle, ...hook };
};

describe("useIdleCheckin", () => {
  it("fires once after 180 s of quiet", () => {
    const { onIdle } = setup();
    expect(IDLE_CHECKIN_MS).toBe(180_000);
    vi.advanceTimersByTime(179_999);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(IDLE_CHECKIN_MS * 3);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("starts over on every edit or message", () => {
    const { onIdle, rerender } = setup();
    vi.advanceTimersByTime(170_000);
    rerender({ enabled: true, activity: "ab|0" }); // an edit
    vi.advanceTimersByTime(170_000);
    rerender({ enabled: true, activity: "ab|1" }); // a message
    vi.advanceTimersByTime(170_000);
    expect(onIdle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10_000);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });

  it("stays quiet while disabled", () => {
    const { onIdle, rerender } = setup(false);
    vi.advanceTimersByTime(IDLE_CHECKIN_MS * 2);
    expect(onIdle).not.toHaveBeenCalled();
    rerender({ enabled: true, activity: "a|0" });
    vi.advanceTimersByTime(IDLE_CHECKIN_MS);
    expect(onIdle).toHaveBeenCalledTimes(1);
  });
});
