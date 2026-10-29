import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ChatMessage } from "@/stores/sessionStore";

interface Props {
  messages: ChatMessage[];
  thinking: boolean;
  /** Rendered just before the message with id `insetBefore` (e.g. the coding problem on small screens). */
  inset?: ReactNode;
  insetBefore?: string;
  /** Narrow column inside the coding workspace. */
  compact?: boolean;
  /** Announce new lines to screen readers. Off while the voice speaks them, so nothing is heard twice. */
  live?: boolean;
}

/** The interview thread: scrolls to the newest line and says so when the interviewer is slow. */
export function ChatTranscript({ messages, thinking, inset, insetBefore, compact = false, live = true }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo?.({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  // Flag a slow request after 6 seconds so we can show a reassurance message.
  useEffect(() => {
    if (!thinking) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(t);
  }, [thinking]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div
        role="log"
        aria-label="Conversation with Marcus"
        aria-live={live ? "polite" : "off"}
        aria-relevant="additions"
        className={compact ? "space-y-5 px-6 py-6" : "mx-auto max-w-[820px] space-y-5 px-5 py-8 sm:px-8"}
      >
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <Fragment key={m.id}>
              {/* Read on demand, not announced in full when it appears. */}
              {inset && m.id === insetBefore && <div aria-live="off">{inset}</div>}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className={m.speaker === "candidate" ? "flex justify-end" : "flex justify-start"}
              >
                <div className={m.speaker === "candidate" ? "max-w-[80%]" : "max-w-[88%]"}>
                  {m.speaker === "interviewer" && (
                    <span
                      className={`mb-1.5 block font-mono text-[10px] tracking-[0.16em] ${
                        m.kind === "follow_up" ? "text-accent" : "text-mist"
                      }`}
                    >
                      {m.kind === "follow_up" ? "MARCUS · FOLLOW-UP" : "MARCUS · INTERVIEWER"}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-3 font-sans text-[15.5px] leading-relaxed ${
                      m.speaker === "candidate"
                        ? "bg-surface-2 text-chalk"
                        : m.kind === "follow_up"
                        ? "border border-accent/40 bg-accent/[0.07] text-chalk"
                        : "bg-surface text-chalk"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              </motion.div>
            </Fragment>
          ))}
        </AnimatePresence>

        {thinking && <ThinkingBubble slow={slow} />}
      </div>
    </div>
  );
}

function ThinkingBubble({ slow }: { slow: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
      <div className="rounded-2xl bg-surface px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-fog"
                animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
              />
            ))}
          </div>
          <AnimatePresence>
            {slow && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="font-mono text-[10px] tracking-wide text-mist"
              >
                Still thinking…
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
