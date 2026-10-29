# UX audit, part D: Dashboard and TrendChart

Scope: `src/pages/Dashboard.tsx`, `src/components/TrendChart.tsx`, `src/lib/memoryStats.ts`,
`src/lib/humanize.ts`, `SessionSummary.weaknessTags` (backend + TS + mock).

## What was wrong, by heuristic

| # | Heuristic | Finding before | Change |
|---|-----------|----------------|--------|
| 1 | System status | Skeleton had no text for screen readers. | `role="status"` with "Loading your progress". |
| 2 | Real-world match | Raw tags (`vague-impact`), "rubric score", "MOMENTUM", "seen 4x". | `humanizeTag` everywhere (weak spots, strengths, takeaway); plain labels ("Latest average", "Since last session", "3 of 5 held up"). |
| 3 | Control and freedom | Error state had only Retry. | Retry plus "Start a session" so the page is never a dead end. |
| 4 | Consistency | Mode labels in Title Case ("System Design") unlike sentence case elsewhere; three different card styles. | Sentence case; one section pattern (heading, one-line hint, hairline list). |
| 5 | Error prevention | Nothing to prevent here; no destructive actions on this page. | None needed. |
| 6 | Recognition over recall | Weak spots showed a count with no history; you had to remember whether one was getting better. | Per weak spot: dots for the last 8 sessions (oldest left) and a status label (Still showing up / New / Looks fixed). The CTA says what the next session leans on. |
| 7 | Flexibility | Primary action sat at the very bottom after every section. | "Start session N" sits under the takeaway, above the fold. |
| 8 | Minimalist design | Three stat cards, two bordered panels (one in warning orange), a bordered list and a bordered CTA panel: six boxes, a wall of numbers. | One takeaway sentence, at most three supporting numbers, sections split by `border-t` hairlines, no cards. Past sessions show 5 with "Show all N sessions". |
| 9 | Error recovery | Error showed the raw message (`Request failed (502)`). The "Try again" button only reset state to loading and never refetched (the effect had no dependency to re-run), so it spun forever. | Plain message and likely cause; Retry now bumps an attempt counter that re-runs the fetch. Covered by a test. |
| 10 | Help | "Where you keep slipping" did not say how it's used. | One-line hint: "Your next session asks more about these. Each dot is a recent session, oldest on the left." |

## Tone

- Opens with one sentence: "You held up on 3 of 5 answers last session. Vague impact is the next thing to work on." Built by the pure `dashboardTakeaway` so it's tested.
- "Where you keep slipping" with an orange border became "Next to work on" with no border. Warning colour now marks only "Still showing up", the one thing to act on. "Looks fixed" is success green, "New" is accent.
- Past-session scores no longer turn orange for low ratios (not actionable).
- Empty states say what will appear and give the one action that fills it.

## Accessibility

- Focus rings (`focus-visible:ring-accent` with offset) on every button, including session rows and the disclosure.
- Session rows and buttons are 44px or taller.
- Small text moved from `fog` (#6b6b78, about 3.7:1 on the background, fails AA) to `mist` (about 7:1). `fog` remains only on decorative strokes.
- Headings in order (h1 takeaway, then h2 per section); sections are `aria-labelledby`.
- Dot strips are `role="img"` with text like "Showed up in 3 of your last 8 sessions"; individual dots are `aria-hidden`.
- The TrendChart `aria-label` now lists the actual scores, not just "Score trend".
- Reduced motion: the page is wrapped in `MotionConfig reducedMotion="user"`; TrendChart skips the line draw and the point pop when reduced motion is on.
- At 375px wide there's no sideways scroll (checked with a throwaway Playwright run that seeded 8 sessions, then deleted). Rows wrap and session titles truncate.

## Weak spots that shrink: decisions

- Status rules live in `weakSpotStatus(dots)`: Looks fixed when absent from the last 2+ sessions; New when the latest session is its only appearance; Still showing up otherwise. A weak spot missing from only the latest session stays "Still showing up", because one clean session is too soon to call it fixed. The brief didn't cover that case.
- A weak spot that no listed session recorded (older rows from before `weaknessTags`, which come back as `[]` or missing) gets no status and no dots. It shows "Seen N times so far" from memory instead, so the page never claims "Showed up in 0 of 8" from missing data.
- Sessions are ordered oldest to newest by date. Same-day ties keep the API's order (reversed), which is the best signal available.
- "New" only looks within the last 8 sessions. A weak spot last seen 9+ sessions ago and back now reads as New. That's acceptable, because in the user's recent experience it is new.

## Not changed

- `MagneticButton`, `TopBar`, and the background are owned by part A.
- Results also uses TrendChart. Its props are unchanged, and the empty copy now reads "Your trend line starts after your first session."
- Memory Agent and Planner are untouched (display only, per the brief).
- TrendChart axis labels get small at 375px, because the SVG scales down. The aria-label and the headline numbers carry the same information, so a separate mobile chart wasn't worth it.
