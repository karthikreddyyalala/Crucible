import type { ReactNode } from "react";
import { ArrowClockwise, ArrowCounterClockwise, CircleNotch, Keyboard, PaperPlaneRight, Play } from "@phosphor-icons/react";
import type { RunnerStatus } from "@/hooks/usePythonRunner";
import type { CodingLanguage } from "@/lib/coding/types";

export interface Shortcuts {
  run: string; // shown, e.g. "⌘⏎"
  submit: string;
  undo: string;
  runAria: string; // aria-keyshortcuts, e.g. "Meta+Enter"
  submitAria: string;
}

const LANGUAGE_NAMES: Record<CodingLanguage, string> = { python: "Python", javascript: "JavaScript" };

interface Props {
  language: CodingLanguage;
  onLanguage: (language: CodingLanguage) => void;
  status: RunnerStatus;
  /** What the in-flight run is, if any. */
  pending: "run" | "submit" | null;
  canReset: boolean;
  /** Submit as a secondary button (while the approach is still being talked through). */
  quietSubmit?: boolean;
  shortcuts: Shortcuts;
  hintId: string;
  onRun: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onReset: () => void;
}

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const BUTTON = `inline-flex h-11 items-center gap-2 rounded-lg px-4 font-sans text-[14px] font-medium tactile transition-colors disabled:cursor-not-allowed ${FOCUS}`;

export function Toolbar({
  language, onLanguage, status, pending, canReset, quietSubmit = false, shortcuts, hintId, onRun, onSubmit, onRetry, onReset,
}: Props) {
  const name = LANGUAGE_NAMES[language];
  const loading = status === "loading";
  const busy = loading || status === "running" || pending !== null;
  const failed = status === "error";
  const why = loading ? `${name} is still loading` : busy ? "Your code is running" : failed ? `${name} didn't load. Retry first` : "";

  const spinner = <CircleNotch size={16} weight="bold" className="animate-spin" aria-hidden />;
  const runLabel = loading && pending !== "submit" ? `Loading ${name}…` : pending === "run" ? "Running…" : null;

  let run: ReactNode;
  if (failed) {
    run = (
      <button onClick={onRetry} className={`${BUTTON} border border-line-bright text-chalk hover:border-mist`}>
        <ArrowClockwise size={16} weight="bold" aria-hidden />
        Retry loading {name}
      </button>
    );
  } else {
    run = (
      <button
        onClick={onRun}
        disabled={busy}
        title={busy ? why : `Run the examples (${shortcuts.run})`}
        aria-keyshortcuts={shortcuts.runAria}
        className={`${BUTTON} border border-line-bright bg-surface text-chalk hover:border-mist disabled:text-mist disabled:hover:border-line-bright`}
      >
        {runLabel ? spinner : <Play size={15} weight="fill" aria-hidden />}
        {runLabel ?? "Run"}
        {!busy && <span className="font-mono text-[11px] text-mist" aria-hidden>{shortcuts.run}</span>}
      </button>
    );
  }

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-void px-3">
      <div role="radiogroup" aria-label="Language" className="inline-flex rounded-md border border-line p-0.5">
        {(Object.keys(LANGUAGE_NAMES) as CodingLanguage[]).map((id) => (
          <button
            key={id}
            role="radio"
            aria-checked={language === id}
            disabled={pending !== null}
            onClick={() => language !== id && onLanguage(id)}
            className={`rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors disabled:cursor-not-allowed ${FOCUS} ${
              language === id ? "bg-surface-2 text-chalk" : "text-mist hover:text-chalk"
            }`}
          >
            {LANGUAGE_NAMES[id]}
          </button>
        ))}
      </div>
      <span title="Tab indents; press Esc then Tab to move focus out of the editor." className="text-mist">
        <Keyboard size={13} aria-hidden />
      </span>
      <span id={hintId} className="sr-only">
        Tab indents. Press Escape, then Tab, to move focus out of the editor. {shortcuts.run} runs the examples;{" "}
        {shortcuts.submit} submits.
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onReset}
          disabled={!canReset}
          title={canReset ? `Reset to the starter code (undo with ${shortcuts.undo})` : "Already the starter code"}
          className={`${BUTTON} text-mist hover:text-chalk disabled:opacity-40 disabled:hover:text-mist`}
        >
          <ArrowCounterClockwise size={16} weight="bold" aria-hidden />
          Reset
        </button>
        {run}
        <button
          onClick={onSubmit}
          disabled={busy || failed}
          title={busy || failed ? why : `Run every test, including hidden ones, and review with Marcus (${shortcuts.submit})`}
          aria-keyshortcuts={shortcuts.submitAria}
          className={`${BUTTON} ${
            quietSubmit
              ? "border border-line-bright text-chalk hover:border-mist disabled:text-mist"
              : "bg-accent text-void hover:bg-[#5d8aff] disabled:bg-accent/35 disabled:text-void/70"
          }`}
        >
          {pending === "submit" ? spinner : <PaperPlaneRight size={15} weight="fill" aria-hidden />}
          {pending === "submit" ? (loading ? `Loading ${name}…` : "Submitting…") : "Submit"}
        </button>
      </div>
    </div>
  );
}
