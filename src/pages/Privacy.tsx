import { TopBar } from "@/components/TopBar";

const UPDATED = "July 2026";

export function Privacy() {
  return (
    <div className="min-h-[100dvh]">
      <TopBar />
      <main className="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
        <span className="font-mono text-xs tracking-[0.2em] text-accent">PRIVACY & TERMS</span>
        <h1 className="mt-3 font-display text-[clamp(2rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-tight text-white-pure">
          What Crucible does with your data.
        </h1>
        <p className="mt-3 font-mono text-xs text-fog">Last updated {UPDATED}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-mist">
          <Section title="Plain-English summary">
            Crucible is a practice tool. You paste a résumé and job description; it runs a
            mock interview and remembers your recurring weak spots so future sessions get
            harder where you struggle. It is not affiliated with any employer and does not
            share your data with recruiters.
          </Section>

          <Section title="What we collect">
            <ul className="ml-4 list-disc space-y-2 marker:text-fog">
              <li>
                <span className="text-chalk">Résumé and job-description text</span> you paste,
                used only to generate your interview for that session.
              </li>
              <li>
                <span className="text-chalk">Your answers</span> during the interview, used to
                score the session.
              </li>
              <li>
                <span className="text-chalk">Anonymous weakness tags and scores</span> (e.g.
                "no-edge-cases", an average score) stored against a random browser-generated
                id, never your name or email.
              </li>
            </ul>
          </Section>

          <Section title="Where it goes">
            <ul className="ml-4 list-disc space-y-2 marker:text-fog">
              <li>
                Your résumé, job description, and answers are sent to{" "}
                <span className="text-chalk">Anthropic Claude via Amazon Bedrock</span> to run
                the interview. They are processed to generate questions and feedback.
              </li>
              <li>
                Aggregated, anonymous weakness data is stored in{" "}
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
              <li>We do not require an account, name, or email.</li>
              <li>We do not sell your data or share it with employers or third parties.</li>
              <li>We do not use your résumé to train any model.</li>
            </ul>
          </Section>

          <Section title="Deleting your data">
            Because your data is keyed to an anonymous browser id, clearing your browser's
            site data for Crucible removes your local session and disconnects you from your
            stored weakness profile.
          </Section>

          <Section title="Terms, briefly">
            Crucible is provided as-is for interview practice. Its feedback is AI-generated
            and may be wrong. Treat it as practice signal, not a guarantee of real
            interview outcomes. Don't paste anything you're not comfortable sending to an AI
            model for processing.
          </Section>
        </div>
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
