import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Sparkle, Brain, UploadSimple, VideoCamera } from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { MagneticButton } from "@/components/MagneticButton";
import { useSessionStore } from "@/stores/sessionStore";
import type { CompanyStyleId, InterviewLevel, InterviewMode } from "@/types/contracts";
import { extractPdfText } from "@/lib/pdf";
import { COMPANY_STYLES } from "@/lib/companyStyles";

const SAMPLE_RESUME = `Maya Okonkwo — Backend Engineer
4 years experience. Built a realtime pricing engine in Go that cut p99 latency from 940ms to 180ms under burst load. Led active-active failover for checkout across 3 AWS regions using Kubernetes and Envoy. Strong in distributed systems, Postgres, Kafka. Mentored 2 junior engineers.`;

const SAMPLE_JD = `Senior Software Engineer — Payments Infrastructure
We need an engineer with strong distributed systems fundamentals who has operated services at scale. You will own reliability of the checkout path, lead incident postmortems, and drive capacity planning. Must be comfortable reasoning about consistency, failover, and measurable SLOs.`;

const ROLES = [
  { key: "sde", label: "Software Engineer", hint: "Distributed systems, reliability, design" },
  { key: "ai_engineer", label: "AI Engineer", hint: "LLMs, evals, RAG, production ML" },
];

const MODES: { key: InterviewMode; label: string }[] = [
  { key: "full", label: "Full Mock" },
  { key: "behavioral", label: "Behavioral" },
  { key: "technical", label: "Technical" },
  { key: "system_design", label: "System Design" },
  { key: "coding", label: "Coding" },
];

const MODE_HINT: Partial<Record<InterviewMode, string>> = {
  full: "Mixed, adaptive — behavioral, one coding problem, technical & system design.",
  coding: "Live coding in Python — problems from the Blind 75.",
};

// Keyboard focus ring for every control on this page.
const FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

const LEVELS: { key: InterviewLevel; label: string }[] = [
  { key: "junior", label: "Junior" },
  { key: "mid", label: "Mid" },
  { key: "senior", label: "Senior" },
];

