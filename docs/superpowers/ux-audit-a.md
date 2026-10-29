# UX audit, part A: Landing, Login, Setup, Privacy, shared chrome

Audited 2026-10-29 against the brief in `specs/2026-10-29-ux-heuristics-pass-design.md`
(the 10 heuristics, tone rules, accessibility baseline). H1-H10 = the heuristics, A11y =
accessibility baseline, Tone = tone rules.

## Landing

| Heuristic | Problem | Fix |
|---|---|---|
| H2 | Copy leans on internal terms: "five-agent pipeline", "Evaluator tags vague-impact", "Memory Agent", "Planner", "ADAPTIVE MULTI-AGENT INTERVIEWER". | Say what happens to the user in plain words; no agent names, no raw tags. |
| H8 / Tone | Endless marquee band repeats the hero copy and moves forever without a job. | Removed. |
| H8 / Tone | "How it remembers" is three equal bordered cards with arrows (the banned 3-card row). | A numbered list separated by hairlines, no boxes. |
| Tone | The comparison section is two heavy bordered cards with glows; "OTHER TOOLS" in the warning colour (warning used for nothing the user can act on). | Two columns split by a hairline, warning colour dropped. |
| H2 | The hero demo says "REC" and "live session", which reads like the page is recording. | Labelled "Example exchange". |
| H3 | No way to reach your progress or sign in from the landing page. | "Your progress" link in the nav. |
| A11y | Primary CTAs nest a `<button>` inside a `<Link>` (two tab stops, invalid HTML). | `MagneticButton` takes a `to` prop and renders a single link. |
| A11y | Nav, footer and section links have no visible focus ring; nav CTA under 44px tall. | Focus rings on every link, 44px targets. |
| Tone | Footer tagline "NO MERCY" and hero "fights back" read as hostile. | Footer tagline removed; copy says it asks follow-ups. |

## Login

| Heuristic | Problem | Fix |
|---|---|---|
| A11y | Labels are not tied to their inputs (no `htmlFor`/`id`). | Each field gets an id and a linked label. |
| H7 | Not a form: Enter does nothing, password managers can't help (no `autocomplete`). | Real `<form>` with submit on Enter, `autocomplete` per field, `inputMode` for codes. |
| H5 | Empty or malformed email can be submitted, failing at the server. | Native `required` and `type=email` stop it before the request. |
| H9 | Unknown errors show the raw provider message; known errors never offer the fix. | Plain fallback message; "No account" offers Create one, "Incorrect password" offers Reset password, "Code expired" offers Send a new code. Error is `role="alert"`. |
| H1 | "Resend code" gives no feedback; button says only "Working…". | "Code sent to ..." confirmation (or error); busy label names the action ("Signing in…"). |
| H10 | Password rules only live in the placeholder, which disappears on typing. | Helper line under the new-password field. |
| H8 | A second grain overlay renders on top of the app-wide one. | Removed the duplicate `Atmosphere`. |
| H3 | Back to sign in exists for reset, but signup/confirm have no way out besides the logo. | "Back to sign in" from the confirm step too. |

## Setup

| Heuristic | Problem | Fix |
|---|---|---|
| H2 | Intro and side panel explain internals ("Intake Agent", "Planner", "THE PIPELINE", "resume-to-JD gaps"). | Plain "What happens next" steps. |
| H2 / Tone | Memory banner shows raw tags (`vague-impact`) in a warning-bordered box labelled "MEMORY ACTIVE · TARGETING". | "This session leans on what you're working on: Vague impact, ..." in quiet text, no warning border. |
| H5 / H9 | Begin is disabled by hidden thresholds (200 / 100 characters) with one vague hint. | Hint names exactly what is missing ("Add your resume", "The job description looks short") and is linked to the button. |
| H5 / H3 | "Use sample" and "Upload PDF" silently overwrite text the user pasted. | Ask before replacing non-empty text. |
| H9 | Start failures show the raw message with no way forward. | Alert with the message plus a Try again button; inputs are kept. |
| H1 | While starting, only the button label changes and the side panel pulses. | Polite live status line says what is happening. |
| A11y | Upload/sample buttons and level pills are under 44px tall; Begin row overflows at 375px with the hint beside it. | 44px targets; hint stacks under the button. |
| H4 | "résumé" on Privacy vs "resume" here. | "resume" everywhere. |

## Privacy

| Heuristic | Problem | Fix |
|---|---|---|
| H2 | Says "We do not require an account" and data is keyed to an anonymous browser id, but signed-in builds require an account and key data to it. | Says both cases plainly. |
| H2 | Shows a raw tag (`"no-edge-cases"`). | "No edge cases". |
| H3 | No way back other than the logo. | "Back to Crucible" link at the end. |

## Shared chrome

| Component | Heuristic | Problem | Fix |
|---|---|---|---|
| TopBar | H3 | From Setup/Privacy there is no route to your progress. | "Your progress" link (hidden on the dashboard itself and when a page supplies its own right-side content). |
| TopBar | A11y / H4 | "SIGN OUT" has no focus ring, a tiny target, and shouts. | Sentence case, focus ring, 44px target. |
| Wordmark | A11y | No visible focus ring on the home link. | Focus ring. |
| MagneticButton | A11y | No focus ring of its own; magnetic pull ignores reduced motion. | Built-in focus ring; pull and spring off under `prefers-reduced-motion`. |
| KineticHeadline, Reveal | Brief | JS (framer) animations ignore `prefers-reduced-motion` (the CSS rule only covers CSS). | Render static when reduced motion is on. |
| Atmosphere | - | Fixed, pointer-events-none, aria-hidden. No problem. | No change. |
