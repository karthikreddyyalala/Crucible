# UX pass: the 10 usability heuristics, across the whole app

Date: 2026-10-29. Branch `feat/ux-heuristics-pass` (built on `feat/phase-2d-javascript`).
Asked by Karthik: apply Nielsen's 10 heuristics everywhere; make it inviting and
interactive, clean, and not overwhelming ("not those gloomy cards, not walls of numbers").
Also includes Phase 3's first piece: weak spots that visibly shrink.

## Hard limits (CLAUDE.md, unchanged)

Dark theme only. Syne headings, JetBrains Mono for data/scores. Palette bg #0A0A0C, accent
#4A7CFF, success #00D4AA, warning #FF6B3D (use the existing Tailwind tokens, don't add
new colours). No purple gradients, no emojis, no Inter. Every animation has a job and
respects `prefers-reduced-motion`. Feedback reads like a real rubric, not badges or
confetti. `wouldSurviveRealInterview` + reasoning stays the most prominent feedback.
No new dependencies unless already installed (framer-motion, phosphor icons are).
Marcus's spoken lines and the grading logic are not part of this pass.

## Tone rules (the "less gloomy" part)

- Lead with one plain-language takeaway per screen before any number ("You held up on 3 of
  5. Your system design answers are the next thing to work on.").
- Numbers support the sentence, they don't open the screen. Show at most 3 numbers above
  the fold; the rest goes behind a "Details" disclosure.
- Warning colour only for something the user can act on now, never as a card border by
  default. Weak spots are framed as "Next to work on", not failure.
- Fewer boxes: group with spacing and a hairline (`border-t`) instead of nested bordered
  cards. A card only when it's a thing you can click or a distinct object.
- Every empty state says what will appear and gives the one action that fills it.

## The 10 heuristics, as rules for this app

1. **Visibility of system status**: every wait shows what's happening in words (starting
   your interview, Marcus is thinking, running tests, saving); mic/voice state always
   visible; progress through the interview visible (stage + question n of N where known).
2. **Match with the real world**: plain words, no internal terms (no "phase", "eval",
   "rubric key", raw tags like `vague-impact` shown as-is: humanize tags to "Vague impact").
3. **User control and freedom**: clear way back/out on every page; leaving a live interview
   asks to confirm; destructive actions confirm; Escape closes overlays.
4. **Consistency and standards**: one button style per role (primary / secondary / quiet),
   same heading scale, same spacing rhythm, same wording for the same thing on every page.
5. **Error prevention**: disable or explain impossible actions before they're tried (e.g.
   Begin without a resume/JD where required, Submit while tests run).
6. **Recognition rather than recall**: show the current question, mode, level and language
   on screen; keep context visible instead of making people remember it.
7. **Flexibility and efficiency**: keyboard shortcuts that already exist are discoverable
   (a small hint), Enter to send, sensible defaults on Setup.
8. **Aesthetic and minimalist design**: cut copy and chrome that doesn't help the task;
   progressive disclosure for secondary data.
9. **Help users recognize, diagnose, recover from errors**: every error says what happened
   in plain words and offers the fix (Retry, Check your mic, Go back), never a raw message.
10. **Help and documentation**: short inline hints where people get stuck (first time on
    the coding round, voice mode, what "Would survive a real interview" means), no manual.

## Accessibility baseline (part of 4 and 8)

Visible focus rings, 44px touch targets, labels on icon buttons, contrast AA for text,
headings in order, `aria-live` for status text, works at 375px wide with no sideways scroll.

## Dashboard: weak spots that shrink (Phase 3, first piece)

- Backend: `SessionSummary.weakness_tags: list[str] = []` = sorted union of the session's
  evaluations' `weakness_tags`, filled in `SessionRecord.summary()`. Old records give `[]`.
  No new reads, no LLM calls.
- Dashboard "Next to work on": each weak spot gets a strip of dots for the last 8 sessions
  (filled where it showed up) and a label from that history: **Looks fixed** (absent from
  the last 2+ sessions), **Still showing up** (in the latest session), **New** (first seen in
  the latest). Ordered: still showing up, new, then looks fixed. Display only; Memory and
  the Planner are unchanged.
- The page opens with the one-sentence takeaway, then the trend, then weak spots and
  strengths, then past sessions.

## Ownership (parallel work)

- A: Landing, Login, Setup, Privacy, TopBar and shared presentational components
  (Wordmark, MagneticButton, KineticHeadline, Reveal, Atmosphere).
- B: Interview page, ChatTranscript, InterviewerAvatar, Tavus overlays, coding components.
- C: Results, SessionReview, VerdictCard, RubricBar, QuestionMeta.
- D: Dashboard, TrendChart, backend `SessionSummary.weakness_tags`, a shared
  `src/lib/humanize.ts` (`humanizeTag("vague-impact") => "Vague impact"`), which C may also
  need: C creates nothing with that name; it imports from `@/lib/humanize` and the merge
  keeps D's file (C may add a temporary identical copy if its tests need it).

## Cost and testing

$0: no paid calls; mocked tests only. Existing tests are updated where copy changes, new
tests for new behaviour (labels, disclosure, confirmations, error recovery, shrinking
status). `npm run lint`, vitest, pytest, `npm run build`, Playwright 8/8 green.
