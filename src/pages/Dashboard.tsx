import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotionConfig, motion } from "motion/react";
import { ArrowRight, CaretRight, TrendDown, TrendUp, Minus, WarningCircle } from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { TrendChart } from "@/components/TrendChart";
import { MagneticButton } from "@/components/MagneticButton";
import { api } from "@/lib/api";
import { getCandidateId } from "@/lib/identity";
import { humanizeTag } from "@/lib/humanize";
import {
  dashboardTakeaway,
  dotsLabel,
  summarizeMemory,
  weakSpotHistory,
  type MemorySummary,
  type WeakSpotHistory,
  type WeakSpotStatus,
} from "@/lib/memoryStats";
import type { MemoryProfile, SessionSummary } from "@/types/contracts";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-void";
const RECENT_SESSIONS_SHOWN = 5;

type LoadState =
  | { phase: "loading" }
  | { phase: "error" }
  | { phase: "ready"; profile: MemoryProfile; summary: MemorySummary; sessions: SessionSummary[] };

export function Dashboard() {
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ phase: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ phase: "loading" });
    (async () => {
      try {
        const cid = getCandidateId();
        // Sessions are secondary: if that call fails, still show progress.
        const [profile, sessions] = await Promise.all([
          api.getMemory(cid),
          api.listSessions(cid).catch(() => [] as SessionSummary[]),
        ]);
        if (cancelled) return;
        setState({ phase: "ready", profile, summary: summarizeMemory(profile), sessions });
      } catch {
        if (!cancelled) setState({ phase: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const start = () => navigate("/setup");

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh]">
        <TopBar />
        <main className="mx-auto max-w-[1000px] px-4 py-10 sm:px-8 sm:py-16">
          {state.phase === "loading" && <DashboardSkeleton />}
          {state.phase === "error" && (
            <ErrorState onRetry={() => setAttempt((a) => a + 1)} onStart={start} />
          )}
          {state.phase === "ready" && !state.summary.hasData && <EmptyState onStart={start} />}
          {state.phase === "ready" && state.summary.hasData && (
            <Populated
              profile={state.profile}
              summary={state.summary}
              sessions={state.sessions}
              onStart={start}
              onOpenSession={(sid) => navigate(`/session/${sid}`)}
            />
          )}
        </main>
      </div>
    </MotionConfig>
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
  const spots = weakSpotHistory(summary.topWeaknesses, sessions);
  const takeaway = dashboardTakeaway(summary, sessions[0], spots);
  const targets = spots
    .filter((s) => s.status !== "fixed")
    .slice(0, 2)
    .map((s) => humanizeTag(s.tag).toLowerCase());

  return (
    <div className="space-y-14">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        <p className="font-mono text-xs tracking-[0.2em] text-accent">YOUR PROGRESS</p>
        <h1 className="mt-3 max-w-[32ch] font-display text-[clamp(1.6rem,3.6vw,2.4rem)] font-bold leading-[1.12] tracking-tight text-white-pure text-balance">
          {takeaway}
        </h1>

        <HeadlineNumbers summary={summary} />

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
          <MagneticButton onClick={onStart}>
            Start session {summary.sessionsCompleted + 1}
            <ArrowRight size={17} weight="bold" />
          </MagneticButton>
          {targets.length > 0 && (
            <p className="text-sm text-mist">
              It leans on {targets.join(" and ")}.
            </p>
          )}
        </div>
      </motion.section>

      <section aria-labelledby="trend-heading" className="border-t border-line pt-8">
        <h2 id="trend-heading" className="font-display text-lg font-semibold tracking-tight text-chalk">
          How your scores are moving
        </h2>
        <p className="mt-1 text-sm text-mist">Average score per session, out of 5.</p>
        <div className="mt-6">
          <TrendChart points={profile.improvementTrend} />
        </div>
      </section>

      <div className="grid gap-12 border-t border-line pt-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-16">
        <WeakSpots spots={spots} sessionCount={spots[0]?.dots.length ?? 0} />
        <Strengths areas={summary.strongAreas} />
      </div>

      {sessions.length > 0 && <PastSessions sessions={sessions} onOpen={onOpenSession} />}
    </div>
  );
}

// At most three numbers, each in support of the sentence above it.
function HeadlineNumbers({ summary }: { summary: MemorySummary }) {
  const { sessionsCompleted, latestAvg, delta, trend } = summary;
  const Icon = trend === "up" ? TrendUp : trend === "down" ? TrendDown : Minus;
  return (
    <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
      <div>
        <dt className="text-mist">Sessions</dt>
        <dd className="font-mono text-lg font-semibold tabular-nums text-chalk">{sessionsCompleted}</dd>
      </div>
      {latestAvg !== null && (
        <div>
          <dt className="text-mist">Latest average</dt>
          <dd className="font-mono text-lg font-semibold tabular-nums text-chalk">
            {latestAvg.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-mist">of 5</span>
          </dd>
        </div>
      )}
      {delta !== null && (
        <div>
          <dt className="text-mist">Since last session</dt>
          <dd
            className={`flex items-center gap-1.5 font-mono text-lg font-semibold tabular-nums ${
              trend === "up" ? "text-survive" : "text-chalk"
            }`}
          >
            <Icon size={16} weight="bold" aria-hidden />
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)}
          </dd>
        </div>
      )}
    </dl>
  );
}

const STATUS_LABEL: Record<WeakSpotStatus, string> = {
  still: "Still showing up",
  new: "New",
  fixed: "Looks fixed",
};
// Warning only on the one the user can act on next; fixed is good news.
const STATUS_TONE: Record<WeakSpotStatus, string> = {
  still: "text-warning",
  new: "text-accent",
  fixed: "text-survive",
};

function WeakSpots({ spots, sessionCount }: { spots: WeakSpotHistory[]; sessionCount: number }) {
  return (
    <section aria-labelledby="weak-heading">
      <h2 id="weak-heading" className="font-display text-lg font-semibold tracking-tight text-chalk">
        Next to work on
      </h2>
      <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-mist">
        Your next session asks more about these.
        {sessionCount > 1 && " Each dot is a recent session, oldest on the left."}
      </p>
      {spots.length === 0 ? (
        <p className="mt-5 text-sm text-mist">
          Nothing keeps coming back. Weak spots appear here once the same one shows up in your answers.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {spots.map((s, i) => (
            <motion.li
              key={s.tag}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 * i }}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-[15px] text-chalk">{humanizeTag(s.tag)}</p>
                {s.status ? (
                  <p className={`mt-0.5 text-xs font-medium ${STATUS_TONE[s.status]}`}>
                    {STATUS_LABEL[s.status]}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-mist">
                    Seen {s.frequency} {s.frequency === 1 ? "time" : "times"} so far
                  </p>
                )}
              </div>
              {s.status && <DotStrip dots={s.dots} hits={s.hits} />}
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DotStrip({ dots, hits }: { dots: boolean[]; hits: number }) {
  return (
    <div role="img" aria-label={dotsLabel(hits, dots.length)} className="flex items-center gap-1.5">
      {dots.map((on, i) => (
        <span
          key={i}
          aria-hidden
          className={`size-2.5 rounded-full ${on ? "bg-mist" : "border border-line-bright"}`}
        />
      ))}
    </div>
  );
}

function Strengths({ areas }: { areas: string[] }) {
  return (
    <section aria-labelledby="strong-heading">
      <h2 id="strong-heading" className="font-display text-lg font-semibold tracking-tight text-chalk">
        What's holding up
      </h2>
      {areas.length === 0 ? (
        <p className="mt-1 text-sm leading-relaxed text-mist">
          Nothing yet. Areas you score well in across sessions show up here.
        </p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {areas.map((a) => (
            <li key={a} className="flex items-center gap-2.5 text-[15px] text-chalk">
              <span aria-hidden className="size-1.5 rounded-full bg-survive" />
              {humanizeTag(a)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const MODE_LABEL: Record<string, string> = {
  full: "Full mock",
  behavioral: "Behavioral",
  technical: "Technical",
  system_design: "System design",
  coding: "Coding",
};

function PastSessions({
  sessions,
  onOpen,
}: {
  sessions: SessionSummary[];
  onOpen: (sessionId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? sessions : sessions.slice(0, RECENT_SESSIONS_SHOWN);
  return (
    <section aria-labelledby="past-heading" className="border-t border-line pt-8">
      <h2 id="past-heading" className="font-display text-lg font-semibold tracking-tight text-chalk">
        Past sessions
      </h2>
      <p className="mt-1 text-sm text-mist">Open one to see each question and how it was judged.</p>
      <ul className="mt-4 divide-y divide-line">
        {shown.map((s) => (
          <li key={s.sessionId}>
            <SessionRow session={s} onClick={() => onOpen(s.sessionId)} />
          </li>
        ))}
      </ul>
      {sessions.length > RECENT_SESSIONS_SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-expanded={showAll}
          className={`mt-3 min-h-11 rounded-md px-1 text-sm text-mist transition-colors hover:text-chalk ${FOCUS}`}
        >
          {showAll ? "Show fewer" : `Show all ${sessions.length} sessions`}
        </button>
      )}
    </section>
  );
}

function SessionRow({ session, onClick }: { session: SessionSummary; onClick: () => void }) {
  // Dates are YYYY-MM-DD; read them as local days so they don't slip back a day west of UTC.
  const dateLabel = new Date(`${session.date.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-14 w-full items-center gap-4 rounded-md px-1 py-3 text-left transition-colors hover:bg-surface ${FOCUS}`}
    >
      <span className="w-14 shrink-0 font-mono text-xs text-mist">{dateLabel}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-sm font-semibold tracking-tight text-chalk">
          {MODE_LABEL[session.mode] ?? humanizeTag(session.mode)}
        </span>
        <span className="block text-xs capitalize text-mist">{session.level}</span>
      </span>
      {session.total > 0 && (
        <span className="shrink-0 text-right text-xs text-mist">
          <span className="font-mono text-sm font-semibold tabular-nums text-chalk">
            {session.survived} of {session.total}
          </span>{" "}
          held up
        </span>
      )}
      <CaretRight
        size={14}
        weight="bold"
        aria-hidden
        className="shrink-0 text-mist transition-transform group-hover:translate-x-0.5 group-hover:text-chalk"
      />
    </button>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="max-w-[560px] py-6"
    >
      <p className="font-mono text-xs tracking-[0.2em] text-accent">YOUR PROGRESS</p>
      <h1 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-[1.08] tracking-tight text-white-pure">
        No sessions yet.
      </h1>
      <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-mist">
        After your first interview this page shows how your scores move, the weak spots that keep
        coming back, and whether they're shrinking. Your next session then leans on them.
      </p>
      <div className="mt-8">
        <MagneticButton onClick={onStart}>
          Start your first session
          <ArrowRight size={17} weight="bold" />
        </MagneticButton>
      </div>
    </motion.section>
  );
}

function ErrorState({ onRetry, onStart }: { onRetry: () => void; onStart: () => void }) {
  return (
    <section role="alert" className="max-w-[480px] py-10">
      <WarningCircle size={28} weight="fill" aria-hidden className="text-warning" />
      <h1 className="mt-4 font-display text-xl font-semibold tracking-tight text-chalk">
        We couldn't load your progress.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-mist">
        This is usually a connection problem. Check you're online and try again. You can still
        start a new session in the meantime.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className={`min-h-11 rounded-full bg-accent px-5 text-sm font-medium text-void tactile transition-colors hover:bg-accent/90 ${FOCUS}`}
        >
          Try again
        </button>
        <button
          type="button"
          onClick={onStart}
          className={`min-h-11 rounded-full px-4 text-sm text-mist transition-colors hover:text-chalk ${FOCUS}`}
        >
          Start a session
        </button>
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite" className="space-y-14">
      <span className="sr-only">Loading your progress</span>
      <div aria-hidden className="animate-pulse space-y-4">
        <div className="h-3 w-28 rounded bg-surface-2" />
        <div className="h-9 w-full max-w-[520px] rounded bg-surface-2" />
        <div className="flex gap-8 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 w-20 rounded bg-surface-2" />
          ))}
        </div>
      </div>
      <div aria-hidden className="h-52 animate-pulse rounded-2xl bg-surface-2" />
      <div aria-hidden className="animate-pulse space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded bg-surface-2" />
        ))}
      </div>
    </div>
  );
}
