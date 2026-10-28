import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ArrowClockwise, Brain } from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { VerdictCard } from "@/components/VerdictCard";
import { TrendChart } from "@/components/TrendChart";
import { useSessionStore } from "@/stores/sessionStore";

export function Results() {
  const navigate = useNavigate();
  const plan = useSessionStore((s) => s.plan);
  const evaluations = useSessionStore((s) => s.evaluations);
  const updatedMemory = useSessionStore((s) => s.updatedMemory);
  const endedForConduct = useSessionStore((s) => s.endedForConduct);
  const codeByQuestion = useSessionStore((s) => s.codeByQuestion);
  const reset = useSessionStore((s) => s.reset);

  // A session ended for conduct may have no scored answers yet; it still gets its page.
  const nothingToShow = !plan || (evaluations.length === 0 && !endedForConduct);
  useEffect(() => {
    if (nothingToShow) navigate("/setup");
  }, [nothingToShow, navigate]);

  if (!plan || nothingToShow) return null;

  const survived = evaluations.filter((e) => e.wouldSurviveRealInterview).length;
  const total = evaluations.length;
  const ratio = total ? survived / total : 0;
  // Only a conduct end gets here with nothing scored: no score to show, just the note.
  const noAnswers = total === 0;
  const verdictTone =
    noAnswers ? "var(--color-accent)"
    : ratio >= 0.6 ? "var(--color-survive)" : ratio >= 0.34 ? "var(--color-accent)" : "var(--color-fail)";

  const headline =
    noAnswers ? "Interview ended early."
    : ratio >= 0.6 ? "You'd mostly hold up."
    : ratio >= 0.34 ? "You'd survive parts of this."
    : "This wouldn't survive yet.";

  const topWeak = updatedMemory?.recurringWeaknesses.slice(0, 4) ?? [];

  return (
    <div className="min-h-[100dvh]">
      <TopBar
        right={
          <button
            onClick={() => {
              reset();
              navigate("/");
            }}
            className="font-mono text-[11px] tracking-wide text-fog transition-colors hover:text-chalk"
          >
            EXIT
          </button>
        }
      />

      {/* verdict hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="pointer-events-none absolute inset-0 grid-floor opacity-40" />
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: `color-mix(in srgb, ${verdictTone} 14%, transparent)` }}
        />
        <div className="relative mx-auto max-w-[1000px] px-5 py-16 sm:px-8 sm:py-20">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-xs tracking-[0.2em] text-accent"
          >
            SESSION VERDICT
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 font-display text-[clamp(2.4rem,6vw,4.4rem)] font-bold leading-[0.98] tracking-tight text-white-pure"
          >
            {headline}
          </motion.h1>

          {endedForConduct && (
            <p className="mt-4 max-w-[60ch] text-sm text-mist">
              This session ended early because of the conduct of the conversation.
            </p>
          )}

          {!noAnswers && (
            <div className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-6">
              <div>
                <div className="flex items-baseline gap-2 font-mono">
                  <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-6xl font-bold tabular-nums"
                    style={{ color: verdictTone }}
                  >
                    {survived}
                  </motion.span>
                  <span className="text-2xl text-fog">/ {total}</span>
                </div>
                <p className="mt-1 max-w-[28ch] text-sm text-mist">
                  answers would survive a real interviewer's follow-up grilling.
                </p>
              </div>

              <div className="h-12 w-px bg-line" />

              <div className="font-mono">
                <p className="text-xs tracking-wide text-fog">SESSION AVG</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-chalk">
                  {updatedMemory?.improvementTrend.at(-1)?.avgScore.toFixed(2) ?? "—"}
                  <span className="ml-1 text-base text-fog">/ 5</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[1000px] px-5 py-14 sm:px-8">
        {/* memory + trend */}
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="rounded-3xl border border-warning/25 bg-ink p-7">
            <div className="flex items-center gap-2.5">
              <Brain size={20} weight="bold" className="text-warning" />
              <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">
                Saved to memory
              </h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Your next session's Planner will weight these higher — it gets harder exactly
              where you're weak.
            </p>
            <div className="mt-5 space-y-2.5">
              {topWeak.length === 0 && !noAnswers && (
                <p className="font-mono text-xs text-fog">No recurring weaknesses logged. Strong run.</p>
              )}
              {topWeak.map((w, i) => (
                <motion.div
                  key={w.tag}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2.5"
                >
                  <span className="font-mono text-[13px] text-chalk">{w.tag}</span>
                  <span className="font-mono text-[11px] text-fog">
                    seen {w.frequency}×
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-ink p-7">
            <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">
              Improvement trend
            </h2>
            <p className="mt-2 text-sm text-mist">Average rubric score across your sessions.</p>
            <div className="mt-6">
              <TrendChart points={updatedMemory?.improvementTrend ?? []} />
            </div>
          </div>
        </div>

        {/* per-question verdicts */}
        {!noAnswers && (
          <>
            <h2 className="mt-16 mb-6 font-display text-2xl font-bold tracking-tight text-white-pure">
              Answer-by-answer
            </h2>
            <div className="space-y-5">
              {evaluations.map((ev, i) => {
                const q = plan.questions.find((q) => q.id === ev.questionId) ?? plan.questions[i];
                return (
                  <VerdictCard
                    key={ev.questionId}
                    evaluation={ev}
                    question={q}
                    index={i}
                    sessionId={plan.sessionId}
                    code={codeByQuestion[q.id]}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* next-session CTA */}
        <div className="mt-16 flex flex-col items-center gap-5 rounded-3xl border border-line bg-ink p-10 text-center">
          <h3 className="max-w-[28ch] font-display text-2xl font-bold tracking-tight text-chalk text-balance">
            Run it back. This time it remembers.
          </h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/setup"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-void tactile shadow-[0_10px_30px_-10px_rgba(74,124,255,0.6)]"
            >
              <ArrowClockwise size={16} weight="bold" />
              Start session 2
            </Link>
            <button
              onClick={() => {
                reset();
                navigate("/dashboard");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-line-bright px-6 py-3.5 text-sm font-semibold text-chalk tactile hover:bg-surface"
            >
              View your progress
              <ArrowRight size={16} weight="bold" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
