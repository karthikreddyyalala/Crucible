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
