import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, MotionConfig } from "motion/react";
import { ArrowRight, ArrowClockwise } from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { SURVIVE_HINT, VerdictCard } from "@/components/VerdictCard";
import { TrendChart } from "@/components/TrendChart";
import { humanizeTag } from "@/lib/humanize";
import { takeaway } from "@/lib/takeaway";
import { codeKey, languageOf, useSessionStore } from "@/stores/sessionStore";

const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-void";

export function Results() {
  const navigate = useNavigate();
  const plan = useSessionStore((s) => s.plan);
  const evaluations = useSessionStore((s) => s.evaluations);
  const updatedMemory = useSessionStore((s) => s.updatedMemory);
  const endedForConduct = useSessionStore((s) => s.endedForConduct);
  const codeByQuestion = useSessionStore((s) => s.codeByQuestion);
  const codingLanguage = useSessionStore((s) => s.codingLanguage);
  const languageByQuestion = useSessionStore((s) => s.languageByQuestion);
  const reset = useSessionStore((s) => s.reset);

  // A session ended for conduct may have no scored answers yet; it still gets its page.
  const nothingToShow = !plan || (evaluations.length === 0 && !endedForConduct);
  useEffect(() => {
    if (nothingToShow) navigate("/setup");
  }, [nothingToShow, navigate]);

  if (!plan || nothingToShow) return null;

  // Only a conduct end gets here with nothing scored: no score to show, just the note.
  const noAnswers = evaluations.length === 0;
  const summary = noAnswers ? null : takeaway(evaluations, plan.questions);
  const ratio = noAnswers ? 0 : evaluations.filter((e) => e.wouldSurviveRealInterview).length / evaluations.length;
  const glow = ratio >= 0.6 ? "var(--color-survive)" : "var(--color-accent)";
  const avg = updatedMemory?.improvementTrend.at(-1)?.avgScore;
  const topWeak = updatedMemory?.recurringWeaknesses.slice(0, 4) ?? [];

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh]">
        <TopBar
          right={
            <button
              onClick={() => {
                reset();
                navigate("/");
              }}
              className={`min-h-11 rounded px-2 font-mono text-[11px] tracking-wide text-mist transition-colors hover:text-chalk ${FOCUS}`}
            >
              EXIT
            </button>
          }
        />

        {/* the takeaway: one sentence, then the one thing to do next */}
        <section className="relative overflow-hidden border-b border-line">
          <div className="pointer-events-none absolute inset-0 grid-floor opacity-40" />
          <div
            className="pointer-events-none absolute -top-32 left-1/4 h-[400px] w-[600px] max-w-full rounded-full blur-[120px]"
            style={{ background: `color-mix(in srgb, ${glow} 12%, transparent)` }}
          />
          <div className="relative mx-auto max-w-[1000px] px-4 py-14 sm:px-8 sm:py-20">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-xs tracking-[0.2em] text-accent"
            >
              YOUR INTERVIEW REPORT
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mt-4 max-w-[20ch] font-display text-[clamp(2rem,5vw,3.6rem)] font-bold leading-[1.02] tracking-tight text-white-pure"
            >
              {summary ? summary.headline : "Interview ended early."}
            </motion.h1>

            {summary && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-4 max-w-[55ch] text-lg leading-relaxed text-chalk"
              >
                {summary.next}
              </motion.p>
            )}

            {endedForConduct && (
              <p className="mt-4 max-w-[60ch] text-sm text-mist">
                This session ended early because of the conduct of the conversation.
              </p>
            )}

            {summary && avg !== undefined && (
              <p className="mt-6 font-mono text-sm text-mist">
                Average score <span className="text-chalk tabular-nums">{avg.toFixed(2)}</span> / 5
              </p>
            )}
          </div>
        </section>

        <main className="mx-auto max-w-[1000px] px-4 py-12 sm:px-8 sm:py-14">
          {/* per-question verdicts */}
          {!noAnswers && (
            <section>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white-pure">Answer-by-answer</h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-mist">{SURVIVE_HINT}</p>
              <div className="mt-6 space-y-5">
                {evaluations.map((ev, i) => {
                  const q = plan.questions.find((q) => q.id === ev.questionId) ?? plan.questions[i];
                  const language = languageOf({ languageByQuestion, codingLanguage }, q.id);
                  return (
                    <VerdictCard
                      key={ev.questionId}
                      evaluation={ev}
                      question={q}
                      index={i}
                      sessionId={plan.sessionId}
                      code={codeByQuestion[codeKey(q.id, language)]}
                      language={language}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* what carries over to the next interview */}
          <div className={`grid gap-10 border-t border-line pt-10 lg:grid-cols-[1fr_1.1fr] ${noAnswers ? "" : "mt-14"}`}>
            <section>
              <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">Next to work on</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Your next interview comes back to these, so you get to practise them again.
              </p>
              {topWeak.length === 0 ? (
                <p className="mt-5 text-sm text-mist">
                  Nothing keeps coming up yet. Anything that does will show here.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {topWeak.map((w, i) => (
                    <motion.li
                      key={w.tag}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.08 }}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <span className="text-sm text-chalk">{humanizeTag(w.tag)}</span>
                      <span className="shrink-0 font-mono text-xs text-mist">
                        Came up {w.frequency === 1 ? "once" : `${w.frequency} times`}
                      </span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">How you're trending</h2>
              <p className="mt-2 text-sm text-mist">Average score across your interviews.</p>
              <div className="mt-6">
                <TrendChart points={updatedMemory?.improvementTrend ?? []} />
              </div>
            </section>
          </div>

          {/* next step */}
          <section className="mt-14 border-t border-line pt-10">
            <h2 className="max-w-[28ch] font-display text-2xl font-bold tracking-tight text-chalk text-balance">
              Run it back. This time it remembers.
            </h2>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                to="/setup"
                className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-void tactile ${FOCUS}`}
              >
                <ArrowClockwise size={16} weight="bold" aria-hidden />
                Start your next interview
              </Link>
              <button
                onClick={() => {
                  reset();
                  navigate("/dashboard");
                }}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-line-bright px-6 py-3 text-sm font-semibold text-chalk tactile hover:bg-surface ${FOCUS}`}
              >
                View your progress
                <ArrowRight size={16} weight="bold" aria-hidden />
              </button>
            </div>
          </section>
        </main>
      </div>
    </MotionConfig>
  );
}
