// Raw tags like "vague-impact" or "no_edge_cases" read as code; show them as words.
export function humanizeTag(tag: string): string {
  const text = tag.split(/[-_]+/).filter(Boolean).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// One name per interview mode, wherever a mode is shown.
export const MODE_LABEL: Record<string, string> = {
  full: "Full mock",
  behavioral: "Behavioral",
  technical: "Technical",
  system_design: "System design",
  coding: "Coding",
};

// Session dates are YYYY-MM-DD; read them as local days so they don't slip back a day west of UTC.
export function formatDay(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, options);
}

// The same words for progress on Results and the Dashboard.
export const formatAverage = (avg: number): string => `${avg.toFixed(1)} of 5`;
export const WEAK_SPOT_HINT = "Your next interview asks more about these.";
export const WEAK_SPOT_EMPTY =
  "Nothing keeps coming back yet. Weak spots appear here once the same one shows up in your answers.";
export const TREND_HEADING = "How your scores are moving";
export const TREND_HINT = "Average score per interview, out of 5.";
