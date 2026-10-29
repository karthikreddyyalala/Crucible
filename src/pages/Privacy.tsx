import { Link } from "react-router-dom";
import { TopBar } from "@/components/TopBar";

const UPDATED = "July 2026";

export function Privacy() {
  return (
    <div className="min-h-[100dvh]">
      <TopBar />
      <main className="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
        <p className="font-mono text-xs tracking-[0.2em] text-accent">PRIVACY & TERMS</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-tight text-white-pure">
          What Crucible does with your data.
        </h1>
        <p className="mt-3 font-mono text-xs text-mist">Last updated {UPDATED}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-mist">
          <Section title="Plain-English summary">
            Crucible is a practice tool. You paste a resume and job description; it runs a
            mock interview and remembers your recurring weak spots so future sessions get
            harder where you struggle. It is not affiliated with any employer and does not
            share your data with recruiters.
          </Section>

          <Section title="What we collect">
            <ul className="ml-4 list-disc space-y-2 marker:text-fog">
              <li>
                <span className="text-chalk">Resume and job-description text</span> you paste,
                used only to generate your interview for that session.
              </li>
              <li>
                <span className="text-chalk">Your email address</span>, if you create an
                account, held by Amazon Cognito so you can sign in.
              </li>
              <li>
                <span className="text-chalk">Your answers</span> during the interview, used to
                score the session.
              </li>
              <li>
                <span className="text-chalk">Weak-spot labels and scores</span> (for example
                "No edge cases", an average score), stored against your account id, or a random
                id made by your browser when you aren't signed in. Never against your name.
              </li>
            </ul>
          </Section>

          <Section title="Where it goes">
            <ul className="ml-4 list-disc space-y-2 marker:text-fog">
              <li>
                Your resume, job description, and answers are sent to{" "}
                <span className="text-chalk">Anthropic Claude via Amazon Bedrock</span> to run
                the interview. They are processed to generate questions and feedback.
              </li>
              <li>
                Your weak-spot history is stored in{" "}
                <span className="text-chalk">Amazon DynamoDB</span> so your progress persists
                across sessions.
              </li>
              <li>
                Your in-progress session is autosaved to your browser's local storage so a
                refresh doesn't lose it. It never leaves your device.
              </li>
            </ul>
          </Section>

          <Section title="What we do NOT do">
            <ul className="ml-4 list-disc space-y-2 marker:text-fog">
              <li>We do not ask for your name beyond what the interviewer calls you.</li>
              <li>We do not sell your data or share it with employers or third parties.</li>
              <li>We do not use your resume to train any model.</li>
            </ul>
          </Section>

          <Section title="Deleting your data">
            Clearing your browser's site data for Crucible removes your local session. If
            you use Crucible without an account, that also disconnects you from your stored
            weak-spot history. Deleting an account and its history isn't something you can
            do from the app yet.
          </Section>

          <Section title="Terms, briefly">
            Crucible is provided as-is for interview practice. Its feedback is AI-generated
            and may be wrong. Treat it as practice signal, not a guarantee of real
            interview outcomes. Don't paste anything you're not comfortable sending to an AI
            model for processing.
          </Section>
        </div>

        <Link
          to="/"
          className="mt-12 inline-flex min-h-11 items-center rounded-lg text-sm text-accent underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Back to Crucible
        </Link>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-chalk">{title}</h2>
      {children}
    </section>
  );
}
