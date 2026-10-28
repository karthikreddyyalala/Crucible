const MAX_VALUE = 1000;

/** A value as Python would print it: None / True / False, lists with ", ". Long values cut short. */
export function formatValue(value: unknown): string {
  const text = pythonish(value);
  return text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
}

function pythonish(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (Array.isArray(value)) return `[${value.map(pythonish).join(", ")}]`;
  if (typeof value === "object") {
    return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pythonish(v)}`).join(", ")}}`;
  }
  return JSON.stringify(value);
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
): DesignCall[] {
  return test.ops.map((op, i) => {
    const ran = i < got.length;
    const want = formatValue(expected[i]);
    const have = ran ? formatValue(got[i]) : "—";
    return { call: `${op}(${(test.args[i] ?? []).map(formatValue).join(", ")})`, expected: want, got: have, ok: ran && want === have };
  });
}

export const isMac = (platform: string) => /mac|iphone|ipad/i.test(platform);
