import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// The interviewer's voice via ElevenLabs, proxied through the backend's
// /api/tts (the API key never reaches the browser). When the backend has no
// key (or in mock mode) the first call reports unavailable and every line
// goes to `fallback` — the browser's built-in voice — from then on.
export function useElevenLabsTTS() {
  const [available, setAvailable] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Bumped on every speak/cancel so a slow fetch can't start stale audio.
  const genRef = useRef(0);

  // Create the element inside a click so later play() calls are allowed.
  const unlock = useCallback(() => {
    audioRef.current ??= new Audio();
  }, []);

  const cancel = useCallback(() => {
    genRef.current += 1;
    audioRef.current?.pause();
    setSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string, fallback: (text: string) => void) => {
      if (!text.trim()) return;
      if (!available) return fallback(text);
      cancel();
      const gen = genRef.current;
      setSpeaking(true);
      let blob: Blob | null = null;
      let failed = false;
      try {
        blob = await api.tts(text); // null = not configured
      } catch {
        failed = true; // network/provider error — fall back for this line only
      }
      if (gen !== genRef.current) return;
      if (!blob) {
        setSpeaking(false);
        if (!failed) setAvailable(false);
        return fallback(text);
      }
      const audio = (audioRef.current ??= new Audio());
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (gen === genRef.current) setSpeaking(false);
      };
      try {
        await audio.play();
      } catch {
        URL.revokeObjectURL(url);
        setSpeaking(false);
        fallback(text);
      }
    },
    [available, cancel]
  );

  useEffect(() => cancel, [cancel]);

  return { speak, cancel, unlock, speaking, available };
}
