import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Brain,
  Lightning,
  Target,
  Quotes,
  CaretRight,
} from "@phosphor-icons/react";
import { Wordmark } from "@/components/Wordmark";
import { MagneticButton } from "@/components/MagneticButton";
import { KineticHeadline } from "@/components/KineticHeadline";
import { Reveal } from "@/components/Reveal";

export function Landing() {
  return (
    <div className="relative min-h-[100dvh]">
      {/* nav */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Wordmark />
          <nav className="flex items-center gap-6">
            <a
              href="#how"
              className="hidden font-mono text-xs tracking-wide text-mist transition-colors hover:text-chalk sm:block"
            >
              HOW IT WORKS
            </a>
            <Link
              to="/setup"
              className="rounded-full border border-line-bright px-4 py-2 font-mono text-xs tracking-wide text-chalk tactile transition-colors hover:border-fog hover:bg-surface"
            >
              START SESSION
            </Link>
          </nav>
        </div>
      </header>

      <HeroSection />
      <MarqueeBand />
      <PushbackSection />
      <MemoryLoopSection />
      <CoverageSection />
      <FinalCta />
      <Footer />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-24 pt-36 sm:pt-44">
      <div className="grid-floor pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full bg-accent/10 blur-[120px]" />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-14 px-5 sm:px-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-survive animate-[pulse-dot_2s_ease-in-out_infinite]" />
            <span className="font-mono text-[11px] tracking-[0.14em] text-mist">
              ADAPTIVE MULTI-AGENT INTERVIEWER
            </span>
          </motion.div>

          <KineticHeadline
            className="font-display text-[clamp(2.6rem,6vw,4.6rem)] font-bold leading-[0.98] tracking-tight text-white-pure"
            lines={[
              <>Most AI interviewers</>,
              <>
                forget you. <span className="text-fog">This one</span>
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
            Crucible runs a five-agent pipeline that pushes back on vague answers,
            scores whether you'd survive a real interviewer, and rebuilds every next
            session around the exact weaknesses you keep repeating.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82, duration: 0.7 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link to="/setup">
              <MagneticButton>
                Start a session
                <ArrowRight size={17} weight="bold" />
              </MagneticButton>
            </Link>
            <a
              href="#how"
              className="font-mono text-xs tracking-wide text-fog transition-colors hover:text-chalk"
            >
              SEE THE PUSH-BACK LOOP &darr;
            </a>
          </motion.div>
        </div>

        <HeroDevice />
      </div>
    </section>
  );
}

// A live-interview mock that types out a vague answer and shows the
// interviewer refusing to accept it.
function HeroDevice() {
  const lines = [
    { who: "iv", t: "Tell me about a project you owned under a tight deadline." },
    { who: "you", t: "We had a deadline and I made sure the team stayed focused and we shipped." },
    { who: "iv", t: "You said \"the team\". What did YOU specifically do that nobody else did?", probe: true },
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 1000 }}
      className="relative"
    >
      <div className="overflow-hidden rounded-[1.75rem] border border-line bg-ink shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2 font-mono text-[11px] text-fog">
            <span className="h-2 w-2 rounded-full bg-fail/70" />
            <span className="h-2 w-2 rounded-full bg-warning/70" />
            <span className="h-2 w-2 rounded-full bg-survive/70" />
            <span className="ml-2 tracking-wide">live session · Q1</span>
          </div>
          <span className="font-mono text-[11px] tracking-wide text-accent">REC ●</span>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {lines.map((l, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + i * 0.7, duration: 0.5 }}
              className={l.who === "you" ? "flex justify-end" : "flex justify-start"}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed ${
                  l.who === "you"
                    ? "bg-surface-2 text-chalk"
                    : l.probe
                    ? "border border-accent/40 bg-accent/10 text-chalk"
                    : "bg-surface text-mist"
                }`}
              >
                {l.probe && (
                  <span className="mb-1 block font-mono text-[10px] tracking-[0.14em] text-accent">
                    PUSHING BACK
                  </span>
                )}
                {l.t}
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.4 }}
            className="flex items-center gap-2 pl-1 pt-1"
          >
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="font-mono text-[11px] text-fog">interviewer is not satisfied yet…</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function MarqueeBand() {
  const items = [
    "PUSHES BACK ON VAGUE ANSWERS",
    "REMEMBERS YOUR WEAK SPOTS",
    "BEHAVIORAL · TECHNICAL · SYSTEM DESIGN",
    "WOULD-YOU-SURVIVE VERDICT",
    "GETS HARDER WHERE YOU'RE WEAK",
  ];
  return (
    <div className="relative border-y border-line py-5">
      <div className="flex w-max animate-[marquee_38s_linear_infinite] gap-10 whitespace-nowrap">
        {[...items, ...items].map((t, i) => (
          <span key={i} className="flex items-center gap-10 font-mono text-xs tracking-[0.2em] text-fog">
            {t}
            <span className="text-accent">/</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PushbackSection() {
  return (
    <section id="how" className="relative mx-auto max-w-[1200px] px-5 py-28 sm:px-8">
      <Reveal>
        <span className="font-mono text-xs tracking-[0.2em] text-accent">01 · THE DIFFERENCE</span>
        <h2 className="mt-4 max-w-[18ch] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight text-white-pure">
          It refuses to say "great answer."
        </h2>
      </Reveal>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        <Reveal delay={0.05}>
          <div className="h-full rounded-3xl border border-line bg-ink p-7 sm:p-9">
            <span className="font-mono text-[11px] tracking-[0.16em] text-fail">
              OTHER TOOLS
            </span>
            <Quotes size={28} weight="fill" className="mt-5 text-line-bright" />
            <p className="mt-3 text-lg leading-relaxed text-mist">
              "Great answer! You demonstrated strong leadership. Let's move to the next
              question."
            </p>
            <p className="mt-6 font-mono text-xs leading-relaxed text-fog">
              // accepts the vague answer, never probes, scores one session and forgets
              you by tomorrow.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative h-full overflow-hidden rounded-3xl border border-accent/30 bg-ink p-7 shadow-[inset_0_1px_0_rgba(74,124,255,0.12)] sm:p-9">
            <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-accent/15 blur-3xl" />
            <span className="font-mono text-[11px] tracking-[0.16em] text-accent">CRUCIBLE</span>
            <Lightning size={28} weight="fill" className="mt-5 text-accent" />
            <p className="mt-3 text-lg leading-relaxed text-chalk">
              "You said 'the team stayed focused'. What did <em>you</em> specifically do,
              and what changed because you did it?"
            </p>
            <p className="mt-6 font-mono text-xs leading-relaxed text-fog">
              // probes with why/how at least once, sets follow-up depth by question type, deeper for system design, then scores
              whether it would actually hold up.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function MemoryLoopSection() {
  const steps = [
    {
      icon: <Target size={22} weight="bold" />,
      tag: "SESSION 01",
      title: "You ramble on impact",
      body: "Three answers lack numbers. The Evaluator tags vague-impact and no-edge-cases.",
    },
    {
      icon: <Brain size={22} weight="bold" />,
      tag: "MEMORY",
      title: "It remembers the pattern",
      body: "The Memory Agent aggregates your recurring weaknesses into a profile that persists.",
    },
    {
      icon: <Lightning size={22} weight="bold" />,
      tag: "SESSION 02",
      title: "It comes back harder",
      body: "The Planner weights your next session toward the exact gaps you keep repeating.",
    },
  ];
  return (
    <section className="relative border-t border-line bg-ink/40 py-28">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <Reveal>
          <span className="font-mono text-xs tracking-[0.2em] text-accent">02 · THE MEMORY LOOP</span>
          <h2 className="mt-4 max-w-[20ch] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight text-white-pure">
            The only one that trains you across sessions.
          </h2>
        </Reveal>

        <div className="mt-16 grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.tag} delay={i * 0.1}>
              <div className="group relative h-full rounded-3xl border border-line bg-void p-7 transition-colors hover:border-line-bright">
                <div className="flex items-center justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-surface text-accent">
                    {s.icon}
                  </span>
                  <span className="font-mono text-[11px] tracking-[0.16em] text-fog">{s.tag}</span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-chalk">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-mist">{s.body}</p>
                {i < steps.length - 1 && (
                  <CaretRight
                    size={20}
                    className="absolute -right-[14px] top-1/2 hidden -translate-y-1/2 text-line-bright md:block"
                  />
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CoverageSection() {
  const cols = [
    { k: "BEHAVIORAL", d: "STAR structure, specificity, real ownership, not rehearsed platitudes." },
    { k: "TECHNICAL", d: "Correctness, depth, edge cases, and whether you can explain the mechanism." },
    { k: "SYSTEM DESIGN", d: "Scope clarification, tradeoffs named out loud, and reasoning at scale." },
  ];
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-28 sm:px-8">
      <Reveal>
        <span className="font-mono text-xs tracking-[0.2em] text-accent">03 · ONE ENGINE</span>
        <h2 className="mt-4 max-w-[24ch] font-display text-[clamp(2rem,4.4vw,3.4rem)] font-bold leading-[1.02] tracking-tight text-white-pure">
          Stop stitching three tools together.
        </h2>
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
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-[130px]" />
      <Reveal className="relative mx-auto max-w-[760px] px-5 text-center">
        <h2 className="font-display text-[clamp(2.2rem,5vw,4rem)] font-bold leading-[1.0] tracking-tight text-white-pure text-balance">
          Find out if your answers would actually survive.
        </h2>
        <p className="mx-auto mt-6 max-w-[48ch] text-[17px] leading-relaxed text-mist">
          Paste a resume and a job description. Get a real interview that fights back —
          and remembers.
        </p>
        <div className="mt-10 flex justify-center">
          <Link to="/setup">
            <MagneticButton>
              Start your first session
              <ArrowRight size={17} weight="bold" />
            </MagneticButton>
          </Link>
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
        <div className="flex items-center gap-6">
          <Link
            to="/privacy"
            className="font-mono text-[11px] tracking-wide text-fog transition-colors hover:text-chalk"
          >
            PRIVACY & TERMS
          </Link>
          <p className="font-mono text-[11px] tracking-wide text-fog">
            FIVE AGENTS · ONE MEMORY · NO MERCY
          </p>
        </div>
      </div>
    </footer>
  );
}
