import { useCallback, useEffect, useRef, useState } from "react";

// Speech-to-text for the candidate's spoken answers. Uses the free browser
// SpeechRecognition API (Chrome/Edge/Safari). PROVIDER SEAM: to upgrade to
// Deepgram, replace the recognition engine with a mic MediaStream piped to a
// Deepgram websocket; keep the same { listening, transcript, start, stop }
// surface so callers don't change.
export function useSpeechRecognition() {
  const supported =
    typeof window !== "undefined" &&
    (Boolean(window.SpeechRecognition) || Boolean(window.webkitSpeechRecognition));

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Chrome stops the engine on its own after a short pause in speech, even
  // with continuous=true — that firing is indistinguishable from the user
  // clicking stop unless we track intent separately. shouldListenRef is the
  // user's intent; onend only treats the engine stopping as "done" when the
  // user didn't ask for that, and auto-restarts otherwise so a pause mid-
  // answer doesn't silently kill dictation.
  const shouldListenRef = useRef(false);

  useEffect(() => {
    if (!supported) return;
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = "";
      for (let i = 0; i < event.results.length; i += 1) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text.trim());
    };
    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          /* fall through to reporting stopped */
        }
      }
      setListening(false);
    };
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" fires on an ordinary pause while thinking — not a real
      // failure, so let onend's auto-restart handle it. Anything else (mic
      // permission denied, device gone) is fatal: stop for real.
      if (event.error === "no-speech") return;
      shouldListenRef.current = false;
      setListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      shouldListenRef.current = false;
      try {
        recognition.abort();
      } catch {
        /* already stopped */
      }
    };
  }, [supported]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    setTranscript("");
    shouldListenRef.current = true;
    try {
      recognition.start();
      setListening(true);
    } catch {
      /* start() throws if already running — ignore */
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    shouldListenRef.current = false;
    try {
      recognition.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  return { supported, listening, transcript, start, stop };
}
