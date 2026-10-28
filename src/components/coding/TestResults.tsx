import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { ArrowClockwise, CaretRight, CheckCircle, CircleNotch, Timer, WarningCircle, XCircle } from "@phosphor-icons/react";
import type { RunOutcome, TestResult } from "@/lib/coding/types";
import type { RunnerStatus } from "@/hooks/usePythonRunner";
import type { CodingProblem } from "@/hooks/useCodingProblem";
import { describeError, designCalls, formatValue } from "./format";

export interface ShownRun {
  outcome: RunOutcome;
  kind: "run" | "submit";
  seq: number; // new per run, so rows re-enter and expansion resets
}

interface Props {
  status: RunnerStatus;
  progress: string;
  /** Python has been ready at least once in this tab. */
  loadedBefore: boolean;
  run: ShownRun | null;
  problem: CodingProblem;
  onRetry: () => void;
  shortcut: string;
}

const EASE = [0.16, 1, 0.3, 1] as const;
const LOAD_FAILED = "Couldn't load Python. Check your connection and retry.";
const TIMED_OUT = "Stopped after 5 seconds — this usually means an infinite loop. Your code is safe; try again.";

const passCount = (rows: TestResult[]) => rows.filter((r) => r.passed).length;

function split(rows: TestResult[], visibleCount: number) {
  return { visible: rows.filter((r) => r.index < visibleCount), hidden: rows.filter((r) => r.index >= visibleCount) };
}