export function Setup() {
  const navigate = useNavigate();
  const start = useSessionStore((s) => s.start);
  const status = useSessionStore((s) => s.status);
  const priorMemory = useSessionStore((s) => s.priorMemory);
  const loadMemory = useSessionStore((s) => s.loadMemory);

  const [name, setName] = useState("");
  const [role, setRole] = useState("sde");
  const [mode, setMode] = useState<InterviewMode>("full");
  const [level, setLevel] = useState<InterviewLevel>("mid");
  const [companyStyle, setCompanyStyle] = useState<CompanyStyleId>("general");
  const [useVideo, setUseVideo] = useState(false);
  const [resume, setResume] = useState("");
  const [jd, setJd] = useState("");
  const [startError, setStartError] = useState("");

  // surface any persisted weaknesses from a previous session
  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const starting = status === "starting";
  const canStart = resume.trim().length > 200 && jd.trim().length > 100 && !starting;

  const handleStart = async () => {
    setStartError("");
    try {
      await start({ resumeText: resume, jdText: jd, role, mode, level, candidateName: name, useVideo, companyStyle });
      navigate("/interview");
    } catch (e) {
      setStartError(
        e instanceof Error ? e.message : "Failed to start session. Check your inputs and try again."
      );
    }
  };

  const weakTags = priorMemory?.recurringWeaknesses.slice(0, 3).map((w) => w.tag) ?? [];

  return (
    <div className="min-h-[100dvh]">
      <TopBar />

      <main className="mx-auto grid max-w-[1200px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <span className="font-mono text-xs tracking-[0.2em] text-accent">SESSION SETUP</span>
          <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-[1.02] tracking-tight text-white-pure">
            Give it something real to work with.
          </h1>
          <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-mist">
            The Intake Agent extracts your real resume-to-JD gaps. The Planner builds a
            question set aimed at them — not a generic bank.
          </p>

          {weakTags.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3"
            >
              <Brain size={18} weight="bold" className="text-warning" />
              <span className="font-mono text-[11px] tracking-wide text-warning">
                MEMORY ACTIVE — TARGETING:
              </span>
              {weakTags.map((t) => (
                <span
                  key={t}
                  className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-chalk"
                >
                  {t}
                </span>
              ))}
            </motion.div>
          )}

          {/* name */}
          <div className="mt-9">
            <label htmlFor="setup-name" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-fog">
              YOUR NAME
            </label>
            <input
              id="setup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should the interviewer call you?"
              className={`w-full rounded-xl border border-line bg-ink px-4 py-3 text-[15px] text-chalk placeholder:text-fog focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 ${FOCUS}`}
            />
          </div>

          {/* role */}
          <div className="mt-7">
            <p id="role-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-fog">
              TARGET ROLE
            </p>
            <div role="group" aria-labelledby="role-label" className="grid gap-3 sm:grid-cols-2">
              {ROLES.map((r) => {
                const active = role === r.key;
                return (
                  <button
                    key={r.key}
                    onClick={() => setRole(r.key)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left tactile transition-colors ${FOCUS} ${
                      active
                        ? "border-accent bg-accent/10"
                        : "border-line bg-ink hover:border-line-bright"
                    }`}
                  >
                    <span
                      className={`font-display text-lg font-semibold tracking-tight ${
                        active ? "text-chalk" : "text-mist"
                      }`}
                    >
                      {r.label}
                    </span>
                    <span className="mt-1 block text-xs text-fog">{r.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* mode */}
          <div className="mt-7">
            <p id="mode-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-fog">
              INTERVIEW MODE
            </p>
            <div role="group" aria-labelledby="mode-label" className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {MODES.map((m, i) => {
                const active = mode === m.key;
                return (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    aria-pressed={active}
                    className={`rounded-xl border px-3 py-2.5 text-center font-display text-[15px] font-semibold tracking-tight tactile transition-colors ${FOCUS} ${
                      i === 0 ? "col-span-2 sm:col-span-1" : ""
                    } ${
                      active
                        ? "border-accent bg-accent/10 text-chalk"
                        : "border-line bg-ink text-mist hover:border-line-bright"
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-fog">
              {MODE_HINT[mode] ?? "Focused track — every question stays in this area."}
            </p>
          </div>

          {/* level */}
          <div className="mt-7">
            <p id="level-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-fog">
              LEVEL
            </p>
            <div role="group" aria-labelledby="level-label" className="inline-flex rounded-xl border border-line bg-ink p-1">
              {LEVELS.map((l) => {
                const active = level === l.key;
                return (
                  <button
                    key={l.key}
                    onClick={() => setLevel(l.key)}
                    aria-pressed={active}
                    className={`rounded-lg px-5 py-2 font-display text-sm font-semibold tracking-tight tactile transition-colors ${FOCUS} ${
                      active ? "bg-accent text-void" : "text-mist hover:text-chalk"
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-fog">
              Controls difficulty and how much each question asks — Junior is smaller and guided.
            </p>
          </div>

          {/* company style */}
          <div className="mt-7">
            <p id="company-style-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-fog">
              COMPANY STYLE
            </p>
            <div role="group" aria-labelledby="company-style-label" className="grid gap-3 sm:grid-cols-2">
              {COMPANY_STYLES.map((c) => {
                const active = companyStyle === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCompanyStyle(c.id)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left tactile transition-colors ${FOCUS} ${
                      active
                        ? "border-accent bg-accent/10"
                        : "border-line bg-ink hover:border-line-bright"
                    }`}
                  >
                    <span
                      className={`font-display text-lg font-semibold tracking-tight ${
                        active ? "text-chalk" : "text-mist"
                      }`}
                    >
                      {c.name}
                    </span>
                    <span className="mt-1 block text-xs text-fog">{c.description}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-fog">Crucible isn't affiliated with these companies.</p>
          </div>

          {/* video interview opt-in */}
          <div className="mt-7">
            <p className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-fog">
              FORMAT
            </p>
            <button
              onClick={() => setUseVideo((v) => !v)}
              aria-pressed={useVideo}
              className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left tactile transition-colors ${FOCUS} ${
                useVideo ? "border-accent bg-accent/10" : "border-line bg-ink hover:border-line-bright"
              }`}
            >
              <div className="flex items-center gap-3">
                <VideoCamera
                  size={22}
                  weight={useVideo ? "fill" : "regular"}
                  className={useVideo ? "text-accent" : "text-fog"}
                />
                <div>
                  <span
                    className={`font-display text-[15px] font-semibold tracking-tight ${
                      useVideo ? "text-chalk" : "text-mist"
                    }`}
                  >
                    Live video interviewer
                  </span>
                  <span className="mt-0.5 block text-xs text-fog">
                    A real face greets you and asks the questions on camera. Otherwise: voice + a
                    stylized avatar.
                  </span>
                </div>
              </div>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  useVideo ? "bg-accent" : "bg-surface-2"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white-pure transition-transform ${
                    useVideo ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          </div>

          {/* resume */}
          <Field
            label="YOUR RESUME"
            value={resume}
            onChange={setResume}
            placeholder="Paste your full resume — skills, projects, experience, dates. The more detail, the sharper the questions."
            onSample={() => setResume(SAMPLE_RESUME)}
          />
          <Field
            label="JOB DESCRIPTION"
            value={jd}
            onChange={setJd}
            placeholder="Paste the full job description — requirements, responsibilities, what they're looking for."
            onSample={() => setJd(SAMPLE_JD)}
          />

          <div className="mt-9 flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <MagneticButton onClick={handleStart} disabled={!canStart} className={FOCUS}>
                {starting ? "Building your interview…" : "Begin interview"}
                {!starting && <ArrowRight size={17} weight="bold" />}
              </MagneticButton>
              {!canStart && !starting && (
                <span className="font-mono text-[11px] text-fog">
                  Paste your full resume and JD to continue
                </span>
              )}
            </div>
            {startError && (
              <p className="font-mono text-[11px] text-fail">{startError}</p>
            )}
          </div>
        </section>

        <SidePanel starting={starting} />
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  onSample,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onSample: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [extracting, setExtracting] = useState(false);
  const [fileError, setFileError] = useState("");

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files are supported.");
      return;
    }
    setFileError("");
    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length < 20) {
        setFileError("Couldn't read text from this PDF. Try pasting manually.");
      } else {
        onChange(text);
      }
    } catch {
      setFileError("Failed to parse PDF. Paste the text directly instead.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="mt-7">
      <div className="mb-2.5 flex items-center justify-between">
        <label htmlFor={id} className="font-mono text-[11px] tracking-[0.16em] text-fog">{label}</label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={extracting}
            className={`inline-flex items-center gap-1.5 font-mono text-[11px] text-fog transition-colors hover:text-chalk disabled:opacity-40 ${FOCUS}`}
          >
            <UploadSimple size={13} weight="bold" />
            {extracting ? "READING…" : "UPLOAD PDF"}
          </button>
          <button
            onClick={onSample}
            className={`inline-flex items-center gap-1.5 font-mono text-[11px] text-accent transition-opacity hover:opacity-70 ${FOCUS}`}
          >
            <Sparkle size={13} weight="fill" />
            USE SAMPLE
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className={`w-full resize-none rounded-2xl border border-line bg-ink p-4 text-sm leading-relaxed text-chalk placeholder:text-fog focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 ${FOCUS}`}
      />
      {fileError && (
        <p className="mt-1.5 font-mono text-[11px] text-fail">{fileError}</p>
      )}
    </div>
  );
}

function SidePanel({ starting }: { starting: boolean }) {
  const steps = [
    { n: "01", t: "Intake Agent", d: "Parses resume + JD into structured gaps" },
    { n: "02", t: "Planner Agent", d: "Orders questions, weights your weak spots" },
    { n: "03", t: "Interviewer", d: "Runs the live session, pushes back" },
    { n: "04", t: "Evaluator", d: "Scores survival against a real rubric" },
    { n: "05", t: "Memory Agent", d: "Remembers, so next time is harder" },
  ];
  return (
    <aside className="lg:sticky lg:top-24 lg:h-fit">
      <div className="rounded-3xl border border-line bg-ink p-7">
        <span className="font-mono text-[11px] tracking-[0.16em] text-fog">THE PIPELINE</span>
        <div className="mt-5 space-y-1">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              animate={
                starting
                  ? { opacity: [0.4, 1, 0.4] }
                  : { opacity: 1 }
              }
              transition={
                starting
                  ? { duration: 1.4, repeat: Infinity, delay: i * 0.18 }
                  : { duration: 0.3 }
              }
              className="flex items-start gap-4 rounded-xl px-3 py-3"
            >
              <span className="font-mono text-xs text-accent">{s.n}</span>
              <div>
                <p className="font-display text-[15px] font-semibold tracking-tight text-chalk">
                  {s.t}
                </p>
                <p className="text-xs text-fog">{s.d}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </aside>
  );
}
