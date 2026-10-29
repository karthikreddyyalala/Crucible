import { useEffect, useId, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, WarningCircle, CaretDown, Sparkle, ArrowClockwise, Copy, Check } from "@phosphor-icons/react";
import type { AnswerEvaluation, PlannedQuestion } from "@/types/contracts";
import { useCoach } from "@/hooks/useCoach";
import type { CodingLanguage } from "@/lib/coding/types";
import { humanizeTag } from "@/lib/humanize";
import { RubricBar } from "./RubricBar";
import { TypeChip } from "./QuestionMeta";

interface VerdictCardProps {
  evaluation: AnswerEvaluation;
  question: PlannedQuestion;
  index: number;
  // Coding answers: passed to the coach so it can return a clean solution.
  sessionId?: string;
  code?: string;
  language?: CodingLanguage;
}

export type TranscriptEntry = { role: "Q" | "A"; text: string };

// Returns structured Q/A pairs when the transcript is a multi-turn thread,
// null when it's a plain single-answer string (no Q:/A: prefix format).
export function parseTranscript(raw: string): TranscriptEntry[] | null {
  if (!raw || (!raw.startsWith("Q: ") && !raw.startsWith("A: "))) return null;

  const lines = raw.split("\n");
  const entries: TranscriptEntry[] = [];
  let current: TranscriptEntry | null = null;

  for (const line of lines) {
    if (line.startsWith("Q: ")) {
      if (current) entries.push(current);
      current = { role: "Q", text: line.slice(3) };
    } else if (line.startsWith("A: ")) {
      if (current) entries.push(current);
      current = { role: "A", text: line.slice(3) };
    } else if (current) {
      current.text += "\n" + line;
    }
  }
  if (current) entries.push(current);
  return entries.length > 0 ? entries : null;
}

export const SURVIVE_HINT =
  "\"Would survive\" means the answer would still hold up once a real interviewer pushes with follow-up questions.";

const FOCUS ="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink";

type Panel = "yours" | "model" | "details" | null;

