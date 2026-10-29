import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Microphone, Waveform, PaperPlaneTilt, CornersIn } from "@phosphor-icons/react";

// Full-screen "video call" with the interviewer. Purely presentational — it
// reuses the interview's existing speech-recognition + submit, just presented
// like a live call: big face, a mic button to speak, and captions.
export function TavusCallOverlay({
  videoTrack,
  speaking,
  questionText,
  listening,
  draft,
  thinking,
  sttSupported,
  followUpLabel,
  onToggleMic,
  onSend,
  onClose,
}: {
  videoTrack: MediaStreamTrack | null;
  speaking: boolean;
  questionText: string;
  listening: boolean;
  draft: string;
  thinking: boolean;
  sttSupported: boolean;
  followUpLabel?: string;
  onToggleMic: () => void;
  onSend: () => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !videoTrack) return;
    el.srcObject = new MediaStream([videoTrack]);
    el.play().catch(() => {});
    return () => {
      el.srcObject = null;
    };
  }, [videoTrack]);

  // Escape minimizes, like any overlay.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const caption = thinking
    ? "Marcus is thinking…"
    : speaking
    ? "Marcus is speaking."
    : listening
    ? "Listening. Speak your answer."
    : sttSupported
    ? "Tap the mic and answer out loud."
    : "Minimize to type your answer.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Video call with Marcus"
      className="fixed inset-0 z-[60] flex flex-col bg-void/95 backdrop-blur-xl"
    >
      {/* top bar: question + minimize */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="max-w-[70ch]">
          {followUpLabel && (
            <span className="font-mono text-[10px] tracking-[0.16em] text-accent">{followUpLabel}</span>
          )}
          <p className="mt-1 text-[15px] leading-relaxed text-chalk">{questionText}</p>
        </div>
        <button
          onClick={onClose}
          title="Minimize (Esc)"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line-bright px-4 font-sans text-[13px] text-mist tactile transition-colors hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <CornersIn size={14} weight="bold" aria-hidden />
          Minimize
        </button>
      </div>

      {/* the face */}
      <div className="relative flex flex-1 items-center justify-center px-5">
        <motion.div
          className="relative aspect-square w-full max-w-[min(70vh,560px)] overflow-hidden rounded-[2rem] border border-line-bright bg-surface"
          animate={
            speaking
              ? { boxShadow: "0 0 0 2px var(--color-accent), 0 0 60px -10px var(--color-accent)" }
              : { boxShadow: "0 0 0 1px var(--color-line)" }
          }
          transition={{ duration: 0.3 }}
        >
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
          {speaking && (
            <div aria-hidden className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <span className="rounded-full bg-void/70 px-3 py-1 font-sans text-[12px] text-accent">Speaking</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* controls */}
      <div className="px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-[640px]">
          {/* live transcript of what you're saying */}
          <div className="mb-4 min-h-[48px] rounded-2xl border border-line bg-ink px-4 py-3 font-sans text-[15px] leading-relaxed text-chalk">
            {draft || <span className="text-mist">{caption}</span>}
          </div>
          <p role="status" className="sr-only">
            {caption}
          </p>

          <div className="flex items-center justify-center gap-4">
            {sttSupported && (
              <button
                onClick={onToggleMic}
                disabled={thinking}
                autoFocus
                className={`grid h-16 w-16 place-items-center rounded-full tactile transition-colors disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  listening
                    ? "bg-survive/20 text-survive ring-2 ring-survive/40"
                    : "border border-line-bright text-chalk hover:bg-surface"
                }`}
                aria-label={listening ? "Stop speaking" : "Start speaking"}
              >
                {listening ? (
                  <motion.span
                    animate={{ scale: [1, 0.82, 1] }}
                    transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Waveform size={26} weight="fill" />
                  </motion.span>
                ) : (
                  <Microphone size={26} weight="bold" />
                )}
              </button>
            )}
            <button
              onClick={onSend}
              disabled={!draft.trim() || thinking}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 font-sans text-sm font-semibold text-void tactile transition-opacity disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <PaperPlaneTilt size={17} weight="fill" aria-hidden />
              {thinking ? "Sending…" : "Send answer"}
            </button>
          </div>

          <p className="mt-4 text-center font-sans text-[12px] text-mist">
            {sttSupported ? "Mic to speak. " : ""}Minimize (Esc) to type instead.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
