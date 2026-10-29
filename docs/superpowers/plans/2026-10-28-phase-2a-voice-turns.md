# Phase 2a Voice Turn-Taking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marcus knows when you've finished a thought (Deepgram Flux), says a quick "Mm-hm" while he thinks, and stops talking when you interrupt him.

**Architecture:** All browser-side. `useDeepgramSTT` tries Flux (`/v2/listen`) first and falls back to Nova-3, reporting `semantic` and calling `onTurnEnd(text)` on Flux's `EndOfTurn`. A pure `isRealInterruption` in `turnTaking.ts` decides barge-in. A new `useBackchannel` hook plays static clips. `Interview.tsx` wires them together. Spec: `docs/superpowers/specs/2026-10-28-phase-2a-voice-turns-design.md`.

**Tech Stack:** React 18 + TypeScript strict, vitest + Testing Library, Playwright (demo mode), Python 3 for the one-time clip script.

**Rules for every task:** no `any`; comments in the file's existing plain style; conventional commits, author Karthik, never mention AI/Claude, no co-author trailers. **Never run anything that calls Bedrock, Deepgram, ElevenLabs or Tavus.** Only `npx vitest`, `npm run test:e2e`, `npx tsc --noEmit`, `npm run lint`, `pytest`.

**Waves:** Tasks 1, 2, 3 touch different files and run in parallel. Task 4 needs all three. Task 5 (docs) last.

---

### Task 1: `isRealInterruption` (barge-in rule)

**Files:**
- Modify: `src/lib/turnTaking.ts` (append)
- Test: `src/lib/turnTaking.test.ts` (append)

- [ ] **Step 1: Write the failing tests** (append to `turnTaking.test.ts`, add `isRealInterruption` to the import)

```ts
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
```

- [ ] **Step 2: Run, expect FAIL** (`isRealInterruption` is not exported)

Run: `npx vitest run src/lib/turnTaking.test.ts`

- [ ] **Step 3: Implement** (append to `turnTaking.ts`)

```ts
// Barge-in: the mic is open while the interviewer talks, so his own voice can leak
// back in through the speakers, and people say "mm-hm" while listening. Only stop him
// for at least two words that aren't fillers and aren't words he's saying right now.
const FILLERS = new Set(["mm", "mmm", "mhm", "hm", "hmm", "uh", "um", "er", "ah", "oh", "ok", "okay", "yeah", "yep", "right", "sure"]);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

export function isRealInterruption(heard: string, interviewerLine: string): boolean {
  const his = new Set(words(interviewerLine));
  return words(heard).filter((w) => !FILLERS.has(w) && !his.has(w)).length >= 2;
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run src/lib/turnTaking.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src/lib/turnTaking.ts src/lib/turnTaking.test.ts
git commit -m "feat: decide when the candidate is really interrupting the interviewer"
```

---

### Task 2: Flux in `useDeepgramSTT`, Nova-3 fallback

**Files:**
- Modify: `src/hooks/useDeepgramSTT.ts`
- Modify: `src/hooks/useSpeechInput.ts`
- Test: `src/hooks/useDeepgramSTT.test.ts`

Facts about Flux (from Deepgram docs): URL `wss://api.deepgram.com/v2/listen?model=flux-general-en`; WebM/Opus container is accepted with no `encoding`/`sample_rate`; ~80 ms chunks recommended; messages `{"type":"TurnInfo","event":"StartOfTurn"|"Update"|"EndOfTurn"|..., "transcript": "...", "turn_index": n, ...}`; the transcript is the whole current turn so far (not a delta). Our auth (`["bearer", token]` subprotocol) and `keyterm` are unconfirmed on `/v2`, which is why Nova-3 stays as the fallback.

- [ ] **Step 1: Update the test fakes and write failing tests**

In `useDeepgramSTT.test.ts`:
1. Give `FakeSocket` a static `failUrl: RegExp | null = null`. In the constructor, if `FakeSocket.failUrl?.test(url)`, `queueMicrotask(() => this.onerror?.())` and do not open. Reset `FakeSocket.failUrl = null` in `beforeEach`.
2. Add a helper on `FakeSocket`:

```ts
turn(event: string, transcript: string) {
  this.onmessage?.({ data: JSON.stringify({ type: "TurnInfo", event, transcript, turn_index: 0 }) });
}
```

3. Existing tests that send Nova `Results` messages (`keeps finished phrases...`) must set `FakeSocket.failUrl = /\/v2\//` first. The bearer-token test now expects Flux: `expect(FakeSocket.last.url).toContain("model=flux-general-en")`.
4. New tests:

```ts
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
    await act(async () => {
      await result.current.start();
    });
    expect(FakeSocket.last.url).toContain("model=nova-3");
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
```

