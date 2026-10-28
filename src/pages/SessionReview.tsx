import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Warning } from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { VerdictCard } from "@/components/VerdictCard";
import { api } from "@/lib/api";
import { getCandidateId } from "@/lib/identity";
import type { SessionRecord } from "@/types/contracts";

type LoadState =
  | { phase: "loading" }
  | { phase: "missing" }
  | { phase: "error"; message: string }
  | { phase: "ready"; record: SessionRecord };

const MODE_LABEL: Record<string, string> = {
  full: "Full Mock",
  behavioral: "Behavioral",
  technical: "Technical",
  system_design: "System Design",
  coding: "Coding",
};

export function SessionReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    if (!id) {
      setState({ phase: "missing" });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const record = await api.getSession(getCandidateId(), id);
        if (cancelled) return;
        setState(record ? { phase: "ready", record } : { phase: "missing" });
      } catch (e) {
        if (cancelled) return;
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : "Couldn't load this session.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-[100dvh]">
      <TopBar
        right={
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wide text-fog transition-colors hover:text-chalk"
          >
            <ArrowLeft size={13} weight="bold" />
            DASHBOARD
          </button>
        }
      />
      <main className="mx-auto max-w-[1000px] px-5 py-12 sm:px-8">
        {state.phase === "loading" && <ReviewSkeleton />}
        {state.phase === "error" && <Message icon text="Couldn't load this session." sub={state.message} />}
        {state.phase === "missing" && (
          <Message icon text="Session not found." sub="It may have been cleared, or the link is wrong." />
        )}
        {state.phase === "ready" && <Loaded record={state.record} />}
      </main>
    </div>
  );
}

function Loaded({ record }: { record: SessionRecord }) {
  const survived = record.evaluations.filter((e) => e.wouldSurviveRealInterview).length;
  const total = record.evaluations.length;
  const ratio = total > 0 ? survived / total : 0;
  const tone =
    ratio >= 0.6 ? "var(--color-survive)" : ratio >= 0.34 ? "var(--color-accent)" : "var(--color-fail)";

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span className="font-mono text-xs tracking-[0.2em] text-accent">SESSION REVIEW</span>
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold tracking-tight text-white-pure">
            {new Date(record.date).toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h1>
          <span
            className="font-mono text-lg font-bold tabular-nums"
            style={{ color: tone }}
          >
            {survived}/{total} survived
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label={MODE_LABEL[record.mode] ?? record.mode} />
          <Chip label={`${record.level} level`} />
        </div>
      </motion.div>

      <div className="mt-10 space-y-5">
        {record.evaluations.map((ev, i) => {
          const q =
            record.questions.find((question) => question.id === ev.questionId) ??
            record.questions[i];
          return <VerdictCard key={ev.questionId} evaluation={ev} question={q} index={i} />;
        })}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-[11px] capitalize text-mist">
      {label}
    </span>
  );
}

function Message({ text, sub, icon }: { text: string; sub?: string; icon?: boolean }) {
  return (
    <div className="mx-auto max-w-[460px] py-16 text-center">
      {icon && <Warning size={28} weight="fill" className="mx-auto text-fail" />}
      <p className="mt-4 text-[15px] text-chalk">{text}</p>
      {sub && <p className="mt-1 font-mono text-xs text-fog">{sub}</p>}
    </div>
  );
}

function ReviewSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-surface-2" />
        <div className="h-10 w-72 rounded bg-surface-2" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-52 rounded-3xl bg-surface-2" />
      ))}
    </div>
  );
}
