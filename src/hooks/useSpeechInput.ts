import { useCallback, useState } from "react";
import { useDeepgramSTT } from "./useDeepgramSTT";
import { useSpeechRecognition } from "./useSpeechRecognition";

// The candidate's microphone: Deepgram when the backend has it configured
// (far more accurate), otherwise the browser's own recognizer. Once Deepgram
// can't start (not configured, mic or network trouble) the session stays on
// the browser recognizer so every later answer doesn't wait on a failed try.
export function useSpeechInput() {
  const browser = useSpeechRecognition();
  const deepgram = useDeepgramSTT();
  const [useBrowser, setUseBrowser] = useState(!deepgram.supported);
  const active = useBrowser ? browser : deepgram;

  const { start: startBrowser } = browser;
  const { start: startDeepgram } = deepgram;
  const start = useCallback(() => {
    if (useBrowser) {
      startBrowser();
      return;
    }
    void startDeepgram().then((ok) => {
      if (ok) return;
      setUseBrowser(true);
      startBrowser();
    });
  }, [useBrowser, startBrowser, startDeepgram]);

  return {
    supported: browser.supported || deepgram.supported,
    listening: active.listening,
    transcript: active.transcript,
    start,
    stop: active.stop,
  };
}
