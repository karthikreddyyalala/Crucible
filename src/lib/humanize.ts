// "vague-impact" -> "Vague impact", "edge_cases" -> "Edge cases".
export function humanizeTag(tag: string): string {
  const words = tag.split(/[-_]+/).filter(Boolean).join(" ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
