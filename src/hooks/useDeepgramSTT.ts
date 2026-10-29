import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Live transcription of the candidate through Deepgram. The mic is
// recorded in small Opus chunks and streamed over a WebSocket opened with a
// 30-second token from our backend; the API key never reaches the browser.
// Finished phrases are kept as they arrive, so a long answer can't lose its start.
// Same surface as useSpeechRecognition, except start() resolves false when
// Deepgram isn't available so the caller can fall back to the browser recognizer.
// Flux is tried first: it tells us when the candidate has finished a thought, so the
// answer goes when they're done instead of after a flat silence. If Flux won't open or
// rejects us, the rest of the session uses Nova-3 (phrases plus a silence timer).

// eot_timeout_ms: after 5 s of silence Flux ends the turn even if unsure.
const FLUX_URL =
  "wss://api.deepgram.com/v2/listen?model=flux-general-en&eot_threshold=0.7&eot_timeout_ms=5000";
const NOVA_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-3&smart_format=true&interim_results=true&endpointing=300";

// Nova-3 keyterm prompting: words an interview is full of that a general model mishears
// ("idempotent" came back as "eat important" in a live test). The candidate's own skills
// from their resume are added on top.
const INTERVIEW_TERMS = [
  "idempotent", "idempotency", "Kafka", "Kubernetes", "Postgres", "PostgreSQL", "Redis", "DynamoDB",
  "gRPC", "REST", "GraphQL", "microservices", "monolith", "latency", "throughput", "p99", "SLO",
  "sharding", "replication", "consistency", "eventual consistency", "cache", "load balancer",
  "rate limiter", "queue", "pub/sub", "API", "schema", "index", "Big O", "hash map", "linked list",
  "binary search", "recursion", "memoization", "dynamic programming", "two pointers", "BFS", "DFS",
  "heap", "trie", "STAR", "stakeholder", "on-call", "postmortem", "RAG", "embeddings", "LLM",
];
const MAX_TERMS = 80;

function withTerms(base: string, extraTerms: readonly string[]): string {
  const seen = new Set<string>();
  const terms = [...extraTerms, ...INTERVIEW_TERMS]
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && t.length <= 40 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, MAX_TERMS);
  return base + terms.map((t) => `&keyterm=${encodeURIComponent(t)}`).join("");
}
export function listenUrl(extraTerms: readonly string[] = []): string {
  return withTerms(NOVA_URL, extraTerms);
}
export function fluxUrl(extraTerms: readonly string[] = []): string {
  return withTerms(FLUX_URL, extraTerms);
}
const FLUX_OPEN_TIMEOUT_MS = 3_000; // fail over to Nova-3 quickly
const OPEN_TIMEOUT_MS = 5_000;
const CHUNK_MS = 100; // Flux wants ~80 ms; fine for Nova-3 too

function recorderMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

interface DeepgramResult {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: { transcript?: string }[] };
}

interface FluxTurnInfo {
  type?: string;
  event?: string;
  transcript?: string;
}

export function useDeepgramSTT(keyterms: readonly string[] = [], onTurnEnd?: (text: string) => void) {
  const supported =
    typeof window !== "undefined" &&
    typeof WebSocket !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    recorderMime() !== null;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [semantic, setSemantic] = useState(false); // on Flux: onTurnEnd marks the end of an answer
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalRef = useRef("");
  const busyRef = useRef(false); // a start in progress or running: never two streams
  const keytermsRef = useRef(keyterms);
  keytermsRef.current = keyterms;
  const onTurnEndRef = useRef(onTurnEnd);
  onTurnEndRef.current = onTurnEnd;
  const fluxFailedRef = useRef(false); // once Flux fails, the session stays on Nova-3

  const release = useCallback(() => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      socket.close();
    } else if (socket && socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
    busyRef.current = false;
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!supported || busyRef.current) return busyRef.current;
    busyRef.current = true;
    finalRef.current = "";
    setTranscript("");
    setListening(true); // shows the mic as live at once; reset below if it can't start

    const fail = () => {
      release();
      setListening(false);
      return false;
    };
    // stop() was pressed while we were still connecting: not a failure, so no fallback.
    const cancelled = () => {
      release();
      return true;
    };

    const token = await api.sttToken();
    if (!busyRef.current) return cancelled();
    if (!token) return fail();
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      return fail(); // mic permission denied: the browser recognizer will ask again
    }
    if (!busyRef.current) return cancelled();

    const open = (url: string, timeoutMs: number) =>
      new Promise<WebSocket | null>((resolve) => {
        const ws = new WebSocket(url, ["bearer", token]);
        socketRef.current = ws;
        const timer = setTimeout(() => {
          ws.close();
          resolve(null);
        }, timeoutMs);
        ws.onopen = () => {
          clearTimeout(timer);
          resolve(ws);
        };
        ws.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
      });

    const flux = fluxFailedRef.current ? null : await open(fluxUrl(keytermsRef.current), FLUX_OPEN_TIMEOUT_MS);
    if (!busyRef.current) return cancelled();
    const onFlux = flux !== null;
    let opened = flux;
    if (!opened) {
      fluxFailedRef.current = true; // the rest of the session goes straight to Nova-3
      opened = await open(listenUrl(keytermsRef.current), OPEN_TIMEOUT_MS);
      if (!busyRef.current) return cancelled();
      if (!opened) return fail();
    }
    const live: WebSocket = opened;
    setSemantic(onFlux);
    let heard = false;

    live.onmessage = (event: MessageEvent) => {
      if (onFlux) {
        const turn: FluxTurnInfo = JSON.parse(String(event.data));
        if (turn.type !== "TurnInfo") return;
        heard = true;
        const text = turn.transcript?.trim() ?? "";
        setTranscript(text);
        if (turn.event === "EndOfTurn" && text) onTurnEndRef.current?.(text);
        return;
      }
      const data: DeepgramResult = JSON.parse(String(event.data));
      if (data.type !== "Results") return;
      const text = data.channel?.alternatives?.[0]?.transcript?.trim() ?? "";
      if (data.is_final) {
        if (text) finalRef.current = `${finalRef.current} ${text}`.trim();
        setTranscript(finalRef.current);
      } else {
        setTranscript(`${finalRef.current} ${text}`.trim());
      }
    };
    live.onclose = () => {
      // Flux that closes before saying anything rejected us: don't try it again this session.
      if (onFlux && !heard) fluxFailedRef.current = true;
      // Dropped mid-answer (network): keep what was heard and show the mic as off.
      if (socketRef.current === live) {
        release();
        setListening(false);
      }
    };

    const recorder = new MediaRecorder(streamRef.current, { mimeType: recorderMime() ?? undefined });
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0 && live.readyState === WebSocket.OPEN) live.send(e.data);
    };
    recorder.start(CHUNK_MS);
    recorderRef.current = recorder;
    return true;
  }, [supported, release]);

  const stop = useCallback(() => {
    release();
    setListening(false);
  }, [release]);

  useEffect(() => release, [release]);

  return { supported, listening, transcript, semantic, start, stop };
}
