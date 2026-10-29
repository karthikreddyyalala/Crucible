import { literal } from "@/lib/coding/summary";
import type { CodingLanguage } from "@/lib/coding/types";

const MAX_VALUE = 1000;

/** A value as the candidate's language prints it (None / True / False in Python), lists with ", ". Long values cut short. */
export function formatValue(value: unknown, language: CodingLanguage = "python"): string {
  const text = literal(value, language);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
}

/**
 * The harness reports "<Type>: <message> (line N)", optionally prefixed with the design /
 * roundtrip call ("Error in call 3 (search): ..."). Rewrite it in the guide's voice.
 */
export function describeError(raw: string, atLoad: boolean): { text: string; line: number | null } {
  const lineMatch = raw.match(/ \(line (\d+)\)$/);
  const line = lineMatch ? Number(lineMatch[1]) : null;
  let body = lineMatch ? raw.slice(0, lineMatch.index) : raw;
  const step = body.match(/^Error in ([^:]+): /);
  const where = step ? step[1] : "";
  if (step) body = body.slice(step[0].length);

  if (line === null) return { text: where ? `In ${where}: ${body}` : body, line };
  if (where) return { text: `In ${where}, line ${line} raised ${body}`, line };
  if (atLoad) {
    const sep = body.indexOf(": ");
    const text = sep < 0 ? `${body} on line ${line}` : `${body.slice(0, sep)} on line ${line}: ${body.slice(sep + 2)}`;
    return { text, line };
  }
  return { text: `Line ${line} raised ${body}`, line };
}

export interface DesignCall {
  call: string;
  expected: string;
  got: string;
  ok: boolean;
}

/** A design test as readable calls: `search("c.t")` → expected True, got False. */
export function designCalls(
  test: { ops: string[]; args: unknown[][] },
  expected: unknown[],
  got: unknown[],
  language: CodingLanguage = "python",
): DesignCall[] {
  const show = (value: unknown) => formatValue(value, language);
  return test.ops.map((op, i) => {
    const ran = i < got.length;
    const want = show(expected[i]);
    const have = ran ? show(got[i]) : "—";
    return { call: `${op}(${(test.args[i] ?? []).map(show).join(", ")})`, expected: want, got: have, ok: ran && want === have };
  });
}

export const isMac = (platform: string) => /mac|iphone|ipad/i.test(platform);
