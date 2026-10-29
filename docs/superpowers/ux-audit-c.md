# UX audit, part C: Results, SessionReview, VerdictCard, RubricBar, QuestionMeta

Audited 2026-10-29 against the 10 heuristics, the tone rules and the accessibility
baseline in `specs/2026-10-29-ux-heuristics-pass-design.md`. Each finding names the
fix applied in this pass, or why it was left.

## Tone rules

| # | Where | Finding | Fix |
|---|---|---|---|
| T1 | Results hero | Opens on a verdict slogan ("This wouldn't survive yet.") and a 6xl number, painted in the fail colour with a fail-coloured glow. Gloomy, number-first. | h1 is now the plain sentence "You held up on N of M answers.", followed by one "next thing to work on" line (top weak spot from this session, else the question type that slipped most). Glow uses survive or accent, never fail. |
| T2 | Results hero | Two big numbers (survived, SESSION AVG) plus the trend chart above the fold. | Count lives in the sentence; average is one small supporting line. |
| T3 | Results "Saved to memory" | Bordered card with a warning-coloured border and warning icon by default; raw tags (`vague-impact`) and "seen 3x". | Unboxed section titled "Next to work on", humanized tags, "Came up N times", neutral colour. |
| T4 | VerdictCard | Fail-coloured 3px edge on every failing card; nested bordered boxes for transcript and coach. | Edge removed. Transcript and coach panel use a hairline left rule instead of boxes; only the code block keeps a box. |
| T5 | VerdictCard | Rubric bars always shown between the reasoning and the tags, competing with the verdict. | Order is now verdict, reasoning, "What you said", "Next to work on", then scores behind a "Details" disclosure. |
| T6 | VerdictCard | Weak tags shown raw at the bottom (`no-edge-cases`). | Humanized and labelled "Next to work on". |
| T7 | Results CTA | Centered boxed CTA, "Start session 2" (wrong after session 2). | Unboxed, left aligned, "Start your next interview". |

## Heuristics

1. **System status**: SessionReview loading skeleton had no text for screen readers; coach loading used a spinner and an all-caps "REWORKING YOUR ANSWER INTO A 5/5". Fixed: `role="status"` with words on both; coach loading text is "Writing a stronger version of your answer".
2. **Real-world match**: "rubric", "5/5", "SESSION AVG", raw tags, "Planner will weight these higher". Fixed: plain words throughout; rubric keys go through `humanizeTag` (RubricBar's hand-kept label map deleted).
3. **User control**: SessionReview error and not-found states were dead ends (only the small top-right link). Fixed: each offers an action (Try again, Back to your dashboard). Results keeps Exit, now a 44px target.
4. **Consistency**: Results and SessionReview showed the survive count differently ("2/3 survived" coloured vs big number). Fixed: both use the same takeaway sentence and the same "Answer-by-answer" section. One primary (accent fill) and one secondary (outline) button style.
5. **Error prevention**: nothing destructive on these pages. No change.
6. **Recognition**: SessionReview h1 was only the date; the outcome needed reading the cards. Fixed: date moves to the eyebrow, h1 is the takeaway. Question prompt stays visible on each card.
7. **Efficiency**: the coach ("what a strong answer sounds like") was hidden behind "REVIEW YOUR ANSWER" then a tab. Fixed: "Show me a strong answer" is a direct button on every card with an answer.
8. **Minimalism**: removed the verdict edge, the warning card border, the second big number, the boxed CTA, duplicated chrome.
9. **Error recovery**: SessionReview showed the raw `Error.message`. Fixed: plain sentence plus Try again (refetches). Coach error now says what to do and has a Retry button with a 44px target.
10. **Help**: nothing explained what "would survive" means. Fixed: one line under "Answer-by-answer" on both pages.

## Accessibility

- No visible focus rings on any button on these pages. Fixed: `focus-visible` ring on every interactive element in part C.
- Touch targets were 20-28px tall (EXIT, DASHBOARD, REVIEW YOUR ANSWER, RETRY, tab buttons). Fixed: `min-h-11` (44px).
- Disclosures had no `aria-expanded`. Fixed on "Your answer", "Show me a strong answer" and "Details".
- Toggle tabs had no pressed state for assistive tech. Fixed with `aria-pressed`.
- Low-contrast `text-fog` (#6b6b78 on #0a0a0c, about 3.8:1) used for real content (meta, empty copy, error sub-text). Moved to `text-mist` (about 7:1); fog kept only for decorative labels like "Q1".
- Headings: SessionReview jumped from h1 to card content with no h2. Fixed: "Answer-by-answer" h2 on both pages, each verdict is an h3.
- Motion: framer animations ignored `prefers-reduced-motion` (the global CSS rule only covers CSS animations). Fixed: pages wrap in `MotionConfig reducedMotion="user"`. RubricBar animated `width`; now animates `scaleX`.
- 375px: the verdict pill and Q label wrapped awkwardly; the CTA row centered. Rows now wrap left-aligned; no fixed widths over 110px.

## Left as is

- `QuestionMeta.tsx` (`TypeChip`, `DifficultyMeter`, `WeightedTag`): `TypeChip` is fine. `WeightedTag` uses warning plus a pulsing dot, but it is rendered only on the Interview page (part B owns its usage) and it is genuinely "this question targets your weak spot", so the colour is earned. `DifficultyMeter` gained an `aria-label` (it only had `title`).
- Results redirects to /setup when there is nothing to show: that is a stale-URL guard, not a user-facing empty state.
- TrendChart internals belong to part D.
