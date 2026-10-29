// Raw tags like "vague-impact" or "no_edge_cases" read as code; show them as words.
export function humanizeTag(tag: string): string {
  const text = tag.split(/[-_]+/).filter(Boolean).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
