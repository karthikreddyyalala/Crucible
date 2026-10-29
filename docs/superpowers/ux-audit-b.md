# UX audit, part B: the interview screen

Scope: `src/pages/Interview.tsx`, `ChatTranscript`, `InterviewerAvatar`, `TavusAvatar`,
`TavusCallOverlay`, `src/components/coding/*`. Heuristic numbers follow the brief
(`docs/superpowers/specs/2026-10-29-ux-heuristics-pass-design.md`). Voice turn-taking and what
is sent to the backend are unchanged.

| Area | Heuristic | Problem | Fix |
| --- | --- | --- | --- |
| Interview header | 1 Status | Status in words only appeared with voice on (`VOICE ON`, `INTERVIEWER SPEAKING…`). Typing users saw three dots and a disabled box, nothing saying what was happening. | One status line, always visible and `aria-live`: "Your turn.", "Marcus is thinking…", "Marcus is speaking.", "Listening…", "Running your code…", "Saving your results…", "Interview complete. Opening your results." |
| Top bar progress | 1 Status, 2 Real world | `Q1 / 2`, `INTRO`, `WRAP-UP` read like internal codes. | "Question 1 of 2", "Introductions", "Your questions". |
| Voice toggle | 1 Status, 6 Recognition | Pill said `VOICE` in both states; only colour showed on/off. 28px tall. | Says "Voice on" / "Voice off", `aria-pressed`, 44px target, focus ring. Text hides under 640px (icon + label stay). |
| Leaving | 3 Control | Clicking the Crucible logo mid-interview dropped the session with no warning. | Links in the top bar ask first ("Leave the interview?"), with Stay focused by default and Escape to stay. |
| Video connecting overlay | 3 Control | Full-screen "Connecting…" with no way out if the video room hangs. | "Continue without video" button: Marcus carries on by voice. |
| Video call overlay | 3 Control, 4 Standards | No Escape; not announced as a dialog; uppercase captions. | `role="dialog"`, Escape minimizes, status caption in words ("Marcus is thinking…"), focus rings. |
| Turn error banner | 9 Errors | Mono uppercase banner, action always `RETRY` even when the only thing it did was hide the banner. | Plain sentence; action says what it does: "Send again" (resends the restored draft), "Try again" (results save), or "Dismiss". Says the answer is still in the box. |
| Video failed notice | 9 Errors, 8 Minimal | Fixed toast that never went away, floating over the transcript. | Inline notice under the header with Dismiss. |
| Restore notice | 4 Consistency | `SESSION RESTORED.` shouted in mono caps. | "Session restored. You're right where you left off." as a status. |
| Composer hint | 7 Efficiency | `⌘/CTRL + ENTER` shown to everyone; shortcut not exposed to assistive tech. | Platform-correct ("⌘ Enter" or "Ctrl Enter"), `aria-keyshortcuts` on the box, sentence case. |
| Composer placeholder | 4 Consistency | "Interviewer is thinking…" while every other line says Marcus. | "Marcus is thinking…". |
| End interview | 4 Consistency | `NO QUESTIONS · END INTERVIEW` underlined mono, 14px target. | "No questions, end the interview" quiet button, 44px target, focus ring. |
| First time in voice mode | 10 Help | Hands-free turn-taking (listens after he speaks, sends on a pause, can interrupt on Flux) wasn't explained anywhere. | One-time dismissible hint when voice is first turned on. |
| First time in the coding round | 10 Help | Approach first, Run vs Submit and their shortcuts were only in tooltips. | One-time dismissible hint above the editor naming both and their shortcuts. |
| Coding brief (under 1024px) | 8 Minimal | Two bordered boxes stacked inside the transcript. | Problem sits on a hairline; the larger-screen note is a plain line. |
| Transcript labels, hints | A11y contrast | Small text in `fog` (#6b6b78 on #0a0a0c, under 4.5:1). | Text moved to `mist`; `fog` kept for non-text decoration. |
| Header avatar button | A11y | Expand-to-call button had a title but no accessible name or focus ring. | `aria-label` and focus ring. |
| Animations | 8, A11y | Perpetual avatar, waveform and dot loops ignored `prefers-reduced-motion`. | Page wrapped in `MotionConfig reducedMotion="user"`. |
| Timer at 375px | A11y, 375px | Coding-question timer pushed the top bar past 375px on phones. | Timer hidden under 640px (the editor isn't shown there anyway). |
| Page heading | A11y headings | Non-coding questions had no heading at all. | Screen-reader `h1` "Interview with Marcus" (coding keeps the problem title as `h1`). |

## Left as is, on purpose

- Mic permission or transcriber errors: the speech hooks don't expose an error, and this pass
  doesn't change hook logic. The mic button simply stays off; worth a hook change later.
- Reload or tab close mid-interview: no `beforeunload` prompt, because the session autosaves and
  restores on reload (the "Session restored" path), so nothing is lost.
- Language switch and toolbar buttons are desktop-only (the editor needs 1024px), so they keep
  their compact size.
- Marcus's lines, grading, turn-taking and backend payloads are untouched.
