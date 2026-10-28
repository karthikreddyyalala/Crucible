# Coding workspace — design guide

Source: Phase 1 spec §1.3 and §5, the ui-ux-pro-max design-system pass (style: dark
developer tool; pairing: JetBrains Mono for code + a calm sans for UI), and Crucible's
existing identity in `CLAUDE.md` and `src/styles/global.css`. Where the generic
recommendation differs from Crucible's identity (e.g. green CTA, text glow), Crucible's
identity wins.

## Principles

1. The code and the conversation are the product. Chrome stays quiet.
2. Every state has a visible next action. Nothing spins without a label; nothing fails
   without a way forward.
3. Motion explains cause and effect only (a run starts, results arrive, a stage changes).
   Calm, short, interruptible. No glow, no gradient text, no bouncing, no shimmer loops on
   idle content.

## Tokens (reuse, don't invent)

Colors from `global.css`: background `void` / `ink`, surfaces `surface` / `surface-2`,
lines `line` / `line-bright`, text `chalk` / `mist` / `fog`, accent `#4A7CFF` (primary
actions, focus), success `#00D4AA` (passed tests), warning `#FF6B3D` (failed tests, time
limit). Fail and pass always carry an icon and text, never color alone.
Type: Syne for the problem title only; Geist (`font-sans`) for statement and conversation
(16 px, line-height 1.6, max ~70 characters); JetBrains Mono for code, test values,
timers (tabular figures).
Spacing: 4/8 scale. Radius: 12 px panels, 8 px controls (matches existing UI).

## Layout (≥ 1024 px)

```
┌──────────── top bar: Q2/4 · stage Approach ▸ Code ▸ Review · 12:41 · VOICE ─────────────┐
│ LEFT (min 360, default 40%)              ┃ RIGHT (min 480)                                │
│ Two Sum  [easy] [array] [hash map]       ┃ toolbar: Python ▾(fixed) · Reset · Run ⌘⏎ ·    │
│ statement (scrolls)                      ┃          Submit                                │
│ Example 1 / 2 (mono blocks)              ┃ ┌ editor (CodeMirror, fills) ───────────────┐  │
│ ─────────── conversation ─────────────── ┃ │                                            │  │
│ MARCUS · INTERVIEWER                     ┃ └────────────────────────────────────────────┘  │
│ "Before you code — what's your plan?"    ┃ ═ drag ═ results panel (collapsible, 30%) ═    │
│ composer (mic / text / send)             ┃ Visible 2/3 ✓✓✗ · Hidden 8/10                   │
└──────────────────────────────────────────┸────────────────────────────────────────────────┘
```

- Draggable vertical divider (keyboard: focus + ←/→ by 5%), double-click resets to 40/60.
  Draggable horizontal divider between editor and results. Sizes persist in localStorage.
- Problem statement and conversation scroll independently; the composer stays pinned.
- Below 1024 px: no editor. Problem + conversation, plus a notice card: "The code editor
  needs a larger screen. You can still talk through your solution with Marcus."

## Runner states → UI

| State | Run button | Results panel | Copy |
|---|---|---|---|
| Python not loaded yet | "Run" enabled; first click loads | progress line | "Loading Python (first time only, ~10 MB)…" |
| Loading | disabled, spinner + label | progress line | "Loading Python…" |
| Ready, no runs | enabled | empty state | "Run your code against the examples with Run (⌘⏎). Submit runs the hidden tests too." |
| Running | disabled, "Running…" | previous results dimmed | — |
| Results | enabled | per-test rows | "2 of 3 examples passed" |
| Syntax / runtime error | enabled | error card with line | "SyntaxError on line 4: …" + editor line highlighted |
| Timed out | enabled | warning card | "Stopped after 5 seconds — this usually means an infinite loop. Your code is safe; try again." |
| Failed to load | "Retry loading Python" | error card | "Couldn't load Python. Check your connection and retry." |

Results rows: ✓/✗ icon + "Example 1", expand a failing row to show input · expected · got ·
stdout (mono, 13 px). Hidden tests: one summary row "Hidden tests: 8 of 10 passed" with no
inputs shown.

## Stage indicator

Three steps, Approach → Code → Review, current step accent-colored with a 2 px underline that
slides between steps (transform only, 220 ms ease-out). Screen readers get
"Stage 2 of 3: Code". Clicking a step does nothing (it reflects the interview, the
candidate doesn't navigate it).

## Motion tokens

- Enter: 220 ms, ease-out `cubic-bezier(0.16, 1, 0.3, 1)`; exit 150 ms ease-in.
- Results arrive with a 40 ms stagger per row, opacity + 6 px translate.
- Pass/fail counters tick up over 300 ms (tabular figures, no layout shift).
- Panel collapse/expand: transform/opacity, never width/height animations on the editor.
- `prefers-reduced-motion`: all of the above become instant opacity changes.

## Accessibility checklist

- Run / Submit / Reset have text labels; shortcuts shown in `title` and `aria-keyshortcuts`.
- Focus ring 2 px accent, visible on every control and both dividers.
- Results region is `aria-live="polite"`; a run announces "2 of 3 examples passed".
- Contrast ≥ 4.5:1 for all text, ≥ 3:1 for icons and dividers.
- Editor: Tab inserts indentation; Escape then Tab moves focus out (CodeMirror default
  behavior documented in the editor's tooltip).
- Touch targets ≥ 44 px for toolbar buttons.

## Copy voice

Plain, calm, specific. Say what happened and what to do next. No exclamation marks, no
"Oops!", no blame ("Your code crashed" → "Line 7 raised IndexError: list index out of
range").
