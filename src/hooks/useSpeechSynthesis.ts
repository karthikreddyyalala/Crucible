import { useCallback, useEffect, useRef, useState } from "react";

// Text-to-speech for the interviewer's voice. Uses the free browser
// SpeechSynthesis API. PROVIDER SEAM: to upgrade to ElevenLabs, swap the body
// of `speak` to fetch synthesized audio and play it through an <audio> element
// (and feed it to an AnalyserNode for true amplitude-driven lip movement).
// The hook's public shape (speak/cancel/speaking/supported) stays identical.
export function useSpeechSynthesis() {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  // Chrome garbage-collects in-flight utterances (onend then never fires), so
  // keep references until they finish.
  const queueRef = useRef<SpeechSynthesisUtterance[]>([]);

  useEffect(() => {
    if (!supported) return;
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
      // Male (the interviewer, Marcus, is a man on screen), and preferably one
      // of the neural/"natural" voices — the robotic legacy ones are what make
      // an interviewer sound like a machine.
      const male = /\b(guy|christopher|eric|davis|andrew|brian|roger|steffan|daniel|aaron|alex|fred|tom|rishi|evan|nathan|male)\b/i;
      const natural = /natural|neural|premium|enhanced|online/i;
      voiceRef.current =
        voices.find((v) => male.test(v.name) && natural.test(v.name)) ??
        voices.find((v) => male.test(v.name) && /en[-_]US/i.test(v.lang)) ??
        voices.find((v) => male.test(v.name)) ??
        voices.find((v) => natural.test(v.name)) ??
        voices.find((v) => /en[-_]US/i.test(v.lang)) ??
        voices[0] ??
        null;
    };
    pickVoice();
    window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;
      // Chrome stops a single long utterance after ~15s, so speak sentence by sentence.
      const sentences = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g)?.map((t) => t.trim()).filter(Boolean) ?? [text];
      const utterances = sentences.map((sentence, i) => {
        const u = new SpeechSynthesisUtterance(sentence);
        if (voiceRef.current) u.voice = voiceRef.current;
        u.rate = 1;
        u.pitch = 1;
        if (i === 0) u.onstart = () => setSpeaking(true);
        if (i === sentences.length - 1) u.onend = () => setSpeaking(false);
        u.onerror = (e) => {
          // "interrupted"/"canceled" come from our own cancel() — not a failure.
          if (e.error !== "interrupted" && e.error !== "canceled") setSpeaking(false);
        };
        return u;
      });
      queueRef.current = utterances;
      const enqueue = () => {
        synth.resume(); // Safari/Chrome can be left paused after a tab switch
        utterances.forEach((u) => synth.speak(u));
      };
      // speak() right after cancel() is sometimes silently dropped in Chrome.
      if (synth.speaking || synth.pending) {
        synth.cancel();
        setTimeout(enqueue, 60);
      } else {
        enqueue();
      }
    },
    [supported]
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    queueRef.current = [];
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  // Stop any in-flight speech if the component using this unmounts.
  useEffect(() => cancel, [cancel]);

  return { speak, cancel, speaking, supported };
}
