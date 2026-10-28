import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Desktop } from "@phosphor-icons/react";
import type { PlannedQuestion } from "@/types/contracts";
import type { RunOutcome } from "@/lib/coding/types";
import type { usePythonRunner } from "@/hooks/usePythonRunner";
import { useCodingProblem, type CodingProblem } from "@/hooks/useCodingProblem";
import { useSessionStore } from "@/stores/sessionStore";
import { SplitPane } from "./SplitPane";
import { ProblemPanel } from "./ProblemPanel";
import { Toolbar, type Shortcuts } from "./Toolbar";
import { CodeEditor, type CodeEditorHandle } from "./CodeEditor";
import { TestResults, type ShownRun } from "./TestResults";
import { useIdleCheckin } from "./useIdleCheckin";
import { describeError, isMac } from "./format";

type Runner = ReturnType<typeof usePythonRunner>;

const MAC = typeof navigator !== "undefined" && isMac(navigator.platform || navigator.userAgent);
const SHORTCUTS: Shortcuts = MAC
  ? { run: "⌘⏎", submit: "⌘⇧⏎", undo: "⌘Z", runAria: "Meta+Enter", submitAria: "Meta+Shift+Enter" }
  : { run: "Ctrl+Enter", submit: "Ctrl+Shift+Enter", undo: "Ctrl+Z", runAria: "Control+Enter", submitAria: "Control+Shift+Enter" };

const EASE = [0.16, 1, 0.3, 1] as const;

interface Props {
  question: PlannedQuestion;
  runner: Runner;
  /** The conversation column (header, transcript, composer) from the interview page. */
  conversation: ReactNode;
}

/** ≥ 1024 px: problem and conversation on the left, editor and results on the right. */
export function CodingWorkspace({ question, runner, conversation }: Props) {
  const { status, problem, retry } = useCodingProblem(question.exemplarId);
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.22, ease: EASE }}
      className="flex min-h-0 flex-1"
    >
      <SplitPane
        axis="x"
        storageKey="crucible.coding.split.main"
        defaultPct={40}
        minFirst={360}
        minSecond={480}
        label="Resize problem and code panes"
        className="flex-1"
        first={
          <SplitPane
            axis="y"
            storageKey="crucible.coding.split.left"
            defaultPct={50}
            minFirst={120}
            minSecond={240}
            label="Resize problem and conversation"
            className="flex-1"
            first={
              // A short fade at the cut edge says "more below" instead of a hard clip.
              <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8 pt-6 [mask-image:linear-gradient(to_bottom,black_calc(100%-24px),transparent)]">
                <ProblemPanel status={status} problem={problem} onRetry={retry} />
              </div>
            }
            second={conversation}
          />
        }
        second={
          problem ? (
            <EditorPane problem={problem} questionId={question.id} runner={runner} />
          ) : (
            <div className="grid flex-1 place-items-center bg-ink px-8 text-center font-sans text-[14px] text-mist">
              {status === "error" ? "The editor opens once the problem loads." : "Loading the problem…"}
            </div>
          )
        }
      />
    </motion.div>
  );
}

/** < 1024 px: the problem and a calm note, shown above the conversation. */
export function CodingBrief({ question }: { question: PlannedQuestion }) {
  const { status, problem, retry } = useCodingProblem(question.exemplarId);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-ink px-5 py-5">
        <ProblemPanel status={status} problem={problem} onRetry={retry} />
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
        <Desktop size={18} className="mt-0.5 shrink-0 text-mist" aria-hidden />
        <p className="font-sans text-[14px] leading-relaxed text-chalk">
          The code editor needs a larger screen. You can still talk through your solution with Marcus.
        </p>
      </div>
    </div>
  );
}

// The line to mark in the editor: a load error's, else the first failing example's.
function errorLineOf(outcome: RunOutcome, visibleCount: number): number | null {
  if (outcome.kind !== "results") return null;
  const row = outcome.results.find((r) => r.index < 0) ?? outcome.results.find((r) => r.index < visibleCount && r.error);
  return row?.error ? describeError(row.error, row.index < 0).line : null;
}

