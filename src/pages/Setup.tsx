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

const SAMPLE_RESUME = `Maya Okonkwo, Backend Engineer
4 years experience. Built a realtime pricing engine in Go that cut p99 latency from 940ms to 180ms under burst load. Led active-active failover for checkout across 3 AWS regions using Kubernetes and Envoy. Strong in distributed systems, Postgres, Kafka. Mentored 2 junior engineers.`;

const SAMPLE_JD = `Senior Software Engineer, Payments Infrastructure
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
  full: "Mixed and adaptive: behavioral, one coding problem, technical & system design.",
  coding: "Live coding in Python or JavaScript with problems from the Blind 75.",
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
  const missing = whatsMissing(resume, jd);
  const canStart = !missing && !starting;

  const handleStart = async () => {
    setStartError("");
    try {
      await start({ resumeText: resume, jdText: jd, role, mode, level, candidateName: name, useVideo, companyStyle });
      navigate("/interview");
    } catch (e) {
      // api.ts already turns network and server failures into plain sentences.
      setStartError(e instanceof Error && e.message ? e.message : "Your interview couldn't start.");
    }
  };

  const weakTags = priorMemory?.recurringWeaknesses.slice(0, 3).map((w) => humanizeTag(w.tag)) ?? [];

  return (
    <div className="min-h-[100dvh]">
      <TopBar />

      <main className="mx-auto grid max-w-[1200px] gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section>
          <h1 className="font-display text-[clamp(2rem,4.5vw,3.2rem)] font-bold leading-[1.02] tracking-tight text-white-pure">
            Give it something real to work with.
          </h1>
          <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-mist">
            Paste your resume and the job you want. The questions aim at the gaps
            between the two, not a generic list.
          </p>

          {weakTags.length > 0 && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-2.5 border-l-2 border-accent pl-3 text-sm leading-relaxed text-mist"
            >
              <Brain size={18} weight="bold" className="mt-0.5 shrink-0 text-accent" aria-hidden />
              <span>
                This session leans on what you're working on:{" "}
                <span className="text-chalk">{weakTags.join(", ")}</span>.
              </span>
            </motion.p>
          )}

          {/* name */}
          <div className="mt-9">
            <label htmlFor="setup-name" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-mist">
              YOUR NAME
            </label>
            <input
              id="setup-name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="What should the interviewer call you?"
              className={`w-full rounded-xl border border-line bg-ink px-4 py-3 text-[15px] text-chalk placeholder:text-fog focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 ${FOCUS}`}
            />
          </div>

          {/* role */}
          <div className="mt-7">
            <p id="role-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-mist">
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
                    <span className="mt-1 block text-xs text-mist">{r.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* mode */}
          <div className="mt-7">
            <p id="mode-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-mist">
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
            <p className="mt-2 text-xs text-mist">
              {MODE_HINT[mode] ?? "Focused track. Every question stays in this area."}
            </p>
          </div>

          {/* level */}
          <div className="mt-7">
            <p id="level-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-mist">
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
                    className={`min-h-11 rounded-lg px-5 py-2 font-display text-sm font-semibold tracking-tight tactile transition-colors ${FOCUS} ${
                      active ? "bg-accent text-void" : "text-mist hover:text-chalk"
                    }`}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-mist">
              Controls difficulty and how much each question asks. Junior is smaller and guided.
            </p>
          </div>

          {/* company style */}
          <div className="mt-7">
            <p id="company-style-label" className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-mist">
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
                    <span className="mt-1 block text-xs text-mist">{c.description}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-mist">Crucible isn't affiliated with these companies.</p>
          </div>

          {/* video interview opt-in */}
          <div className="mt-7">
            <p className="mb-2.5 block font-mono text-[11px] tracking-[0.16em] text-mist">
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
                  <span className="mt-0.5 block text-xs text-mist">
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
            placeholder="Paste your full resume: skills, projects, experience, dates. The more detail, the sharper the questions."
            sample={SAMPLE_RESUME}
          />
          <Field
            label="JOB DESCRIPTION"
            value={jd}
            onChange={setJd}
            placeholder="Paste the full job description: requirements, responsibilities, what they're looking for."
            sample={SAMPLE_JD}
          />

          <div className="mt-9 flex flex-col items-start gap-3">
            <MagneticButton
              onClick={handleStart}
              disabled={!canStart}
              className={`w-full sm:w-auto ${FOCUS}`}
              aria-describedby="begin-status"
            >
              {starting ? "Building your interview…" : "Begin interview"}
              {!starting && <ArrowRight size={17} weight="bold" aria-hidden />}
            </MagneticButton>
            <p id="begin-status" aria-live="polite" className="text-sm text-mist empty:hidden">
              {starting
                ? "Reading your resume and the job description, then choosing your questions…"
                : missing}
            </p>
            {startError && !starting && (
              <div role="alert" className="flex flex-wrap items-center gap-x-3 border-l-2 border-fail pl-3 text-sm text-chalk">
                <span>{startError} Everything you entered is kept.</span>
                <button
                  onClick={handleStart}
                  className={`min-h-11 rounded text-accent underline-offset-4 hover:underline ${FOCUS}`}
                >
                  Try again
                </button>
              </div>
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
  sample,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  sample: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [extracting, setExtracting] = useState(false);
  const [fileError, setFileError] = useState("");

  // Sample text and PDFs replace the box wholesale; never throw away pasted text silently.
  const replace = (text: string) => {
    if (value.trim() && value !== text && !window.confirm(`Replace the text in ${label.toLowerCase()}?`)) return;
    onChange(text);
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("Only PDF files work here. Choose a PDF, or paste the text.");
      return;
    }
    setFileError("");
    setExtracting(true);
    try {
      const text = await extractPdfText(file);
      if (text.trim().length < 20) {
        setFileError("This PDF has no readable text (it may be a scan). Paste the text instead.");
      } else {
        replace(text);
      }
    } catch {
      setFileError("Couldn't open this PDF. Paste the text instead.");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="mt-7">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3">
        <label htmlFor={id} className="font-mono text-[11px] tracking-[0.16em] text-mist">{label}</label>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={extracting}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2 font-mono text-[11px] text-mist transition-colors hover:text-chalk disabled:opacity-40 ${FOCUS}`}
          >
            <UploadSimple size={13} weight="bold" aria-hidden />
            {extracting ? "READING…" : "UPLOAD PDF"}
          </button>
          <button
            onClick={() => replace(sample)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded px-2 font-mono text-[11px] text-accent transition-opacity hover:opacity-70 ${FOCUS}`}
          >
            <Sparkle size={13} weight="fill" aria-hidden />
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
        <p role="alert" className="mt-1.5 text-sm text-fail">{fileError}</p>
      )}
    </div>
  );
}

function SidePanel({ starting }: { starting: boolean }) {
  const steps = [
    "We read your resume and the job, and find the gaps between them.",
    "You get a short interview aimed at those gaps, with follow-ups on vague answers.",
    "Each answer gets a straight call: would it hold up in a real interview, and why.",
    "Your weak spots carry over, so the next session works on them.",
  ];
  return (
    <aside className="border-t border-line pt-8 lg:sticky lg:top-24 lg:h-fit lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
      <h2 className="font-display text-lg font-semibold tracking-tight text-chalk">What happens next</h2>
      <ol className="mt-5 space-y-4">
        {steps.map((t, i) => (
          <motion.li
            key={t}
            animate={starting ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
            transition={starting ? { duration: 1.4, repeat: Infinity, delay: i * 0.18 } : { duration: 0.3 }}
            className="flex gap-4 text-sm leading-relaxed text-mist"
          >
            <span className="font-mono text-xs leading-6 text-accent">{i + 1}</span>
            {t}
          </motion.li>
        ))}
      </ol>
    </aside>
  );
}

/** The sentence that says why Begin is off, or "" when everything needed is there. */
export function whatsMissing(resume: string, jd: string): string {
  const r = resume.trim().length;
  const j = jd.trim().length;
  return [
    r === 0 ? "Add your resume, or use the sample." : r <= 200 ? "Your resume looks short. Paste the full text." : "",
    j === 0 ? "Add the job description, or use the sample." : j <= 100 ? "The job description looks short. Paste all of it." : "",
  ].filter(Boolean).join(" ");
}

// ponytail: local copy until the shared @/lib/humanize lands from the dashboard work.
const humanizeTag = (tag: string) => tag.charAt(0).toUpperCase() + tag.slice(1).replace(/[-_]/g, " ");
