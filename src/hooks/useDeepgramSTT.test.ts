import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { sttToken } = vi.hoisted(() => ({ sttToken: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { sttToken } }));

import { listenUrl, useDeepgramSTT } from "./useDeepgramSTT";
import { useSpeechInput } from "./useSpeechInput";

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static last: FakeSocket;
  readyState = FakeSocket.CONNECTING;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string, public protocols: string[]) {
    FakeSocket.last = this;
    queueMicrotask(() => {
      this.readyState = FakeSocket.OPEN;
      this.onopen?.();
    });
  }
  send(data: unknown) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
  }
  hear(text: string, isFinal: boolean) {
    this.onmessage?.({ data: JSON.stringify({ type: "Results", is_final: isFinal, channel: { alternatives: [{ transcript: text }] } }) });
  }
}

class FakeRecorder {
  static isTypeSupported = () => true;
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
  }
}

const stopTrack = vi.fn();

beforeEach(() => {
  sttToken.mockReset().mockResolvedValue("jwt");
  vi.stubGlobal("WebSocket", FakeSocket);
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: stopTrack }] })) },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useDeepgramSTT", () => {
  it("streams with a short-lived bearer token, never the key", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      expect(await result.current.start()).toBe(true);
    });
    expect(FakeSocket.last.url).toContain("model=nova-3");
    expect(FakeSocket.last.protocols).toEqual(["bearer", "jwt"]);
    expect(result.current.listening).toBe(true);
  });

  it("keeps finished phrases and shows the phrase in progress", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeSocket.last.hear("First I sort the list.", true));
    act(() => FakeSocket.last.hear("Then two", false));
    expect(result.current.transcript).toBe("First I sort the list. Then two");
    act(() => FakeSocket.last.hear("Then two pointers meet in the middle.", true));
    act(() => FakeSocket.last.hear("", true)); // silence
    expect(result.current.transcript).toBe("First I sort the list. Then two pointers meet in the middle.");
  });

  it("closes the stream and the mic on stop", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      await result.current.start();
    });
    const socket = FakeSocket.last;
    act(() => result.current.stop());
    expect(socket.sent).toContainEqual(JSON.stringify({ type: "CloseStream" }));
    expect(stopTrack).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
  });

  it("reports false when the backend has no Deepgram", async () => {
    sttToken.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      expect(await result.current.start()).toBe(false);
    });
    expect(result.current.listening).toBe(false);
  });
});

describe("listenUrl", () => {
  it("asks Nova-3 to listen for interview terms and the candidate's skills, once each", () => {
    const url = new URL(listenUrl(["Terraform", "kafka", "C++"]));
    const terms = url.searchParams.getAll("keyterm");
    expect(url.searchParams.get("model")).toBe("nova-3");
    expect(terms).toContain("idempotent");
    expect(terms.slice(0, 3)).toEqual(["Terraform", "kafka", "C++"]);
    expect(terms.filter((t) => t.toLowerCase() === "kafka")).toHaveLength(1);
  });
});

describe("useSpeechInput", () => {
  it("falls back to the browser recognizer when Deepgram can't start", async () => {
    sttToken.mockResolvedValue(null);
    const browserStart = vi.fn();
    class FakeRecognition {
      start = browserStart;
      stop = vi.fn();
      abort = vi.fn();
    }
    window.SpeechRecognition = FakeRecognition as unknown as typeof window.SpeechRecognition;

    const { result } = renderHook(() => useSpeechInput());
    await act(async () => {
      result.current.start();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(browserStart).toHaveBeenCalledTimes(1);
    delete window.SpeechRecognition;
  });
});
