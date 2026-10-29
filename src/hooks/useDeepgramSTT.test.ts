import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { sttToken } = vi.hoisted(() => ({ sttToken: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { sttToken } }));

import { fluxUrl, listenUrl, useDeepgramSTT } from "./useDeepgramSTT";
import { useSpeechInput } from "./useSpeechInput";

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static last: FakeSocket;
  static failUrl: RegExp | null = null;
  static urls: string[] = [];
  readyState = FakeSocket.CONNECTING;
  sent: unknown[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string, public protocols: string[]) {
    FakeSocket.last = this;
    FakeSocket.urls.push(url);
    if (FakeSocket.failUrl?.test(url)) {
      queueMicrotask(() => this.onerror?.());
      return;
    }
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
  turn(event: string, transcript: string) {
    this.onmessage?.({ data: JSON.stringify({ type: "TurnInfo", event, transcript, turn_index: 0 }) });
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
  FakeSocket.urls = [];
  stopTrack.mockClear();
  FakeSocket.failUrl = null;
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
    expect(FakeSocket.last.url).toContain("model=flux-general-en");
    expect(FakeSocket.last.protocols).toEqual(["bearer", "jwt"]);
    expect(result.current.listening).toBe(true);
  });

  it("keeps finished phrases and shows the phrase in progress", async () => {
    FakeSocket.failUrl = /\/v2\//;
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

  it("asks for the mic before the 30 s token, and releases the mic without a token", async () => {
    const order: string[] = [];
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(async () => {
      order.push("mic");
      return { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    });
    sttToken.mockImplementationOnce(async () => {
      order.push("token");
      return null;
    });
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      expect(await result.current.start()).toBe(false);
    });
    expect(order).toEqual(["mic", "token"]);
    expect(stopTrack).toHaveBeenCalled();
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

describe("useDeepgramSTT on Flux", () => {
  it("connects to Flux first and reports semantic turns", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      expect(await result.current.start()).toBe(true);
    });
    expect(FakeSocket.last.url).toMatch(/^wss:\/\/api\.deepgram\.com\/v2\/listen\?model=flux-general-en/);
    expect(FakeSocket.last.protocols).toEqual(["bearer", "jwt"]);
    expect(result.current.semantic).toBe(true);
  });

  it("shows the turn live and hands over the finished turn once", async () => {
    const onTurnEnd = vi.fn();
    const { result } = renderHook(() => useDeepgramSTT([], onTurnEnd));
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeSocket.last.turn("StartOfTurn", "I'd"));
    act(() => FakeSocket.last.turn("Update", "I'd use a queue"));
    expect(result.current.transcript).toBe("I'd use a queue");
    expect(onTurnEnd).not.toHaveBeenCalled();
    act(() => FakeSocket.last.turn("EndOfTurn", "I'd use a queue."));
    expect(onTurnEnd).toHaveBeenCalledTimes(1);
    expect(onTurnEnd).toHaveBeenCalledWith("I'd use a queue.");
  });

  it("ignores an empty end of turn", async () => {
    const onTurnEnd = vi.fn();
    const { result } = renderHook(() => useDeepgramSTT([], onTurnEnd));
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeSocket.last.turn("EndOfTurn", "  "));
    expect(onTurnEnd).not.toHaveBeenCalled();
  });

  it("keeps a finished turn that wasn't used and adds the next one to it", async () => {
    const onTurnEnd = vi.fn(() => false);
    const { result } = renderHook(() => useDeepgramSTT([], onTurnEnd));
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeSocket.last.turn("EndOfTurn", "First I sort."));
    act(() => FakeSocket.last.turn("Update", "Then two"));
    expect(result.current.transcript).toBe("First I sort. Then two");
    act(() => FakeSocket.last.turn("EndOfTurn", "Then two pointers."));
    expect(onTurnEnd).toHaveBeenLastCalledWith("First I sort. Then two pointers.");
  });

  it("starts fresh after a turn is used", async () => {
    const onTurnEnd = vi.fn(() => true);
    const { result } = renderHook(() => useDeepgramSTT([], onTurnEnd));
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeSocket.last.turn("EndOfTurn", "First I sort."));
    expect(result.current.transcript).toBe("");
    act(() => FakeSocket.last.turn("EndOfTurn", "Next answer."));
    expect(onTurnEnd).toHaveBeenLastCalledWith("Next answer.");
  });

  it("ignores a turn that arrives after stop", async () => {
    const onTurnEnd = vi.fn(() => true);
    const { result } = renderHook(() => useDeepgramSTT([], onTurnEnd));
    await act(async () => {
      await result.current.start();
    });
    const socket = FakeSocket.last;
    act(() => result.current.stop());
    act(() => socket.turn("EndOfTurn", "half an answer"));
    expect(onTurnEnd).not.toHaveBeenCalled();
  });

  it("a Flux-only start that can't reach Flux opens nothing else", async () => {
    FakeSocket.failUrl = /\/v2\//;
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      expect(await result.current.start(true)).toBe(true);
    });
    expect(FakeSocket.urls).toHaveLength(1);
    expect(FakeSocket.urls[0]).toContain("model=flux-general-en");
    expect(result.current.listening).toBe(false);
    expect(result.current.semantic).toBe(false);
    expect(stopTrack).toHaveBeenCalled();
    // Flux is gone for the session: the next Flux-only start does nothing at all.
    await act(async () => {
      expect(await result.current.start(true)).toBe(true);
    });
    expect(FakeSocket.urls).toHaveLength(1);
    expect(result.current.listening).toBe(false);
  });

  it("falls back to Nova-3 when Flux won't open, and stays there", async () => {
    FakeSocket.failUrl = /\/v2\//;
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      expect(await result.current.start()).toBe(true);
    });
    expect(FakeSocket.last.url).toContain("model=nova-3");
    expect(result.current.semantic).toBe(false);
    act(() => result.current.stop());
    FakeSocket.failUrl = null;
    await act(async () => {
      await result.current.start();
    });
    expect(FakeSocket.last.url).toContain("model=nova-3");
  });

  it("drops Flux for the session if it closes before hearing anything", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      await result.current.start();
    });
    act(() => FakeSocket.last.onclose?.());
    expect(result.current.semantic).toBe(false);
    await act(async () => {
      await result.current.start();
    });
    expect(FakeSocket.last.url).toContain("model=nova-3");
  });

  it("keeps Flux when the candidate stops the mic before saying anything", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      await result.current.start();
    });
    const first = FakeSocket.last;
    act(() => result.current.stop());
    act(() => first.onclose?.()); // the close we asked for arrives afterwards
    await act(async () => {
      await result.current.start();
    });
    expect(FakeSocket.last.url).toContain("model=flux-general-en");
  });

  it("stop during connecting is not a Flux failure", async () => {
    const { result } = renderHook(() => useDeepgramSTT());
    await act(async () => {
      const started = result.current.start();
      result.current.stop();
      expect(await started).toBe(true);
    });
    await act(async () => {
      await result.current.start();
    });
    expect(FakeSocket.last.url).toContain("model=flux-general-en");
  });
});

describe("fluxUrl", () => {
  it("asks Flux to listen for interview terms and the candidate's skills", () => {
    const url = new URL(fluxUrl(["Terraform"]));
    expect(url.pathname).toBe("/v2/listen");
    expect(url.searchParams.get("model")).toBe("flux-general-en");
    expect(url.searchParams.get("eot_timeout_ms")).toBe("5000");
    expect(url.searchParams.getAll("keyterm")).toContain("Terraform");
    expect(url.searchParams.getAll("keyterm")).toContain("idempotent");
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
    // On the browser recognizer, a Flux-only start does nothing.
    act(() => result.current.start(true));
    expect(browserStart).toHaveBeenCalledTimes(1);
    delete window.SpeechRecognition;
  });

  it("a Flux-only start never falls back to the browser recognizer", async () => {
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
      result.current.start(true);
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(browserStart).not.toHaveBeenCalled();
    delete window.SpeechRecognition;
  });
});
