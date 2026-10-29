import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, MotionConfig } from "motion/react";
import { ArrowClockwise, ArrowRight } from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { SURVIVE_HINT, VerdictCard } from "@/components/VerdictCard";
import { api } from "@/lib/api";
import { getCandidateId } from "@/lib/identity";
import { COMPANY_STYLES } from "@/lib/companyStyles";
import { takeaway } from "@/lib/takeaway";
import { formatDay, MODE_LABEL } from "@/lib/humanize";
import type { SessionRecord } from "@/types/contracts";

type LoadState =
  | { phase: "loading" }
  | { phase: "missing" }
  | { phase: "error" }
  | { phase: "ready"; record: SessionRecord };

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-void";
const PRIMARY = `inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-void tactile ${FOCUS}`;
const SECONDARY = `inline-flex min-h-11 items-center gap-2 rounded-full border border-line-bright px-6 py-3 text-sm font-semibold text-chalk tactile hover:bg-surface ${FOCUS}`;

export function SessionReview() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ phase: "missing" });
      return;
    }
    let cancelled = false;
    setState({ phase: "loading" });
    (async () => {
      try {
        const record = await api.getSession(getCandidateId(), id);
        if (cancelled) return;
        setState(record ? { phase: "ready", record } : { phase: "missing" });
      } catch {
        if (!cancelled) setState({ phase: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh]">
        <TopBar />
        <main className="mx-auto max-w-[1000px] px-4 py-12 sm:px-8">
          {state.phase === "loading" && <ReviewSkeleton />}
          {state.phase === "error" && (
            <Message
              text="Couldn't load this session."
              sub="It may be a connection problem. Try again, or head back to your progress."
            >
              <button type="button" onClick={() => setAttempt((n) => n + 1)} className={PRIMARY}>
                <ArrowClockwise size={14} weight="bold" aria-hidden />
                Try again
              </button>
              <Link to="/dashboard" className={SECONDARY}>Back to your progress</Link>
            </Message>
          )}
          {state.phase === "missing" && (
            <Message text="Session not found." sub="It may have been cleared, or the link is wrong.">
              <Link to="/dashboard" className={PRIMARY}>Back to your progress</Link>
            </Message>
          )}
          {state.phase === "ready" && <Loaded record={state.record} />}
        </main>
      </div>
    </MotionConfig>
  );
}

function Loaded({ record }: { record: SessionRecord }) {
  const summary = record.evaluations.length > 0 ? takeaway(record.evaluations, record.questions) : null;
  const date = formatDay(record.date, { month: "long", day: "numeric", year: "numeric" });

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="font-mono text-xs tracking-[0.2em] text-accent">{date.toUpperCase()}</span>
        <h1 className="mt-3 max-w-[22ch] font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight tracking-tight text-white-pure">
          {summary ? summary.headline : "No answers were scored."}
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-chalk">
          {summary ? summary.next : "This session ended before any answer was graded."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip label={MODE_LABEL[record.mode] ?? record.mode} />
          <Chip label={record.level} />
          {record.companyStyle && (
            <Chip label={COMPANY_STYLES.find((c) => c.id === record.companyStyle)?.name ?? record.companyStyle} />
          )}
          {record.endedForConduct && <Chip label="Ended early" />}
        </div>
      </motion.div>

      {summary ? (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold tracking-tight text-white-pure">Answer-by-answer</h2>
          <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-mist">{SURVIVE_HINT}</p>
          <div className="mt-6 space-y-5">
            {record.evaluations.map((ev, i) => {
              const q = record.questions.find((question) => question.id === ev.questionId) ?? record.questions[i];
              return (
                <VerdictCard key={ev.questionId} evaluation={ev} question={q} index={i} sessionId={record.sessionId} />
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mt-12 border-t border-line pt-8">
        <Link to="/setup" className={PRIMARY}>
          Start your next interview
          <ArrowRight size={16} weight="bold" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-md bg-surface-2 px-2.5 py-1 font-mono text-[11px] capitalize text-mist">
      {label}
    </span>
  );
}

function Message({ text, sub, children }: { text: string; sub: string; children: React.ReactNode }) {
  return (
    <div role="alert" className="max-w-[460px] py-16">
      <h1 className="font-display text-2xl font-bold tracking-tight text-chalk">{text}</h1>
      <p className="mt-2 text-sm leading-relaxed text-mist">{sub}</p>
      <div className="mt-6 flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-8">
      <span className="sr-only">Loading this session...</span>
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-28 rounded bg-surface-2" />
        <div className="h-10 w-full max-w-72 rounded bg-surface-2" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-52 animate-pulse rounded-3xl bg-surface-2" />
      ))}
    </div>
  );
}
