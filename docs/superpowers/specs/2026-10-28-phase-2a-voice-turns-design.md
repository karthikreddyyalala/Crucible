# Phase 2a: voice turn-taking that feels like a person

Date: 2026-10-28. Branch `feat/phase-2a-voice-turns`. Approved by Karthik in chat (approach A).

Phase 2 is split into four pieces, each with its own spec, plan and PR:
- **2a (this spec):** smart end of turn, instant "Mm-hm", interrupting Marcus.
- 2b: skip questions already answered, key points of each answer in the report.
- 2c: transcription accuracy pass (re-check the recording with pre-recorded Deepgram).
- 2d: Tavus speaks with the ElevenLabs "Chris" voice; JavaScript in the coding round.

## Problem

In voice mode Marcus decides you're done after 2.8 s of silence (6 s after a trailing
"and", "um", ...; `src/lib/turnTaking.ts`). Pausing to think gets you cut off; finishing
crisply leaves a dead gap. While his reply is generated there is silence for several
seconds. And the mic is off while he talks, so you can't interrupt him.

## What changes

### 1. Smart end of turn (Deepgram Flux)

- `useDeepgramSTT` connects to Flux first:
  `wss://api.deepgram.com/v2/listen?model=flux-general-en&eot_threshold=0.7&eot_timeout_ms=5000`
  plus the same keyterms as today. Audio stays WebM/Opus from `MediaRecorder` (Flux reads
  the container, so no `encoding`/`sample_rate`), sent in 100 ms chunks (Flux asks for ~80 ms).
- Flux sends `TurnInfo` messages with an `event` (`StartOfTurn`, `Update`, `EndOfTurn`) and
  the turn's `transcript`. The hook shows `transcript` live and, on `EndOfTurn` with a
  non-empty transcript, calls `onTurnEnd(transcript)`.
- The hook reports `semantic: true` while it's on Flux. The interview page then sends the
  answer on `onTurnEnd` and does **not** run the silence timer.
- `eot_timeout_ms=5000`: after 5 s of silence Flux ends the turn even if unsure, so a
  candidate who stops mid-sentence is never stuck.
- Finished turns are kept, like Nova-3's phrases. `onTurnEnd(text)` gets everything since
  the last used turn and returns true when it used the text (sent it or threw it away);
  false (voice off, composer locked) keeps it and the next turn is added to it.
- Messages that arrive after stop or release are ignored, so a `CloseStream` flush can't
  send half an answer.
- Video mode also sends on Flux end of turn (no backchannel, no barge-in).

### 2. Fallbacks (the live site must not break)

1. Flux socket doesn't open in 3 s or errors on connect (unknown param, token not
   accepted on `/v2`, network) → the same `start()` tries Nova-3 exactly as today
   (`semantic: false`, silence timer as today). Once Flux fails, the session stays on
   Nova-3.
2. Nova-3 fails too → browser recognizer, as today.
3. Flux socket drops mid-answer → keep what was heard, mic shows off (as today).

### 3. Instant backchannel ("Mm-hm")

- Right after a voice answer is sent during the questions stage (`phase === "question"`),
  play one short pre-recorded clip in Chris's voice: "Mm-hm.", "Mm.", "Right.". Never the
  same clip twice in a row. Not "Okay" (Marcus's replies often start with it) and never
  anything that sounds like praise.
- Not in warmup/background/closing (a "Mm-hm" to "I'm good, how are you?" is odd), not
  for coding events (check-in, Submit), not in video mode (Tavus has its own voice; 2d).
- Clips are static files in `public/backchannel/` loaded by a new `useBackchannel` hook.
  They're made once by `backend/scripts/make_backchannel_clips.py` through the existing
  ElevenLabs client (about 20 characters, well under a cent; run only with Karthik's OK).
  If a clip is missing or can't play, nothing happens: no error, no browser-voice substitute.

### 4. Barge-in (interrupt Marcus)

- On Flux only. While Marcus is speaking (voice-only mode), the mic is already listening.
  That start is Flux-only: if Flux isn't available it opens nothing (no Nova-3, no browser
  recognizer) and the mic opens as usual when he finishes.
- `isRealInterruption(heard, marcusLine)` in `turnTaking.ts` decides: at least 2 words heard,
  and at least 2 of them are not words in the line Marcus is saying (so his own voice
  leaking from the speakers, a cough or a lone "mm" never stop him).
- Barge-in only stops the ElevenLabs voice. The browser's OS voice isn't echo-cancelled, so
  the mic would hear Marcus as the candidate; with it he is never cut off mid-line.
- On a real interruption: stop his voice at once (`tts.cancel()`), keep listening, and the
  candidate's turn is sent on `EndOfTurn` as usual. The interrupted message stays in the
  transcript as written.
- Overlap rule: a turn that overlapped his speech (it ends while he speaks, or words were
  heard while he spoke even if it ends just after) is thrown away unless it's a real
  interruption. That catches his own voice leaking back and a "mm-hm".
- Fallback modes (Nova-3, browser) keep today's behaviour: the mic opens after he finishes.
- Video mode is unchanged (Tavus handles its own turn-taking; 2d).

## Out of scope

- Starting Marcus's reply early on `EagerEndOfTurn` (B in chat): each false alarm is a
  wasted Claude call. Revisit after measuring.
- A server-side voice pipeline (LiveKit/Pipecat): needs an always-on server.
- Any backend or prompt change, any change to grading.

## Cost

- Building and testing: $0 (vitest, pytest, Playwright demo mode). No Bedrock.
- Deepgram: Flux about $0.0065 to $0.0077 a minute (third-party listings). With the mic on
  while Marcus talks, about $0.20 for a 30-minute interview instead of about $0.10.
- One-time clips: ElevenLabs, about 20 characters. Ask first.
- Live check (ask first): about 10 minutes of talking through Flux, about $0.10 Deepgram;
  it verifies keyterms and the browser token on `/v2`, which the docs don't confirm.

## Testing

- `turnTaking.test.ts`: `isRealInterruption` (echo of Marcus's line, one word, "mm",
  2 new words, punctuation and case).
- `useDeepgramSTT.test.ts` (fake WebSocket): Flux URL and keyterms; `Update` shows text;
  `EndOfTurn` calls `onTurnEnd` once with the turn text; empty `EndOfTurn` ignored;
  `semantic` true on Flux; Flux fails to open → Nova-3 URL, `semantic` false; Nova-3 path
  unchanged (existing tests still pass).
- `useBackchannel.test.ts`: never the same clip twice in a row; play failure is silent.
- Interview page (vitest with mocked hooks): Flux turn end sends the answer, no silence
  timer on Flux; silence timer still sends in fallback; backchannel only in question phase,
  voice-only; real interruption cancels the voice; non-interruption turn during his speech
  is not sent.
- All existing tests and the 8 Playwright tests still pass.
