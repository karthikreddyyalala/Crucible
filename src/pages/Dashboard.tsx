import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  TrendUp,
  TrendDown,
  Minus,
  Target,
  Sparkle,
  Warning,
  CaretRight,
} from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { TrendChart } from "@/components/TrendChart";
import { MagneticButton } from "@/components/MagneticButton";
import { api } from "@/lib/api";
import { getCandidateId } from "@/lib/identity";
import { summarizeMemory, type MemorySummary } from "@/lib/memoryStats";
import type { MemoryProfile, SessionSummary } from "@/types/contracts";

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; profile: MemoryProfile; summary: MemorySummary; sessions: SessionSummary[] };

export function Dashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cid = getCandidateId();
        // Sessions are secondary — if that call fails, still show progress.
        const [profile, sessions] = await Promise.all([
          api.getMemory(cid),
          api.listSessions(cid).catch(() => [] as SessionSummary[]),
        ]);
        if (cancelled) return;
        setState({ phase: "ready", profile, summary: summarizeMemory(profile), sessions });
      } catch (e) {
        if (cancelled) return;
        setState({
          phase: "error",
          message: e instanceof Error ? e.message : "Couldn't load your progress.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[100dvh]">
      <TopBar />
      <main className="mx-auto max-w-[1000px] px-5 py-12 sm:px-8 sm:py-16">
        {state.phase === "loading" && <DashboardSkeleton />}
        {state.phase === "error" && (
          <ErrorState message={state.message} onRetry={() => setState({ phase: "loading" })} />
        )}
        {state.phase === "ready" && !state.summary.hasData && (
          <EmptyState onStart={() => navigate("/setup")} />
        )}
        {state.phase === "ready" && state.summary.hasData && (
          <Populated
            profile={state.profile}
            summary={state.summary}
            sessions={state.sessions}
            onStart={() => navigate("/setup")}
            onOpenSession={(sid) => navigate(`/session/${sid}`)}
          />
        )}
      </main>
    </div>
  );
}

function Populated({
  profile,
  summary,
  sessions,
  onStart,
  onOpenSession,
}: {
  profile: MemoryProfile;
  summary: MemorySummary;
  sessions: SessionSummary[];
  onStart: () => void;
  onOpenSession: (sessionId: string) => void;
}) {
  const { sessionsCompleted, latestAvg, delta, trend, topWeaknesses, strongAreas } = summary;
  const targets = topWeaknesses.slice(0, 3).map((w) => w.tag);

  return (
    <div className="space-y-10">
      {/* header + headline stats */}
      <section>
        <span className="font-mono text-xs tracking-[0.2em] text-accent">YOUR PROGRESS</span>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.02] tracking-tight text-white-pure">
          Welcome back.
        </h1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-mist">
          Every session sharpens the next. Here's how you're tracking and where the
          interviewer will push hardest next time.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="SESSIONS COMPLETED" value={String(sessionsCompleted)} />
          <StatCard
            label="LATEST AVG SCORE"
            value={latestAvg !== null ? latestAvg.toFixed(2) : "—"}
            suffix="/ 5"
          />
          <DeltaCard delta={delta} trend={trend} />
        </div>
      </section>

      {/* trend */}
      <section className="rounded-3xl border border-line bg-ink p-7">
        <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">
          Improvement trend
        </h2>
        <p className="mt-1 text-sm text-mist">Average rubric score across every session.</p>
        <div className="mt-6">
          <TrendChart points={profile.improvementTrend} />
        </div>
      </section>

      {/* weaknesses + strengths */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-warning/25 bg-ink p-7">
          <div className="flex items-center gap-2.5">
            <Brain size={20} weight="bold" className="text-warning" />
            <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">
              Where you keep slipping
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Ranked by how often they've shown up. Your next session weights these higher.
          </p>
          <div className="mt-5 space-y-2.5">
            {topWeaknesses.length === 0 && (
              <p className="font-mono text-xs text-fog">
                No recurring weaknesses logged. Strong run.
              </p>
            )}
            {topWeaknesses.map((w, i) => (
              <motion.div
                key={w.tag}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.07 }}
                className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5"
              >
                <span className="font-mono text-[13px] text-chalk">{w.tag}</span>
                <span className="font-mono text-[11px] text-fog">seen {w.frequency}×</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-survive/25 bg-ink p-7">
          <div className="flex items-center gap-2.5">
            <Sparkle size={20} weight="fill" className="text-survive" />
            <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">
              Your strengths
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-mist">
            Areas you consistently hold up in.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {strongAreas.length === 0 && (
              <p className="font-mono text-xs text-fog">
                Nothing locked in yet. Keep going.
              </p>
            )}
            {strongAreas.map((s) => (
              <span
                key={s}
                className="rounded-md border border-survive/30 bg-survive/[0.06] px-2.5 py-1 font-mono text-[11px] text-survive"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* past sessions */}
      {sessions.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-lg font-semibold tracking-tight text-chalk">
            Past sessions
          </h2>
          <div className="overflow-hidden rounded-2xl border border-line divide-y divide-line">
            {sessions.map((s, i) => (
              <SessionRow
                key={s.sessionId}
                session={s}
                index={i}
                onClick={() => onOpenSession(s.sessionId)}
              />
            ))}
          </div>
        </section>
      )}

      {/* next-session CTA */}
      <section className="flex flex-col items-center gap-5 rounded-3xl border border-line bg-ink p-10 text-center">
        {targets.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Target size={16} weight="bold" className="text-accent" />
            <span className="font-mono text-[11px] tracking-wide text-accent">
              NEXT SESSION TARGETS:
            </span>
            {targets.map((t) => (
              <span
                key={t}
                className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-chalk"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <h3 className="max-w-[26ch] font-display text-2xl font-bold tracking-tight text-chalk text-balance">
          Run session {sessionsCompleted + 1}. This time it's harder where you're weak.
        </h3>
        <MagneticButton onClick={onStart}>
          Start next session
          <ArrowRight size={17} weight="bold" />
        </MagneticButton>
      </section>
    </div>
  );
}

const MODE_LABEL: Record<string, string> = {
  full: "Full Mock",
  behavioral: "Behavioral",
  technical: "Technical",
  system_design: "System Design",
  coding: "Coding",
};

function SessionRow({
  session,
  index,
  onClick,
}: {
  session: SessionSummary;
  index: number;
  onClick: () => void;
}) {
  const ratio = session.total > 0 ? session.survived / session.total : 0;
  const tone =
    ratio >= 0.6 ? "var(--color-survive)" : ratio >= 0.34 ? "var(--color-accent)" : "var(--color-fail)";
  const dateLabel = new Date(session.date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.03 * index }}
      onClick={onClick}
      className="group flex w-full items-center gap-4 bg-ink px-4 py-3.5 text-left transition-colors hover:bg-surface"
    >
      <span className="w-14 shrink-0 font-mono text-xs text-fog">{dateLabel}</span>
      <span className="font-display text-sm font-semibold tracking-tight text-chalk">
        {MODE_LABEL[session.mode] ?? session.mode}
      </span>
      <span className="font-mono text-[11px] capitalize text-fog">{session.level}</span>
      <span className="ml-auto font-mono text-sm font-bold tabular-nums" style={{ color: tone }}>
        {session.survived}/{session.total}
      </span>
      <CaretRight
        size={14}
        weight="bold"
        className="text-fog transition-transform group-hover:translate-x-0.5 group-hover:text-chalk"
      />
    </motion.button>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-ink p-5">
      <p className="font-mono text-[11px] tracking-[0.14em] text-fog">{label}</p>
      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-chalk">
        {value}
        {suffix && <span className="ml-1 text-base text-fog">{suffix}</span>}
      </p>
    </div>
  );
}

function DeltaCard({
  delta,
  trend,
}: {
  delta: number | null;
  trend: "up" | "down" | "flat" | null;
}) {
  const tone =
    trend === "up" ? "var(--color-survive)" : trend === "down" ? "var(--color-fail)" : "var(--color-fog)";
  const Icon = trend === "up" ? TrendUp : trend === "down" ? TrendDown : Minus;
  const text =
    delta === null
      ? "First session: no trend yet"
      : `${delta > 0 ? "+" : ""}${delta.toFixed(2)} vs last session`;

  return (
    <div className="rounded-2xl border border-line bg-ink p-5">
      <p className="font-mono text-[11px] tracking-[0.14em] text-fog">MOMENTUM</p>
      <div className="mt-2 flex items-center gap-2">
        <Icon size={22} weight="bold" style={{ color: tone }} />
        <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: tone }}>
          {delta === null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
        </span>
      </div>
      <p className="mt-1 text-xs text-fog">{text}</p>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-[560px] py-10 text-center"
    >
      <span className="font-mono text-xs tracking-[0.2em] text-accent">YOUR PROGRESS</span>
      <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-tight text-white-pure">
        No sessions yet.
      </h1>
      <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-mist">
        Run your first interview and this becomes your training log: your score over time,
        the weak spots that keep resurfacing, and a plan that gets harder exactly where you
        struggle.
      </p>
      <div className="mt-8 flex justify-center">
        <MagneticButton onClick={onStart}>
          Start your first session
          <ArrowRight size={17} weight="bold" />
        </MagneticButton>
      </div>
    </motion.div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-[460px] py-16 text-center">
      <Warning size={28} weight="fill" className="mx-auto text-fail" />
      <p className="mt-4 text-[15px] text-chalk">Couldn't load your progress.</p>
      <p className="mt-1 font-mono text-xs text-fog">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-full border border-line-bright px-5 py-2.5 font-mono text-[11px] tracking-wide text-chalk tactile transition-colors hover:bg-surface"
      >
        TRY AGAIN
      </button>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <div className="space-y-3">
        <div className="h-3 w-28 rounded bg-surface-2" />
        <div className="h-10 w-64 rounded bg-surface-2" />
        <div className="grid gap-4 pt-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="h-56 rounded-3xl bg-surface-2" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-48 rounded-3xl bg-surface-2" />
        <div className="h-48 rounded-3xl bg-surface-2" />
      </div>
    </div>
  );
}