export function VerdictCard({ evaluation, question, index, sessionId, code, language }: VerdictCardProps) {
  const survives = evaluation.wouldSurviveRealInterview;
  const tone = survives ? "var(--color-survive)" : "var(--color-fail)";
  const [open, setOpen] = useState<Panel>(null);
  // The coach panel only mounts (and fetches) once the user asks for it, then stays cached.
  const [modelRequested, setModelRequested] = useState(false);
  const panelId = useId();

  const parsed = parseTranscript(evaluation.transcript);
  const hasTranscript = evaluation.transcript.trim().length > 0;
  const toggle = (p: Exclude<Panel, null>) => {
    if (p === "model") setModelRequested(true);
    setOpen((o) => (o === p ? null : p));
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-3xl border border-line bg-ink p-5 sm:p-8"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-xs text-mist">Q{index + 1}</span>
        <TypeChip type={question.type} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-mist">{question.prompt}</p>

      {/* the verdict leads: would this answer hold up, and why */}
      <h3 className="mt-5 flex items-center gap-2 font-display text-lg font-semibold tracking-tight" style={{ color: tone }}>
        {survives ? (
          <CheckCircle size={20} weight="fill" aria-hidden />
        ) : (
          <WarningCircle size={20} weight="fill" aria-hidden />
        )}
        {survives ? "Would survive a real interview" : "Wouldn't survive a real interview yet"}
      </h3>
      <p className="mt-2 max-w-[65ch] text-[15px] leading-relaxed text-chalk">{evaluation.survivalReasoning}</p>

      {evaluation.keyPoints && evaluation.keyPoints.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-mist">What you said</p>
          <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed text-mist marker:text-fog">
            {evaluation.keyPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {evaluation.weaknessTags.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-mist">Next to work on</p>
          <ul className="flex flex-wrap gap-2">
            {evaluation.weaknessTags.map((tag) => (
              <li key={tag} className="rounded-md bg-surface-2 px-2.5 py-1 text-xs text-chalk">
                {humanizeTag(tag)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* actions: the coach first, then the transcript and the scores */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {hasTranscript && (
          <>
            <button
              type="button"
              onClick={() => toggle("model")}
              aria-expanded={open === "model"}
              aria-controls={`${panelId}-model`}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 text-sm font-semibold tactile transition-colors ${FOCUS} ${
                open === "model" ? "bg-accent text-void" : "bg-accent/10 text-accent hover:bg-accent/20"
              }`}
            >
              <Sparkle size={14} weight="fill" aria-hidden />
              Show me a strong answer
            </button>
            <Toggle open={open === "yours"} controls={`${panelId}-yours`} onClick={() => toggle("yours")}>
              Your answer
            </Toggle>
          </>
        )}
        <Toggle open={open === "details"} controls={`${panelId}-details`} onClick={() => toggle("details")}>
          Details
        </Toggle>
      </div>

      <AnimatePresence initial={false}>
        {open !== null && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {open === "yours" && (
              <div id={`${panelId}-yours`} className="mt-4 space-y-3 border-l border-line-bright pl-4">
                {parsed ? (
                  parsed.map((entry, i) => (
                    <div key={i} className="flex gap-3">
                      <span
                        className={`shrink-0 pt-0.5 font-mono text-[11px] font-bold tracking-wider ${
                          entry.role === "Q" ? "text-accent" : "text-mist"
                        }`}
                      >
                        {entry.role}
                      </span>
                      <p className={`text-sm leading-relaxed ${entry.role === "Q" ? "text-mist" : "text-chalk"}`}>
                        {entry.text}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-relaxed text-chalk">{evaluation.transcript}</p>
                )}
              </div>
            )}

            {/* model answer: mounts once, on first request, then stays cached while hidden */}
            {modelRequested && (
              <div id={`${panelId}-model`} className={open === "model" ? "block" : "hidden"}>
                <CoachPanel
                  question={question}
                  transcript={evaluation.transcript}
                  weaknessTags={evaluation.weaknessTags}
                  sessionId={sessionId}
                  code={code}
                  language={language}
                />
              </div>
            )}

            {open === "details" && (
              <div id={`${panelId}-details`} className="mt-3">
                {Object.entries(evaluation.rubricScores).map(([k, v], i) => (
                  <RubricBar key={k} label={k} value={v} index={i} />
                ))}
                <p className="mt-2 font-mono text-xs text-mist">
                  Follow-up questions asked: <span className="text-chalk">{evaluation.followUpCount}</span>
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Toggle({
  open,
  controls,
  onClick,
  children,
}: {
  open: boolean;
  controls: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls={controls}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm tactile transition-colors ${FOCUS} ${
        open ? "text-chalk" : "text-mist hover:text-chalk"
      }`}
    >
      {children}
      <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22 }} className="inline-flex">
        <CaretDown size={12} weight="bold" aria-hidden />
      </motion.span>
    </button>
  );
}

// Isolated so its fetch/loading lives on its own and only runs when the user
// asks to see the model answer. Mounts once, caches the result.
function CoachPanel({
  question,
  transcript,
  weaknessTags,
  sessionId,
  code,
  language,
}: {
  question: PlannedQuestion;
  transcript: string;
  weaknessTags: string[];
  sessionId?: string;
  code?: string;
  language?: CodingLanguage;
}) {
  const { state, load } = useCoach({ question, transcript, weaknessTags, sessionId, code, language });

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mt-4 border-l-2 border-accent/50 pl-4" aria-live="polite">
      {state.phase === "loading" && (
        <div role="status" className="space-y-2.5">
          <p className="text-sm text-accent">Writing a stronger version of your answer...</p>
          <div className="h-3 w-full animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-[92%] animate-pulse rounded bg-surface-2" />
          <div className="h-3 w-[80%] animate-pulse rounded bg-surface-2" />
        </div>
      )}

      {state.phase === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-mist">
            Couldn't write a strong answer just now. Check your connection and try again.
          </span>
          <button
            type="button"
            onClick={load}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm text-accent transition-opacity hover:opacity-80 ${FOCUS}`}
          >
            <ArrowClockwise size={14} weight="bold" aria-hidden />
            Retry
          </button>
        </div>
      )}

      {state.phase === "ready" && (
        <div>
          <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-accent">A strong answer</p>
          <p className="text-[15px] leading-relaxed text-chalk">{state.data.modelAnswer}</p>
          {state.data.improvements.length > 0 && (
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-2 font-mono text-[11px] tracking-[0.12em] text-accent">What changed</p>
              <ul className="space-y-1.5">
                {state.data.improvements.map((imp, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-mist">
                    <Sparkle size={13} weight="fill" className="mt-1 shrink-0 text-accent" aria-hidden />
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {state.data.code && <CodeBlock code={state.data.code} />}
        </div>
      )}
    </div>
  );
}

// The coach's clean solution for a coding answer: shown, never read aloud.
function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked: the code is still selectable */
    }
  };
  return (
    <div className="mt-4 border-t border-line pt-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.12em] text-accent">Clean solution</p>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2 font-mono text-[11px] text-mist transition-colors hover:text-chalk ${FOCUS}`}
        >
          {copied ? <Check size={12} weight="bold" aria-hidden /> : <Copy size={12} weight="bold" aria-hidden />}
          <span aria-live="polite">{copied ? "COPIED" : "COPY"}</span>
        </button>
      </div>
      <pre className="overflow-x-auto rounded-xl border border-line bg-void p-4 font-mono text-[13px] leading-relaxed text-chalk">
        <code>{code}</code>
      </pre>
    </div>
  );
}
