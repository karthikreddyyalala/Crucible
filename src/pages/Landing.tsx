import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";
import { Wordmark } from "@/components/Wordmark";
import { MagneticButton } from "@/components/MagneticButton";
import { KineticHeadline } from "@/components/KineticHeadline";
import { Reveal } from "@/components/Reveal";

const FOCUS = "rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const QUIET_LINK = `min-h-11 items-center px-1 text-[13px] text-mist transition-colors hover:text-chalk ${FOCUS}`;
const H2 =
  "mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight text-white-pure";
const EYEBROW = "font-mono text-xs tracking-[0.2em] text-accent";

export function Landing() {
  return (
    <div className="relative min-h-[100dvh]">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between gap-3 px-5 sm:px-8">
          <Wordmark />
          <nav aria-label="Main" className="flex items-center gap-2 sm:gap-5">
            <a href="#how" className={`hidden sm:inline-flex ${QUIET_LINK}`}>
              How it works
            </a>
            <Link to="/dashboard" className={`hidden sm:inline-flex ${QUIET_LINK}`}>
              Your progress
            </Link>
            <Link
              to="/setup"
              className={`inline-flex min-h-11 items-center rounded-full border border-line-bright px-4 text-[13px] text-chalk tactile transition-colors hover:border-fog hover:bg-surface ${FOCUS} focus-visible:rounded-full`}
            >
              Start an interview
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <HeroSection />
        <PushbackSection />
        <MemoryLoopSection />
        <CoverageSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-24 pt-32 sm:pt-44">
      <div className="grid-floor pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-7 font-mono text-[11px] tracking-[0.14em] text-mist">
            MOCK INTERVIEWS THAT REMEMBER YOU
          </p>

          <KineticHeadline
            className="font-display text-[clamp(2.4rem,6vw,4.6rem)] font-bold leading-[0.98] tracking-tight text-white-pure"
            lines={[
              <>Most AI interviewers</>,
              <>
                forget you. <span className="text-mist">This one</span>
              </>,
              <span className="text-accent">doesn't.</span>,
            ]}
          />

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.7 }}
            className="mt-7 max-w-[52ch] text-[17px] leading-relaxed text-mist"
          >
            It asks the follow-up when an answer is vague, tells you straight whether the
            answer would hold up in a real interview, and starts your next session where
            you slipped last time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82, duration: 0.7 }}
            className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            <MagneticButton to="/setup">
              Start an interview
              <ArrowRight size={17} weight="bold" aria-hidden />
            </MagneticButton>
            <a href="#how" className={`inline-flex ${QUIET_LINK}`}>
              See how it works
            </a>
          </motion.div>
        </div>

        <HeroDevice />
      </div>
    </section>
  );
}