function EditorPane({ problem, questionId, runner }: { problem: CodingProblem; questionId: string; runner: Runner }) {
  const stored = useSessionStore((s) => s.codeByQuestion[questionId]);
  const saveCode = useSessionStore((s) => s.setCode);
  const recordRun = useSessionStore((s) => s.recordRun);
  const sendCheckin = useSessionStore((s) => s.sendCheckin);
  const messageCount = useSessionStore((s) => s.messages.length);
  const checkinDue = useSessionStore(
    (s) => s.status === "live" && s.codingStage === "coding" && !s.checkinSent[questionId],
  );

  // Seeded once; CodeMirror owns the document from here (and its undo history).
  const [initial] = useState(() => stored ?? problem.starterCode);
  const code = useRef(initial);
  const [atStarter, setAtStarter] = useState(initial === problem.starterCode);
  const [edits, setEdits] = useState(0);
  const [shown, setShown] = useState<ShownRun | null>(null);
  const [pending, setPending] = useState<"run" | "submit" | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [loadedBefore, setLoadedBefore] = useState(runner.status === "ready" || runner.status === "running");
  const editor = useRef<CodeEditorHandle>(null);
  const hintId = useId();

  useEffect(() => {
    if (runner.status === "ready") setLoadedBefore(true);
  }, [runner.status]);

  // Quiet for 180 s while coding (no edits, no messages): Marcus checks in once.
  useIdleCheckin(checkinDue, `${edits}|${messageCount}`, () => void sendCheckin(questionId));

  const onChange = (next: string) => {
    code.current = next;
    setAtStarter(next === problem.starterCode);
    setEdits((n) => n + 1);
    setErrorLine(null);
    saveCode(questionId, next);
  };

  const execute = async (kind: "run" | "submit") => {
    if (pending || runner.status === "loading" || runner.status === "running") return;
    if (runner.status === "error") {
      if (kind === "run") runner.retry();
      return;
    }
    setPending(kind);
    setErrorLine(null);
    try {
      const outcome = await runner.run(code.current, problem, kind === "run");
      setShown((prev) => ({ outcome, kind, seq: (prev?.seq ?? 0) + 1 }));
      setErrorLine(errorLineOf(outcome, problem.visibleTestCount));
      void recordRun(questionId, outcome, kind, problem.visibleTestCount);
    } catch {
      /* a run was already in flight; its result is the one that shows */
    } finally {
      setPending(null);
    }
  };

  // Cmd/Ctrl+Enter also works from the toolbar and results (the editor handles its own).
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.key !== "Enter" || !(MAC ? e.metaKey : e.ctrlKey)) return;
    e.preventDefault();
    void execute(e.shiftKey ? "submit" : "run");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-ink" onKeyDown={onKeyDown}>
      <Toolbar
        status={runner.status}
        pending={pending}
        canReset={!atStarter}
        shortcuts={SHORTCUTS}
        hintId={hintId}
        onRun={() => void execute("run")}
        onSubmit={() => void execute("submit")}
        onRetry={runner.retry}
        onReset={() => editor.current?.replace(problem.starterCode)}
      />
      <SplitPane
        axis="y"
        storageKey="crucible.coding.split.editor"
        defaultPct={70}
        minFirst={160}
        minSecond={120}
        label="Resize editor and test results"
        className="flex-1"
        first={
          <CodeEditor
            ref={editor}
            initialValue={initial}
            onChange={onChange}
            onRun={() => void execute("run")}
            onSubmit={() => void execute("submit")}
            errorLine={errorLine}
            hintId={hintId}
          />
        }
        second={
          <TestResults
            status={runner.status}
            progress={runner.progress}
            loadedBefore={loadedBefore}
            run={shown}
            problem={problem}
            onRetry={runner.retry}
            shortcut={SHORTCUTS.run}
          />
        }
      />
    </div>
  );
}