Import `fluxUrl` alongside `listenUrl`.

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run src/hooks/useDeepgramSTT.test.ts`

- [ ] **Step 3: Implement**

In `useDeepgramSTT.ts`:

```ts
// Flux (Deepgram's conversational model) tells us when the candidate has finished a
// thought, so the answer goes when they're done instead of after a flat silence.
// eot_timeout_ms: after 5 s of silence it ends the turn even if unsure.
const FLUX_URL =
  "wss://api.deepgram.com/v2/listen?model=flux-general-en&eot_threshold=0.7&eot_timeout_ms=5000";
const NOVA_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&interim_results=true&endpointing=300";

function withTerms(base: string, extraTerms: readonly string[]): string {
  // (body of today's listenUrl, building on `base` instead of LISTEN_URL)
}
export function listenUrl(extraTerms: readonly string[] = []): string {
  return withTerms(NOVA_URL, extraTerms);
}
export function fluxUrl(extraTerms: readonly string[] = []): string {
  return withTerms(FLUX_URL, extraTerms);
}
const FLUX_OPEN_TIMEOUT_MS = 3_000; // fail over to Nova-3 quickly
const OPEN_TIMEOUT_MS = 5_000;
const CHUNK_MS = 100; // Flux wants ~80 ms; fine for Nova-3 too

interface FluxTurnInfo {
  type?: string;
  event?: string;
  transcript?: string;
}
```

Hook changes:
- Signature `useDeepgramSTT(keyterms: readonly string[] = [], onTurnEnd?: (text: string) => void)`; keep `onTurnEnd` in a ref updated every render (like `keytermsRef`).
- New state `const [semantic, setSemantic] = useState(false);` and `const fluxFailedRef = useRef(false);`.
- Replace the single open with a helper inside `start` (after the mic is granted):

```ts
const open = (url: string, timeoutMs: number) =>
  new Promise<WebSocket | null>((resolve) => {
    const socket = new WebSocket(url, ["bearer", token]);
    socketRef.current = socket;
    const timer = setTimeout(() => {
      socket.close();
      resolve(null);
    }, timeoutMs);
    socket.onopen = () => {
      clearTimeout(timer);
      resolve(socket);
    };
    socket.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
  });

let socket = fluxFailedRef.current ? null : await open(fluxUrl(keytermsRef.current), FLUX_OPEN_TIMEOUT_MS);
if (!busyRef.current) return cancelled();
const onFlux = socket !== null;
if (!onFlux) {
  fluxFailedRef.current = true; // the rest of the session goes straight to Nova-3
  socket = await open(listenUrl(keytermsRef.current), OPEN_TIMEOUT_MS);
  if (!busyRef.current) return cancelled();
  if (!socket) return fail();
}
setSemantic(onFlux);
```

- `onmessage`: on Flux, handle only `type === "TurnInfo"`; `heard = true`; `const text = data.transcript?.trim() ?? ""; setTranscript(text); if (data.event === "EndOfTurn" && text) onTurnEndRef.current?.(text);`. On Nova-3, keep today's `Results` handling unchanged.
- `onclose`: if on Flux and `heard` is still false, set `fluxFailedRef.current = true` (Flux opened but rejected us; don't try it again this session). Then today's behaviour.
- Return `{ supported, listening, transcript, semantic, start, stop }`.

In `useSpeechInput.ts`: accept `onTurnEnd?: (text: string) => void` as the second argument, pass it to `useDeepgramSTT(keyterms, onTurnEnd)`, and return `semantic: !useBrowser && deepgram.semantic`. Update the file's comment with one sentence: on Flux, `onTurnEnd` fires when the candidate has finished a thought and `semantic` is true.

- [ ] **Step 4: Run, expect PASS; also typecheck**

Run: `npx vitest run src/hooks/ && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useDeepgramSTT.ts src/hooks/useDeepgramSTT.test.ts src/hooks/useSpeechInput.ts
git commit -m "feat: transcribe with Deepgram Flux to know when the candidate has finished"
```

---

### Task 3: `useBackchannel` hook + one-time clip script

**Files:**
- Create: `src/hooks/useBackchannel.ts`
- Test: `src/hooks/useBackchannel.test.ts`
- Create: `backend/scripts/__init__.py` (empty), `backend/cli/make_backchannel_clips.py`
- Create: `public/backchannel/.gitkeep`

- [ ] **Step 1: Write the failing tests**

```ts
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
```

- [ ] **Step 2: Run, expect FAIL**

Run: `npx vitest run src/hooks/useBackchannel.test.ts`

- [ ] **Step 3: Implement `src/hooks/useBackchannel.ts`**

```ts
import { useCallback, useRef } from "react";

