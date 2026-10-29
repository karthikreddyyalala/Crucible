import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { avatarSession, endAvatarSession, fakeCall } = vi.hoisted(() => {
  const handlers: Record<string, (ev: unknown) => void> = {};
  const fakeCall = {
    handlers,
    on: vi.fn((name: string, fn: (ev: unknown) => void) => {
      handlers[name] = fn;
    }),
    join: vi.fn(async () => undefined),
    leave: vi.fn(async () => undefined),
    destroy: vi.fn(),
    sendAppMessage: vi.fn(),
  };
  return { avatarSession: vi.fn(), endAvatarSession: vi.fn(async () => undefined), fakeCall };
});

vi.mock("@/lib/api", () => ({ api: { avatarSession, endAvatarSession } }));
vi.mock("@daily-co/daily-js", () => ({ default: { createCallObject: () => fakeCall } }));

import { READY_TIMEOUT_MS, useTavus } from "./useTavus";

const SESSION = { enabled: true, conversationUrl: "https://tavus.daily.co/room", conversationId: "c1" };
const replicaVideo = () =>
  fakeCall.handlers["track-started"]?.({ participant: { local: false }, track: { kind: "video" } });

beforeEach(() => {
  vi.useFakeTimers();
  avatarSession.mockReset().mockResolvedValue(SESSION);
  endAvatarSession.mockClear();
  fakeCall.sendAppMessage.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTavus", () => {
  it("is ready only once the replica's video arrives, then speaks lines", async () => {
    const { result } = renderHook(() => useTavus());
    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("connecting"); // joined the room, replica not there yet

    act(() => replicaVideo());
    expect(result.current.status).toBe("ready");

    act(() => result.current.speak("Hi, I'm Marcus."));
    expect(fakeCall.sendAppMessage).toHaveBeenCalledTimes(1);
  });

  it("starts one conversation even when activated twice in a row", async () => {
    const { result } = renderHook(() => useTavus());
    await act(async () => {
      await Promise.all([result.current.activate(), result.current.activate()]);
    });
    expect(avatarSession).toHaveBeenCalledTimes(1);
  });

  it("gives up after the timeout, ends the conversation and reports an error", async () => {
    const { result } = renderHook(() => useTavus());
    await act(async () => {
      await result.current.activate();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS);
    });
    expect(result.current.status).toBe("error");
    expect(endAvatarSession).toHaveBeenCalledWith("c1");

    act(() => replicaVideo()); // a late replica doesn't revive the failed attempt
    expect(result.current.status).toBe("error");
  });

  it("ends a conversation that finishes being created after it was turned off", async () => {
    let resolve: (v: typeof SESSION) => void = () => {};
    avatarSession.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { result } = renderHook(() => useTavus());

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.activate();
    });
    await act(async () => {
      await result.current.deactivate();
    });
    await act(async () => {
      resolve(SESSION);
      await pending;
    });

    expect(endAvatarSession).toHaveBeenCalledWith("c1");
    expect(result.current.status).toBe("idle");
  });

  it("reports an error when the session request fails", async () => {
    avatarSession.mockRejectedValueOnce(new Error("400"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useTavus());
    await act(async () => {
      await result.current.activate();
    });
    expect(result.current.status).toBe("error");
  });

  it("connects when turned off and straight back on (React's dev remount does exactly this)", async () => {
    const { result } = renderHook(() => useTavus());
    await act(async () => {
      void result.current.activate();
      void result.current.deactivate();
      await result.current.activate();
    });
    expect(avatarSession).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe("connecting");
    act(() => replicaVideo());
    expect(result.current.status).toBe("ready");
  });

  it("ends the billed conversation when the tab is closed or reloaded", async () => {
    const { result } = renderHook(() => useTavus());
    await act(async () => {
      await result.current.activate();
    });
    act(() => replicaVideo());
    window.dispatchEvent(new Event("pagehide"));
    expect(endAvatarSession).toHaveBeenCalledWith("c1");
  });
});
