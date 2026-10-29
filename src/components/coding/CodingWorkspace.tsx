import { Suspense, lazy, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Desktop } from "@phosphor-icons/react";
import type { PlannedQuestion } from "@/types/contracts";
import type { RunOutcome } from "@/lib/coding/types";
import type { usePythonRunner } from "@/hooks/usePythonRunner";
import { useCodingProblem } from "@/hooks/useCodingProblem";
import type { PublicProblem } from "@/lib/coding/types";
import { codeKey, useSessionStore } from "@/stores/sessionStore";
import { FirstTimeHint } from "@/components/FirstTimeHint";
import { SplitPane } from "./SplitPane";
import { ProblemPanel } from "./ProblemPanel";
import { Toolbar, type Shortcuts } from "./Toolbar";
import type { CodeEditorHandle } from "./CodeEditor";
import { TestResults, type ShownRun } from "./TestResults";
import { useIdleCheckin } from "./useIdleCheckin";
import { describeError, isMac } from "./format";

type Runner = ReturnType<typeof usePythonRunner>;

// CodeMirror stays out of the main bundle: it loads when a coding problem is on screen.
const CodeEditor = lazy(() => import("./CodeEditor").then((m) => ({ default: m.CodeEditor })));

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
  const language = useSessionStore((s) => s.codingLanguage);

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
            // A language switch remounts the pane: the editor seeds from that language's draft.
            <EditorPane key={language} problem={problem} questionId={question.id} runner={runner} />
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
    <div className="space-y-5 border-y border-line py-6">
      <ProblemPanel status={status} problem={problem} onRetry={retry} />
      <div className="flex items-start gap-3">
        <Desktop size={18} className="mt-0.5 shrink-0 text-mist" aria-hidden />
        <p className="font-sans text-[14px] leading-relaxed text-mist">
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

function EditorPane({ problem, questionId, runner }: { problem: PublicProblem; questionId: string; runner: Runner }) {
  const language = useSessionStore((s) => s.codingLanguage);
  const setLanguage = useSessionStore((s) => s.setCodingLanguage);
  const stored = useSessionStore((s) => s.codeByQuestion[codeKey(questionId, language)]);
  const saveCode = useSessionStore((s) => s.setCode);
  const recordRun = useSessionStore((s) => s.recordRun);
  const sendCheckin = useSessionStore((s) => s.sendCheckin);
  const messageCount = useSessionStore((s) => s.messages.length);
  const approaching = useSessionStore((s) => s.codingStage === "approach");
  const checkinDue = useSessionStore(
    (s) => s.status === "live" && s.codingStage === "coding" && !s.checkinSent[questionId],
  );

  // Seeded once; CodeMirror owns the document from here (and its undo history).
  const starter = language === "javascript" ? problem.starterCodeJs : problem.starterCode;
  const [initial] = useState(() => stored ?? starter);
  const code = useRef(initial);
  const [atStarter, setAtStarter] = useState(initial === starter);
  const [edits, setEdits] = useState(0);
  const [shown, setShown] = useState<ShownRun | null>(null);
  const [pending, setPending] = useState<"run" | "submit" | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  // JavaScript has nothing to download, so no first-load notice.
  const [loadedBefore, setLoadedBefore] = useState(
    language === "javascript" || runner.status === "ready" || runner.status === "running",
  );
  const editor = useRef<CodeEditorHandle>(null);
  const hintId = useId();

  useEffect(() => {
    if (runner.status === "ready") setLoadedBefore(true);
  }, [runner.status]);

  // Quiet for 180 s while coding (no edits, no messages): Marcus checks in once.
  useIdleCheckin(checkinDue, `${edits}|${messageCount}`, () => void sendCheckin(questionId));

  const onChange = (next: string) => {
    code.current = next;
    setAtStarter(next === starter);
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
      void recordRun(questionId, outcome, kind, problem.visibleTestCount, language);
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
        language={language}
        onLanguage={setLanguage}
        status={runner.status}
        pending={pending}
        canReset={!atStarter}
        quietSubmit={approaching}
        shortcuts={SHORTCUTS}
        hintId={hintId}
        onRun={() => void execute("run")}
        onSubmit={() => void execute("submit")}
        onRetry={runner.retry}
        onReset={() => editor.current?.replace(starter)}
      />
      <FirstTimeHint id="coding" className="shrink-0 border-b border-line bg-void px-4 py-1">
        Talk through your approach with Marcus first, then code. Run checks the examples ({SHORTCUTS.run}); Submit
        runs the hidden tests too and Marcus reviews it ({SHORTCUTS.submit}).
      </FirstTimeHint>
      <SplitPane
        axis="y"
        storageKey="crucible.coding.split.editor"
        defaultPct={70}
        minFirst={160}
        minSecond={120}
        label="Resize editor and test results"
        className="flex-1"
        first={
          <Suspense fallback={<EditorSkeleton />}>
            <CodeEditor
              ref={editor}
              language={language}
              initialValue={initial}
              onChange={onChange}
              onRun={() => void execute("run")}
              onSubmit={() => void execute("submit")}
              errorLine={errorLine}
              hintId={hintId}
            />
          </Suspense>
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
            language={language}
          />
        }
      />
    </div>
  );
}

/** Holds the editor's place (gutter and first line where CodeMirror draws them) while it loads. */
function EditorSkeleton() {
  return (
    <div role="status" className="flex min-h-0 flex-1 bg-ink pt-[14px] font-mono text-[14px] leading-[1.6]">
      <span aria-hidden className="w-[44px] shrink-0 pr-1 text-right text-[#80808f]">
        1
      </span>
      <span className="pl-[14px] text-mist">Opening the editor…</span>
    </div>
  );
}
