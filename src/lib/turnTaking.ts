// How long the candidate can stay silent, in hands-free voice mode, before
// their answer is sent. A flat timer cuts people off mid-thought; trailing off
// on a connector or filler ("…and then we, um") means they aren't done, so
// wait longer there. ponytail: word-list heuristic; upgrade to a semantic
// end-of-turn model (LiveKit/Pipecat turn detector) if it misfires.
export const SILENCE_SEND_MS = 2800;
export const MID_THOUGHT_SEND_MS = 6000;

const MID_THOUGHT =
  /\b(and|but|so|or|because|cause|since|then|which|that|if|when|like|um+|uh+|er|hmm+|the|a|an|to|of|with|for|is|was|basically|actually|i mean|you know)$/i;

export function silenceBeforeSendMs(transcript: string): number {
  const tail = transcript.trim().replace(/[\s,.…-]+$/, "");
  return MID_THOUGHT.test(tail) ? MID_THOUGHT_SEND_MS : SILENCE_SEND_MS;
}

// Barge-in: the mic is open while the interviewer talks, so his own voice can leak
// back in through the speakers, and people say "mm-hm" while listening. Only stop him
// for at least two words that aren't fillers and aren't words he's saying right now.
const FILLERS = new Set(["mm", "mmm", "mhm", "hm", "hmm", "uh", "um", "er", "ah", "oh", "ok", "okay", "yeah", "yep", "right", "sure"]);

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9']+/g) ?? [];
}

export function isRealInterruption(heard: string, interviewerLine: string): boolean {
  const his = new Set(words(interviewerLine));
  return words(heard).filter((w) => !FILLERS.has(w) && !his.has(w)).length >= 2;
}
