import { useCallback, useState } from "react";
import { useDeepgramSTT } from "./useDeepgramSTT";
import { useSpeechRecognition } from "./useSpeechRecognition";

// The candidate's microphone: Deepgram when the backend has it configured
// (far more accurate), otherwise the browser's own recognizer. Once Deepgram
// can't start (not configured, mic or network trouble) the session stays on
// the browser recognizer so every later answer doesn't wait on a failed try.
// On Deepgram Flux, onTurnEnd fires when the candidate has finished a thought and
// semantic is true; it returns true when the text was used up (see useDeepgramSTT).
// start(true) is Flux-only: it never starts Nova-3 or the browser recognizer.
export function useSpeechInput(keyterms: readonly string[] = [], onTurnEnd?: (text: string) => boolean) {
  const browser = useSpeechRecognition();
  const deepgram = useDeepgramSTT(keyterms, onTurnEnd);
  const [useBrowser, setUseBrowser] = useState(!deepgram.supported);
  const active = useBrowser ? browser : deepgram;

  const { start: startBrowser } = browser;
  const { start: startDeepgram } = deepgram;
  const start = useCallback((fluxOnly = false) => {
    if (useBrowser) {
      if (!fluxOnly) startBrowser();
      return;
    }
    void startDeepgram(fluxOnly).then((ok) => {
      if (ok || fluxOnly) return;
      setUseBrowser(true);
      startBrowser();
    });
  }, [useBrowser, startBrowser, startDeepgram]);

  return {
    supported: browser.supported || deepgram.supported,
    listening: active.listening,
    transcript: active.transcript,
    semantic: !useBrowser && deepgram.semantic,
    start,
    stop: active.stop,
  };
}