// A quick "Mm-hm" the moment a spoken answer is sent, so the few seconds while
// Marcus thinks aren't dead air. Pre-recorded in his voice (public/backchannel/,
// made once by backend/cli/make_backchannel_clips.py). A missing clip just
// stays silent: never an error, never a different voice.
export const BACKCHANNEL_CLIPS = ["mm-hm", "mm", "right"].map(
  (name) => `${import.meta.env.BASE_URL}backchannel/${name}.mp3`,
);

export function nextClip(last: number, random: () => number = Math.random): number {
  if (last < 0) return Math.floor(random() * BACKCHANNEL_CLIPS.length);
  const i = Math.floor(random() * (BACKCHANNEL_CLIPS.length - 1));
  return i >= last ? i + 1 : i;
}

export function useBackchannel() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastRef = useRef(-1);

  // Create the element inside a click so later play() calls are allowed.
  const unlock = useCallback(() => {
    audioRef.current ??= new Audio();
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    lastRef.current = nextClip(lastRef.current);
    audio.src = BACKCHANNEL_CLIPS[lastRef.current];
    try {
      void audio.play()?.catch(() => {});
    } catch {
      // some browsers throw instead of rejecting; a missed "Mm-hm" is fine
    }
  }, []);

  return { unlock, play };
}
```

- [ ] **Step 4: Run, expect PASS**

Run: `npx vitest run src/hooks/useBackchannel.test.ts && npx tsc --noEmit`

- [ ] **Step 5: Create the clip script (do NOT run it: it costs ElevenLabs credits)**

`backend/cli/make_backchannel_clips.py`:

```python
"""One-time: render the interviewer's short "Mm-hm" clips in his ElevenLabs voice.

Costs ElevenLabs credits (about 20 characters in total), so run it only when the
clips need remaking. From backend/:  python -m cli.make_backchannel_clips
Writes public/backchannel/*.mp3, which the browser plays while Marcus thinks.
"""
from pathlib import Path

from app import _build_tts  # importing app loads the repo-root .env.local
from config.settings import Settings

CLIPS: dict[str, str] = {"mm-hm": "Mm-hm.", "mm": "Mm.", "right": "Right."}
OUT = Path(__file__).resolve().parents[2] / "public" / "backchannel"


def main() -> None:
    tts = _build_tts(Settings())
    if tts is None:
        raise SystemExit("ElevenLabs isn't configured (ELEVENLABS_API_KEY).")
    OUT.mkdir(parents=True, exist_ok=True)
    for name, text in CLIPS.items():
        (OUT / f"{name}.mp3").write_bytes(tts.synthesize(text))
        print(f"wrote {name}.mp3")


if __name__ == "__main__":
    main()
```

Check `Settings()` builds without arguments the way `app.py` does it (read `create_app` in `backend/app.py`); if `app.py` builds settings differently, do the same. Add an empty `backend/scripts/__init__.py` and `public/backchannel/.gitkeep`.

Add a mocked test `backend/tests/test_backchannel_clips.py` that monkeypatches `cli.make_backchannel_clips._build_tts` to return a fake with `synthesize = lambda text: text.encode()`, points `OUT` at `tmp_path`, runs `main()`, and asserts the three files exist with the right bytes. Run `cd backend && python -m pytest tests/test_backchannel_clips.py -q`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useBackchannel.ts src/hooks/useBackchannel.test.ts backend/scripts public/backchannel/.gitkeep backend/tests/test_backchannel_clips.py
git commit -m "feat: short interviewer backchannel clips while the reply is prepared"
```

---

### Task 4: Wire it into the interview page

**Depends on Tasks 1-3.**

**Files:**
- Modify: `src/pages/Interview.tsx` (voice section, roughly lines 85-280)
- Test: `src/pages/Interview.test.tsx`

