import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { BACKCHANNEL_CLIPS, nextClip, useBackchannel } from "./useBackchannel";

describe("nextClip", () => {
  it("never plays the same clip twice in a row", () => {
    for (let last = 0; last < BACKCHANNEL_CLIPS.length; last++) {
      for (const r of [0, 0.34, 0.5, 0.67, 0.99]) {
        expect(nextClip(last, () => r)).not.toBe(last);
      }
    }
  });

  it("can pick any clip first", () => {
    expect(nextClip(-1, () => 0)).toBe(0);
    expect(nextClip(-1, () => 0.99)).toBe(BACKCHANNEL_CLIPS.length - 1);
  });
});

describe("useBackchannel", () => {
  const play = vi.fn();
  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal(
      "Audio",
      class {
        src = "";
        play = play;
        pause = vi.fn();
      },
    );
  });

  it("does nothing until unlocked inside a click", () => {
    const { result } = renderHook(() => useBackchannel());
    act(() => result.current.play());
    expect(play).not.toHaveBeenCalled();
  });

  it("plays a clip once unlocked", () => {
    const { result } = renderHook(() => useBackchannel());
    act(() => {
      result.current.unlock();
      result.current.play();
    });
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("stays silent when a clip can't play", async () => {
    play.mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useBackchannel());
    act(() => {
      result.current.unlock();
      result.current.play();
    });
    await Promise.resolve(); // no unhandled rejection
  });
});
