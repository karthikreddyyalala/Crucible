import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "./useSpeechRecognition";

// Minimal fake of the browser SpeechRecognition engine so we can trigger its
// onend/onerror callbacks directly, the way Chrome does mid-dictation.
class FakeRecognition {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
}

let instance: FakeRecognition;

beforeEach(() => {
  instance = new FakeRecognition();
  // A plain function constructor — vi.fn()'s mock function isn't new-able
  // in this environment, so spy on the instance's own methods instead.
  function Ctor() {
    return instance;
  }
  window.SpeechRecognition = Ctor as unknown as typeof window.SpeechRecognition;
});

afterEach(() => {
  delete window.SpeechRecognition;
});

describe("useSpeechRecognition", () => {
  it("auto-restarts on an unexpected engine end while the user is still dictating", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    instance.start.mockClear();

    // Chrome ends the engine on its own after a pause — not a user stop.
    act(() => instance.onend?.());

    expect(instance.start).toHaveBeenCalledTimes(1); // restarted itself
    expect(result.current.listening).toBe(true); // never dropped to idle
  });

  it("stays stopped when the user explicitly stops", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.start());
    act(() => result.current.stop());
    instance.start.mockClear();

    act(() => instance.onend?.());

    expect(instance.start).not.toHaveBeenCalled(); // no restart after a real stop
    expect(result.current.listening).toBe(false);
  });

  it("ignores a no-speech error instead of killing dictation", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.start());
    act(() => instance.onerror?.({ error: "no-speech" }));

    expect(result.current.listening).toBe(true);
  });

  it("stops for real on a fatal error like permission denial", () => {
    const { result } = renderHook(() => useSpeechRecognition());

    act(() => result.current.start());
    act(() => instance.onerror?.({ error: "not-allowed" }));

    expect(result.current.listening).toBe(false);
  });

  it("keeps everything said before the engine restarts mid-answer", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const said = (...parts: string[]) => ({ results: parts.map((t) => [{ transcript: t }]) });

    act(() => result.current.start());
    act(() => instance.onresult?.(said("First I sorted the list", " then I used two pointers")));
    // Chrome ends the session after a pause and we restart it: the new session's results start empty.
    act(() => instance.onend?.());
    act(() => instance.onresult?.(said("and that keeps it linear")));

    expect(result.current.transcript).toBe("First I sorted the list then I used two pointers and that keeps it linear");
  });

  it("starts a fresh answer empty", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    const said = (t: string) => ({ results: [[{ transcript: t }]] });

    act(() => result.current.start());
    act(() => instance.onresult?.(said("old answer")));
    act(() => instance.onend?.());
    act(() => result.current.stop());
    act(() => result.current.start());
    act(() => instance.onresult?.(said("new answer")));

    expect(result.current.transcript).toBe("new answer");
  });
});