export function TestResults({ status, progress, loadedBefore, run, problem, onRetry, shortcut }: Props) {
  const headingId = useId();
  const outcome = run?.outcome;
  const loadError = outcome?.kind === "results" ? outcome.results.find((r) => r.index < 0) : undefined;
  const loading = status === "loading" && outcome?.kind !== "timeout";
  const loadingLine = loadedBefore ? "Loading Python…" : "Loading Python (first time only, ~10 MB)…";

  let body: ReactNode;
  let announce = "";
  if (status === "error") {
    announce = LOAD_FAILED;
    body = (
      <Notice icon={<WarningCircle size={18} weight="fill" />} text={LOAD_FAILED}>
        <button
          onClick={onRetry}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-bright px-4 font-sans text-[14px] text-chalk tactile transition-colors hover:border-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ArrowClockwise size={16} weight="bold" />
          Retry loading Python
        </button>
      </Notice>
    );
  } else if (loading) {
    announce = loadingLine;
    body = (
      <div>
        <p className="flex items-center gap-2.5 font-sans text-[14px] text-chalk">
          <CircleNotch size={16} weight="bold" className="animate-spin text-accent" aria-hidden />
          {loadingLine}
        </p>
        {progress && <p className="mt-1.5 pl-[26px] font-mono text-[11px] tracking-wide text-mist">{progress}</p>}
      </div>
    );
  } else if (!outcome) {
    body = (
      <div className="max-w-[60ch] font-sans text-[14px] leading-relaxed text-mist">
        <p>
          Run your code against the examples with Run (<Kbd>{shortcut}</Kbd>). Submit runs the hidden tests too.
        </p>
        {status === "idle" && !loadedBefore && (
          <p className="mt-2 text-[13px]">The first run loads Python in your browser (about 10 MB, first time only).</p>
        )}
      </div>
    );
  } else if (outcome.kind === "timeout") {
    announce = TIMED_OUT;
    body = <Notice icon={<Timer size={18} weight="bold" />} text={TIMED_OUT} />;
  } else if (outcome.kind === "error") {
    announce = outcome.message;
    body = <Notice icon={<WarningCircle size={18} weight="fill" />} text={outcome.message} mono />;
  } else if (loadError) {
    const { text } = describeError(loadError.error ?? "The code didn't load", true);
    announce = text;
    body = (
      <Notice icon={<WarningCircle size={18} weight="fill" />} text={text} mono>
        {loadError.stdout && <Stdout text={loadError.stdout} />}
      </Notice>
    );
  } else {
    const { visible, hidden } = split(outcome.results, problem.visibleTestCount);
    announce = `${passCount(visible)} of ${visible.length} examples passed.`;
    if (hidden.length) announce += ` Hidden tests: ${passCount(hidden)} of ${hidden.length} passed.`;
    body = <ResultList key={run.seq} rows={outcome.results} problem={problem} />;
  }

  const running = status === "running";
  if (running) announce = "Running your code…";

  return (
    <section aria-labelledby={headingId} className="flex min-h-0 flex-1 flex-col bg-ink">
      <header className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <h2 id={headingId} className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">
          Test results
        </h2>
        {run && !loading && status !== "error" && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-mist">
            {run.kind === "submit" ? "Submitted · all tests" : "Run · examples"}
          </span>
        )}
      </header>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
      <div
        aria-busy={running}
        className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 transition-opacity duration-200 ${running ? "opacity-45" : ""}`}
      >
        <div className="max-w-[720px]">{body}</div>
      </div>
    </section>
  );
}

function ResultList({ rows, problem }: { rows: TestResult[]; problem: CodingProblem }) {
  const reduced = useReducedMotion();
  const { visible, hidden } = split(rows, problem.visibleTestCount);
  const firstFail = visible.find((r) => !r.passed)?.index;
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set(firstFail === undefined ? [] : [firstFail]));
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(i)) next.add(i);
      return next;
    });

  const allPass = passCount(visible) === visible.length;
  const hiddenPassed = passCount(hidden);
  const enter = (i: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: reduced ? { duration: 0 } : { duration: 0.22, ease: EASE, delay: i * 0.04 },
  });

  return (
    <div>
      {/* Both totals up top, so a Submit's hidden result is visible without scrolling. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-2 px-3 font-mono text-[13px] text-chalk">
        <p className="flex items-center gap-2.5" aria-hidden>
          <PassIcon passed={allPass} />
          <span>
            <Count value={passCount(visible)} /> of {visible.length} examples passed
          </span>
        </p>
        {hidden.length > 0 && (
          <motion.p {...enter(0)} className="flex items-center gap-2.5" aria-hidden>
            <PassIcon passed={hiddenPassed === hidden.length} />
            <span>
              Hidden tests: <Count value={hiddenPassed} /> of {hidden.length} passed
            </span>
          </motion.p>
        )}
      </div>
      <ul className="space-y-1 border-t border-line pt-2">
        {visible.map((r, i) => (
          <motion.li key={r.index} {...enter(i + 1)}>
            <TestRow result={r} problem={problem} open={open.has(r.index)} onToggle={() => toggle(r.index)} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

function TestRow({ result, problem, open, onToggle }: { result: TestResult; problem: CodingProblem; open: boolean; onToggle: () => void }) {
  const detailId = useId();
  const label = (
    <>
      <PassIcon passed={result.passed} />
      <span className="text-chalk">Example {result.index + 1}</span>
      <span className="ml-auto text-[11px] uppercase tracking-[0.14em] text-mist">{result.passed ? "Passed" : "Failed"}</span>
    </>
  );
  const rowClass = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left font-mono text-[13px]";
  if (result.passed && !result.stdout) return <div className={rowClass}>{label}<span className="w-4" /></div>;

  return (
    <>
      <button
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className={`${rowClass} transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent`}
      >
        {label}
        <CaretRight size={14} weight="bold" className={`text-mist transition-transform duration-200 ${open ? "rotate-90" : ""}`} aria-hidden />
      </button>
      {open && (
        <motion.div
          id={detailId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="mx-3 mb-2 mt-1 rounded-lg border border-line bg-surface px-4 py-3"
        >
          <Detail result={result} problem={problem} />
        </motion.div>
      )}
    </>
  );
}

interface DesignArgs {
  ops: string[];
  args: unknown[][];
}
const isDesignArgs = (v: unknown): v is DesignArgs =>
  typeof v === "object" && v !== null && Array.isArray((v as DesignArgs).ops) && Array.isArray((v as DesignArgs).args);

function Detail({ result, problem }: { result: TestResult; problem: CodingProblem }) {
  const args = problem.tests[result.index]?.args;
  const error = result.error ? describeError(result.error, false).text : null;
  const design = problem.kind === "design" && isDesignArgs(args);

  return (
    <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-4 gap-y-2 font-mono text-[13px] leading-relaxed">
      {design ? (
        <div className="col-span-2">
          <DesignTable rows={designCalls(args, asList(result.expected), asList(result.got))} />
        </div>
      ) : (
        <>
          <Field term="Input">{problem.examples[result.index]?.input ?? formatValue(args)}</Field>
          <Field term="Expected">{formatValue(result.expected)}</Field>
          {!error && <Field term="Got">{formatValue(result.got)}</Field>}
        </>
      )}
      {error && <Field term="Error" tone="text-fail">{error}</Field>}
      {result.stdout && (
        <Field term="Output">
          <Stdout text={result.stdout} bare />
        </Field>
      )}
    </dl>
  );
}

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function DesignTable({ rows }: { rows: ReturnType<typeof designCalls> }) {
  return (
    <table className="w-full table-fixed border-collapse text-left">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.14em] text-mist">
          <th className="w-5 pb-1.5 font-normal"><span className="sr-only">Match</span></th>
          <th className="pb-1.5 font-normal">Call</th>
          <th className="w-[22%] pb-1.5 font-normal">Expected</th>
          <th className="w-[22%] pb-1.5 font-normal">Got</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className={r.ok ? "text-chalk" : "text-fail"}>
            <td className="py-0.5 align-top">
              {!r.ok && <XCircle size={13} weight="fill" className="mt-[3px]" role="img" aria-label="Doesn't match" />}
            </td>
            <td className="break-words py-0.5 pr-3 align-top">{r.call}</td>
            <td className="break-words py-0.5 pr-3 align-top">{r.expected}</td>
            <td className="break-words py-0.5 align-top">{r.got}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Field({ term, tone = "text-chalk", children }: { term: string; tone?: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-mist">{term}</dt>
      <dd className={`min-w-0 whitespace-pre-wrap break-words ${tone}`}>{children}</dd>
    </>
  );
}

function Stdout({ text, bare = false }: { text: string; bare?: boolean }) {
  const pre = <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] text-chalk">{text.trimEnd()}</pre>;
  if (bare) return pre;
  return (
    <div className="mt-3">
      <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-mist">Output</p>
      {pre}
    </div>
  );
}

function Notice({ icon, text, mono = false, children }: { icon: ReactNode; text: string; mono?: boolean; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-fail/30 bg-fail/[0.06] px-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-fail" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`break-words text-chalk ${mono ? "font-mono text-[13px] leading-relaxed" : "font-sans text-[14px] leading-relaxed"}`}>
            {text}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
}

function PassIcon({ passed }: { passed: boolean }) {
  return passed ? (
    <CheckCircle size={16} weight="fill" className="shrink-0 text-survive" aria-hidden />
  ) : (
    <XCircle size={16} weight="fill" className="shrink-0 text-fail" aria-hidden />
  );
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-bright bg-surface px-1.5 py-px font-mono text-[11px] text-chalk">{children}</kbd>
  );
}

/** Ticks up from 0 over 300 ms without re-rendering; instant with reduced motion. */
function Count({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const controls = animate(0, value, {
      duration: 0.3,
      ease: "easeOut",
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    return () => controls.stop();
  }, [value, reduced]);
  return (
    <span ref={ref} className="tabular-nums">
      {reduced ? value : 0}
    </span>
  );
}
