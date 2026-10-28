import type { ReactNode } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import type { PublicProblem } from "@/lib/coding/types";
import { designCalls } from "./format";

interface Props {
  status: "loading" | "ready" | "error";
  problem: PublicProblem | null;
  onRetry: () => void;
}

const DIFFICULTY: Record<PublicProblem["difficulty"], string> = {
  easy: "border-survive/35 text-survive",
  medium: "border-line-bright text-chalk",
  hard: "border-fail/40 text-fail",
};

export function ProblemPanel({ status, problem, onRetry }: Props) {
  if (status === "error" || (status === "ready" && !problem)) {
    return (
      <div>
        <div className="flex items-start gap-3 rounded-xl border border-fail/30 bg-fail/[0.06] px-4 py-3">
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-fail" aria-hidden />
          <div className="font-sans text-[14px] leading-relaxed text-chalk">
            <p>Couldn't load this problem. Check your connection and retry — you can keep talking with Marcus meanwhile.</p>
            <button
              onClick={onRetry}
              className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line-bright px-4 text-[14px] text-chalk tactile transition-colors hover:border-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <ArrowClockwise size={16} weight="bold" aria-hidden />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!problem) return <ProblemSkeleton />;

  return (
    <article aria-labelledby="problem-title">
      <h1 id="problem-title" className="font-display text-[22px] font-semibold leading-tight tracking-tight text-white-pure">
        {problem.title}
      </h1>
      {/* Difficulty only: topic tags would name the technique, which Marcus never does. */}
      <p className="mt-3">
        <span className="sr-only">Difficulty: </span>
        <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${DIFFICULTY[problem.difficulty]}`}>
          {problem.difficulty}
        </span>
      </p>

      <div className="mt-5 max-w-[70ch] space-y-4 font-sans text-[16px] leading-[1.6] text-chalk/90">
        <Statement text={problem.statement} />
      </div>

      <div className="mt-7 max-w-[70ch] space-y-5">
        {problem.examples.map((ex, i) => (
          <section key={i} aria-label={`Example ${i + 1}`}>
            <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist">Example {i + 1}</h2>
            <div className="rounded-lg border border-line bg-surface px-4 py-3 font-mono text-[13px] leading-relaxed">
              {problem.kind === "design" ? (
                <DesignExample input={ex.input} output={ex.output} />
              ) : (
                <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1">
                  <dt className="text-mist">Input</dt>
                  <dd className="whitespace-pre-wrap break-words text-chalk">{ex.input}</dd>
                  <dt className="text-mist">Output</dt>
                  <dd className="whitespace-pre-wrap break-words text-chalk">{ex.output}</dd>
                </dl>
              )}
            </div>
            {ex.explanation && (
              <p className="mt-2 font-sans text-[14px] leading-relaxed text-mist">
                <Inline text={ex.explanation} />
              </p>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

/** Paragraphs, "- " lists and `code` spans. Built from React nodes, never HTML. */
function Statement({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((block, i) => {
        const lines = block.split("\n");
        const items = lines.filter((l) => l.startsWith("- "));
        const lead = lines.filter((l) => !l.startsWith("- "));
        const constraints = block.startsWith("Constraints:");
        return (
          <div key={i}>
            {lead.length > 0 && (
              <p className={constraints ? "text-[15px] text-mist" : undefined}>
                {constraints ? (
                  <>
                    <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mist">Constraints</span>
                    <Inline text={lead.join(" ").replace(/^Constraints:\s*/, "")} />
                  </>
                ) : (
                  lead.map((line, j) => (
                    <span key={j}>
                      {j > 0 && <br />}
                      <Inline text={line} />
                    </span>
                  ))
                )}
              </p>
            )}
            {items.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-fog">
                {items.map((item, j) => (
                  <li key={j}>
                    <Inline text={item.slice(2)} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </>
  );
}

function Inline({ text }: { text: string }): ReactNode {
  return text.split("`").map((part, i) =>
    i % 2 ? (
      <code key={i} className="rounded bg-surface-2 px-1 py-px font-mono text-[0.86em] text-white-pure">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

/** Design examples arrive as two JSON lines (ops, args); show them as calls. */
function DesignExample({ input, output }: { input: string; output: string }) {
  let rows: ReturnType<typeof designCalls> | null = null;
  try {
    const [ops, args] = input.split("\n").map((line) => JSON.parse(line) as unknown);
    const returns = JSON.parse(output) as unknown;
    if (Array.isArray(ops) && Array.isArray(args) && Array.isArray(returns)) {
      rows = designCalls({ ops: ops.map(String), args: args.map((a) => (Array.isArray(a) ? a : [])) }, returns, returns);
    }
  } catch {
    rows = null;
  }
  if (!rows) return <pre className="whitespace-pre-wrap break-words text-chalk">{`${input}\n→ ${output}`}</pre>;
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="text-[10px] uppercase tracking-[0.14em] text-mist">
          <th className="pb-1 font-normal">Call</th>
          <th className="pb-1 font-normal">Returns</th>
        </tr>
      </thead>
      <tbody className="text-chalk">
        {rows.map((r, i) => (
          <tr key={i}>
            <td className="break-words py-px pr-4 align-top">{r.call}</td>
            <td className="break-words py-px align-top">{i === 0 ? "—" : r.expected}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProblemSkeleton() {
  return (
    <div role="status" aria-busy aria-label="Loading the problem">
      <div className="h-6 w-2/5 rounded bg-surface-2" />
      <div className="mt-4 flex gap-2">
        <div className="h-5 w-14 rounded-full bg-surface" />
        <div className="h-5 w-20 rounded-full bg-surface" />
      </div>
      <div className="mt-6 space-y-2.5">
        {[92, 100, 84, 96, 60].map((w, i) => (
          <div key={i} className="h-3.5 rounded bg-surface" style={{ width: `${w}%` }} />
        ))}
      </div>
      <div className="mt-8 h-20 rounded-lg bg-surface" />
    </div>
  );
}
