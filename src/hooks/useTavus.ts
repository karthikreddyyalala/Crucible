import { useCallback, useRef, useState } from "react";
import type {
  DailyCall,
  DailyEventObjectAppMessage,
  DailyEventObjectTrack,
} from "@daily-co/daily-js";
import { api } from "@/lib/api";

// Drives an optional Tavus video-avatar layer. It stays completely dormant
// until `activate()` is called, and even then does nothing unless the backend
// reports Tavus is configured (enabled:false by default) — so with no key set,
// the Daily SDK is never even imported and the app behaves exactly as before.
//
// The avatar runs in ECHO mode: Crucible's agents stay in control and we send
// the interviewer's lines to the replica to speak.

export type TavusStatus = "idle" | "connecting" | "ready" | "error" | "disabled";

// The replica can take a while to boot after we join its room. If its video
// hasn't arrived by then, give up and let the voice carry the interview.
export const READY_TIMEOUT_MS = 25_000;

export function useTavus() {
  const [status, setStatusState] = useState<TavusStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [videoTrack, setVideoTrack] = useState<MediaStreamTrack | null>(null);

  // Refs, not state: activate/deactivate are called from effects and click
  // handlers whose closures would see a stale status and start a second
  // (billed) conversation.
  const statusRef = useRef<TavusStatus>("idle");
  const attemptRef = useRef(0); // bumped by deactivate: an older attempt must stop
  const callRef = useRef<DailyCall | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStatus = useCallback((next: TavusStatus) => {
    statusRef.current = next;
    setStatusState(next);
  }, []);

  const teardown = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    // End the billed Tavus conversation first so we don't leak minutes.
    if (conversationIdRef.current) {
      void api.endAvatarSession(conversationIdRef.current);
    }
    const call = callRef.current;
    callRef.current = null;
    conversationIdRef.current = null;
    if (call) {
      try {
        await call.leave();
        call.destroy();
      } catch {
        /* already torn down */
      }
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.srcObject = null;
      audioElRef.current = null;
    }
    setVideoTrack(null);
    setSpeaking(false);
  }, []);

  const activate = useCallback(async () => {
    if (statusRef.current !== "idle") return;
    const attempt = ++attemptRef.current;
    const stale = () => attempt !== attemptRef.current;
    setStatus("connecting");

    const fail = async (err?: unknown) => {
      if (stale()) return;
      if (err) console.error("[useTavus] activation failed:", err);
      attemptRef.current += 1; // anything still in flight for this attempt stops
      await teardown();
      setStatus("error");
    };
    timeoutRef.current = setTimeout(() => void fail(new Error("the avatar didn't join in time")), READY_TIMEOUT_MS);

    try {
      const session = await api.avatarSession();
      if (stale()) {
        // Turned off (or timed out) while the conversation was being created.
        if (session.conversationId) void api.endAvatarSession(session.conversationId);
        return;
      }
      if (!session.enabled || !session.conversationUrl) {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setStatus("disabled");
        return;
      }
      conversationIdRef.current = session.conversationId;

      // Import the heavy WebRTC SDK only once we know Tavus is actually on.
      const { default: Daily } = await import("@daily-co/daily-js");
      if (stale()) return;
      const call = Daily.createCallObject({ subscribeToTracksAutomatically: true });
      callRef.current = call;

      // With createCallObject() nothing plays automatically — we render the
      // replica's video ourselves AND must play its audio ourselves, or it's
      // silent. Ready means the replica is actually in the room (its video
      // arrived): lines sent before that are dropped and Marcus says nothing.
      const onTrack = (ev: DailyEventObjectTrack) => {
        if (stale() || ev.participant?.local) return;
        if (ev?.track?.kind === "video") {
          setVideoTrack(ev.track);
          if (statusRef.current === "connecting") {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setStatus("ready");
          }
        } else if (ev?.track?.kind === "audio") {
          const el = (audioElRef.current ??= new Audio());
          el.srcObject = new MediaStream([ev.track]);
          el.autoplay = true;
          void el.play().catch(() => {/* gesture already granted via VOICE */});
        }
      };
      // Mirror the avatar's speaking state onto the UI for lip-sync cues.
      const onAppMessage = (ev: DailyEventObjectAppMessage<{ event_type?: string }>) => {
        const t = ev?.data?.event_type;
        if (t === "conversation.replica.started_speaking") setSpeaking(true);
        if (t === "conversation.replica.stopped_speaking") setSpeaking(false);
      };
      call.on("track-started", onTrack);
      call.on("app-message", onAppMessage);

      // We only RECEIVE from Tavus (echo mode). Don't publish our cam/mic into
      // the room — the candidate's answers reach the agents via our own STT.
      await call.join({ url: session.conversationUrl, startVideoOff: true, startAudioOff: true });
    } catch (err) {
      await fail(err);
    }
  }, [setStatus, teardown]);

  // Echo mode: tell the replica exactly what to say (agents stay in control).
  const speak = useCallback((text: string) => {
    const call = callRef.current;
    const conversationId = conversationIdRef.current;
    if (!call || !conversationId || !text.trim()) return;
    call.sendAppMessage(
      {
        message_type: "conversation",
        event_type: "conversation.echo",
        conversation_id: conversationId,
        properties: { text },
      },
      "*"
    );
  }, []);

  const deactivate = useCallback(async () => {
    attemptRef.current += 1; // cancels an activation that's still in flight
    await teardown();
    setStatus("idle");
  }, [setStatus, teardown]);

  const ready = status === "ready";
  return { activate, deactivate, speak, status, ready, speaking, videoTrack };
}