Behaviour to build (from the spec):
1. `const stt = useSpeechInput(skills ?? NO_TERMS, (text) => handleTurnEnd(text));` (`handleTurnEnd` is a function declaration later in the component, so it's hoisted; the hook keeps the latest callback in a ref).
2. `function handleTurnEnd(text: string)`: if the interviewer is still speaking, drop it (it wasn't a real interruption, or that would already have stopped him); else `void sendText(text, true)`.
3. Silence timer only off Flux: `const autoSending = voiceOn && stt.listening && !stt.semantic && !!stt.transcript.trim();` and the timer calls `sendText(stt.transcript, true)`.
4. Mic opens while he speaks on Flux (voice-only): in the hands-free effect,

```ts
const finished = wasSpeaking.current && !interviewerSpeaking;
const started = !wasSpeaking.current && interviewerSpeaking;
wasSpeaking.current = interviewerSpeaking;
// On Flux the mic is open while he talks, so the candidate can interrupt him.
const opens = finished || (started && stt.semantic && !useVideo);
if (opens && voiceOn && status === "live" && stt.supported && !stt.listening) stt.start();
```

5. Barge-in effect:

```ts
// Interrupting: a real sentence from the candidate stops his voice at once; their
// turn is then sent when Flux hears them finish.
const lastInterviewerLine = [...messages].reverse().find((m) => m.speaker === "interviewer")?.text ?? "";
useEffect(() => {
  if (stt.semantic && !useVideo && tts.speaking && isRealInterruption(stt.transcript, lastInterviewerLine)) tts.cancel();
  // tts is recreated every render; the transcript is what matters here
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [stt.transcript]);
```

6. Backchannel: `const backchannel = useBackchannel();` call `backchannel.unlock()` next to every `eleven.unlock()`. `sendText(raw: string, spoken = false)`: after the existing guard, `if (spoken && phase === "question" && !useVideo) backchannel.play();`. Typed answers never play it.

Tests (in `Interview.test.tsx`): replace the static `useSpeechInput` and `useElevenLabsTTS` mocks with hoisted mutable objects so tests can control them:

```ts
const speech = vi.hoisted(() => ({
  supported: true, listening: false, transcript: "", semantic: false,
  start: vi.fn(), stop: vi.fn(), onTurnEnd: undefined as ((text: string) => void) | undefined,
}));
vi.mock("@/hooks/useSpeechInput", () => ({
  useSpeechInput: (_terms: readonly string[], onTurnEnd?: (text: string) => void) => {
    speech.onTurnEnd = onTurnEnd;
    return speech;
  },
}));
const voice = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), unlock: vi.fn(), speaking: false, available: true }));
vi.mock("@/hooks/useElevenLabsTTS", () => ({ useElevenLabsTTS: () => voice }));
const backchannel = vi.hoisted(() => ({ unlock: vi.fn(), play: vi.fn() }));
vi.mock("@/hooks/useBackchannel", () => ({ useBackchannel: () => backchannel }));
```

Reset them in `beforeEach` (`supported: false` by default so existing tests keep their behaviour). Put `submitAnswer: vi.fn(async () => true)` into the store in `start(...)`. Turn voice on by clicking the existing voice toggle (find its accessible name in `Interview.tsx`). New tests:
- On Flux (`semantic: true`), `act(() => speech.onTurnEnd?.("We used a queue."))` sends `"We used a queue."` through `submitAnswer` and plays the backchannel (behavioral question, phase `question`).
- On Flux, a transcript with `listening: true` does not send after 3 s of fake timers.
- Off Flux (`semantic: false`, `listening: true`, transcript `"I'd use a queue."`), advancing fake timers past 2800 ms sends it (existing behaviour kept).
- No backchannel for a voice answer in phase `warmup`; none for a typed answer.
- With `voice.speaking: true` and `semantic: true`, re-rendering with transcript `"Sorry, can I clarify something?"` calls `voice.cancel`; with transcript `"mm-hm"` it doesn't.
- `onTurnEnd` while `voice.speaking: true` doesn't call `submitAnswer`.

- [ ] **Step 1:** Write the tests above; run `npx vitest run src/pages/Interview.test.tsx`; expect the new ones to FAIL and existing ones to PASS.
- [ ] **Step 2:** Implement 1-6 in `Interview.tsx` (imports: `isRealInterruption` from `@/lib/turnTaking`, `useBackchannel` from `@/hooks/useBackchannel`).
- [ ] **Step 3:** Run `npx vitest run && npx tsc --noEmit && npm run lint`; all PASS.
- [ ] **Step 4:** Run `npm run test:e2e` (demo mode, free); all 8 PASS.
- [ ] **Step 5: Commit**

```bash
git add src/pages/Interview.tsx src/pages/Interview.test.tsx
git commit -m "feat: send on end of turn, backchannel while thinking, let the candidate interrupt"
```

---

### Task 5: Docs

- [ ] Update `docs/TODO.md` (Phase 2a items, stale items from earlier phases), `docs/PROJECT-HISTORY.md` (PRs #6 to #11 and this branch), `docs/ROADMAP.md` (2a to 2d split), README voice section if it describes the 2.8 s pause.
- [ ] Commit: `docs: phase 2a voice turn-taking`.

## Live check (only with Karthik's OK, after merge-ready)

1. Clips: `cd backend && python -m cli.make_backchannel_clips` (ElevenLabs, about 20 characters).
2. About 10 minutes of talking on the local site with Flux, about $0.10 Deepgram, plus Claude for Marcus's replies if run against the real backend (ask with that estimate). Verify: Flux connects with our token, keyterms accepted, interruption works without echo false-stops.
