import { useCallback, useRef } from "react";

// A quick "Mm-hm" the moment a spoken answer is sent, so the few seconds while
// Marcus thinks aren't dead air. Pre-recorded in his voice (public/backchannel/,
// made once by backend/cli/make_backchannel_clips.py). A missing clip just
// stays silent: never an error, never a different voice.
export const BACKCHANNEL_CLIPS = ["mm-hm", "mm", "right"].map(
  (name) => `${import.meta.env.BASE_URL}backchannel/${name}.mp3`,
);

export function nextClip(last: number, random: () => number = Math.random): number {
  if (last < 0) return Math.floor(random() * BACKCHANNEL_CLIPS.length);
  const i = Math.floor(random() * (BACKCHANNEL_CLIPS.length - 1));
  return i >= last ? i + 1 : i;
}

export function useBackchannel() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastRef = useRef(-1);

  // Create the element inside a click so later play() calls are allowed.
  const unlock = useCallback(() => {
    audioRef.current ??= new Audio();
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    lastRef.current = nextClip(lastRef.current);
    audio.src = BACKCHANNEL_CLIPS[lastRef.current];
    try {
      void audio.play()?.catch(() => {});
    } catch {
      // some browsers throw instead of rejecting; a missed "Mm-hm" is fine
    }
  }, []);

  return { unlock, play };
}
