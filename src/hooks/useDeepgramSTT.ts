import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

// Live transcription of the candidate through Deepgram (Nova-3). The mic is
// recorded in small Opus chunks and streamed over a WebSocket opened with a
// 30-second token from our backend; the API key never reaches the browser.
// Finished phrases are kept as they arrive, so a long answer can't lose its start.
// Same surface as useSpeechRecognition, except start() resolves false when
// Deepgram isn't available so the caller can fall back to the browser recognizer.

const LISTEN_URL =
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

export function listenUrl(extraTerms: readonly string[] = []): string {
  const seen = new Set<string>();
  const terms = [...extraTerms, ...INTERVIEW_TERMS]
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && t.length <= 40 && !seen.has(t.toLowerCase()) && seen.add(t.toLowerCase()))
    .slice(0, MAX_TERMS);
  return LISTEN_URL + terms.map((t) => `&keyterm=${encodeURIComponent(t)}`).join("");
}
const OPEN_TIMEOUT_MS = 5_000;
const CHUNK_MS = 250;

function recorderMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

interface DeepgramResult {
  type?: string;
  is_final?: boolean;
  channel?: { alternatives?: { transcript?: string }[] };
}

export function useDeepgramSTT(keyterms: readonly string[] = []) {
  const supported =
    typeof window !== "undefined" &&
    typeof WebSocket !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    recorderMime() !== null;

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalRef = useRef("");
  const busyRef = useRef(false); // a start in progress or running: never two streams
  const keytermsRef = useRef(keyterms);
  keytermsRef.current = keyterms;

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

    const socket = new WebSocket(listenUrl(keytermsRef.current), ["bearer", token]);
    socketRef.current = socket;
    const opened = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), OPEN_TIMEOUT_MS);
      socket.onopen = () => {
        clearTimeout(timer);
        resolve(true);
      };
      socket.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    });
    if (!busyRef.current) return cancelled();
    if (!opened) return fail();

    socket.onmessage = (event: MessageEvent) => {
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
    socket.onclose = () => {
      // Dropped mid-answer (network): keep what was heard and show the mic as off.
      if (socketRef.current === socket) {
        release();
        setListening(false);
      }
    };

    const recorder = new MediaRecorder(streamRef.current, { mimeType: recorderMime() ?? undefined });
    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(e.data);
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

  return { supported, listening, transcript, start, stop };
}