// A sample exchange: a vague answer, and the interviewer asking for specifics.
function HeroDevice() {
  const reduce = useReducedMotion();
  const lines = [
    { who: "iv", t: "Tell me about a project you owned under a tight deadline." },
    { who: "you", t: "We had a deadline and I made sure the team stayed focused and we shipped." },
    { who: "iv", t: "You said \"the team\". What did you specifically do that nobody else did?", probe: true },
  ];
  // The lines arrive one by one so the follow-up reads as a reply; static under reduced motion.
  const appear = (delay: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.5 } };
  return (
    <motion.figure
      {...(reduce
        ? {}
        : {
            initial: { opacity: 0, y: 40 },
            animate: { opacity: 1, y: 0 },
            transition: { delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] },
          })}
      className="relative overflow-hidden rounded-[1.75rem] border border-line bg-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
    >
      <figcaption className="border-b border-line px-5 py-3.5 font-mono text-[11px] tracking-wide text-mist">
        Example exchange
      </figcaption>

      <div className="space-y-4 p-5 sm:p-6">
        {lines.map((l, i) => (
          <motion.div
            key={i}
            {...appear(1 + i * 0.7)}
            className={l.who === "you" ? "flex justify-end" : "flex justify-start"}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                l.who === "you"
                  ? "bg-surface-2 text-chalk"
                  : l.probe
                  ? "border border-accent/40 bg-accent/10 text-chalk"
                  : "bg-surface text-mist"
              }`}
            >
              <span className="sr-only">{l.who === "you" ? "You: " : "Interviewer: "}</span>
              {l.probe && (
                <span className="mb-1 block font-mono text-[10px] tracking-[0.14em] text-accent">
                  FOLLOW-UP
                </span>
              )}
              {l.t}
            </p>
          </motion.div>
        ))}

        <motion.p {...appear(3.4)} className="flex items-center gap-2 pl-1 pt-1 font-mono text-[11px] text-mist">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
          Wants specifics before moving on
        </motion.p>
      </div>
    </motion.figure>
  );
}

function PushbackSection() {
  return (
    <section id="how" className="relative mx-auto max-w-[1200px] scroll-mt-8 px-5 py-28 sm:px-8">
      <Reveal>
        <p className={EYEBROW}>THE DIFFERENCE</p>
        <h2 className={`${H2} max-w-[18ch]`}>It won't just say "great answer."</h2>
      </Reveal>

      <div className="mt-14 grid gap-10 border-t border-line pt-10 md:grid-cols-2 md:gap-0 md:divide-x md:divide-line">
        <Reveal delay={0.05} className="md:pr-10">
          <p className="font-mono text-[11px] tracking-[0.16em] text-mist">A TYPICAL PRACTICE TOOL</p>
          <p className="mt-4 text-lg leading-relaxed text-mist">
            "Great answer! You demonstrated strong leadership. Let's move to the next
            question."
          </p>
          <p className="mt-5 text-sm leading-relaxed text-mist">
            Accepts the vague answer and moves on. Tomorrow it has forgotten you.
          </p>
        </Reveal>

        <Reveal delay={0.12} className="md:pl-10">
          <p className="font-mono text-[11px] tracking-[0.16em] text-accent">CRUCIBLE</p>
          <p className="mt-4 text-lg leading-relaxed text-chalk">
            "You said 'the team stayed focused'. What did <em>you</em> specifically do, and
            what changed because you did it?"
          </p>
          <p className="mt-5 text-sm leading-relaxed text-mist">
            Asks why and how before moving on, digs deeper on system design, then tells you
            whether the answer would hold up.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function MemoryLoopSection() {
  const steps = [
    {
      title: "You practice",
      body: "Say three of your answers skip the numbers. Crucible notes it: vague impact.",
    },
    {
      title: "It remembers",
      body: "That weak spot goes into your history, next to what you did well.",
    },
    {
      title: "Next time starts there",
      body: "Your next session asks more where you slipped, until it stops showing up.",
    },
  ];
  return (
    <section className="relative border-t border-line bg-ink/40 py-28">
      <div className="mx-auto grid max-w-[1200px] gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <Reveal>
          <p className={EYEBROW}>HOW IT REMEMBERS</p>
          <h2 className={`${H2} max-w-[16ch]`}>Each session builds on the last one.</h2>
        </Reveal>

        <ol className="divide-y divide-line border-y border-line">
          {steps.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.1} className="grid grid-cols-[2rem_1fr] gap-4 py-7">
                <span className="font-mono text-sm leading-7 text-accent">{i + 1}</span>
                <div>
                  <h3 className="font-display text-xl font-semibold tracking-tight text-chalk">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-mist">{s.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function CoverageSection() {
  const cols = [
    { k: "Behavioral", d: "Clear structure, specifics, and what you owned, not rehearsed lines." },
    { k: "Technical", d: "Correctness, depth, edge cases, and whether you can explain how it works." },
    { k: "System design", d: "Asking about scope, naming tradeoffs out loud, and reasoning at scale." },
    { k: "Coding", d: "Live problems in Python or JavaScript, run against real tests, then talked through." },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-28 sm:px-8">
      <Reveal>
        <p className={EYEBROW}>ONE PLACE</p>
        <h2 className={`${H2} max-w-[24ch]`}>Practice every kind of round in one place.</h2>
      </Reveal>
      <div className="mt-14 divide-y divide-line border-y border-line">
        {cols.map((c, i) => (
          <Reveal key={c.k} delay={i * 0.08}>
            <div className="grid items-baseline gap-3 py-8 md:grid-cols-[260px_1fr]">
              <h3 className="font-display text-2xl font-bold tracking-tight text-chalk">{c.k}</h3>
              <p className="max-w-[60ch] text-[15px] leading-relaxed text-mist">{c.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden border-t border-line py-32">
      <div className="pointer-events-none absolute inset-0 grid-floor opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[700px] max-w-full -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <Reveal className="relative mx-auto max-w-[760px] px-5 text-center">
        <h2 className="font-display text-[clamp(2.1rem,5vw,4rem)] font-bold leading-[1.0] tracking-tight text-white-pure text-balance">
          Find out if your answers would hold up.
        </h2>
        <p className="mx-auto mt-6 max-w-[48ch] text-[17px] leading-relaxed text-mist">
          Paste a resume and a job description. You get an interview that asks the
          follow-up, and remembers you next time.
        </p>
        <div className="mt-10 flex justify-center">
          <MagneticButton to="/setup">
            Start your first interview
            <ArrowRight size={17} weight="bold" aria-hidden />
          </MagneticButton>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line py-10">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
        <Wordmark />
        <nav aria-label="Footer" className="flex items-center gap-4">
          <Link to="/dashboard" className={`inline-flex ${QUIET_LINK}`}>
            Your progress
          </Link>
          <Link to="/privacy" className={`inline-flex ${QUIET_LINK}`}>
            Privacy & terms
          </Link>
        </nav>
      </div>
    </footer>
  );
}
