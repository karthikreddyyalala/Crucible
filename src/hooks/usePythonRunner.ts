import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicProblem, RunnerRequest, RunnerResponse, RunOutcome } from "@/lib/coding/types";

export type RunnerStatus = "idle" | "loading" | "ready" | "running" | "error";

interface Options {
  timeoutMs?: number;
  createWorker?: () => Worker;
}

interface PendingRun {
  id: number;
  resolve: (outcome: RunOutcome) => void;
  timer?: ReturnType<typeof setTimeout>;
}

const createPyodideWorker = () =>
  new Worker(new URL("../lib/coding/pyodide.worker.ts", import.meta.url), { type: "module" });

/** Owns the Pyodide worker. One run at a time; a run past `timeoutMs` kills and replaces the worker. */
export function usePythonRunner({ timeoutMs = 5000, createWorker = createPyodideWorker }: Options = {}) {
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const statusRef = useRef<RunnerStatus>("idle"); // sync mirror so two calls in one tick can't both pass a guard
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<PendingRun | null>(null);
  const dispatchRef = useRef<(() => void) | null>(null); // a run waiting for the worker to become ready
  const nextId = useRef(0);
  const cfg = useRef({ timeoutMs, createWorker });
  cfg.current = { timeoutMs, createWorker };

  const set = useCallback((next: RunnerStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const finishPending = useCallback((outcome: RunOutcome) => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    dispatchRef.current = null;
    pending.resolve(outcome);
  }, []);

  const start = useCallback(() => {
    workerRef.current?.terminate();
    const worker = cfg.current.createWorker();
    workerRef.current = worker;

    const handle = (msg: RunnerResponse) => {
      if (workerRef.current !== worker) return; // a terminated worker's late message
      if (msg.type === "loading") setProgress(msg.progress);
      else if (msg.type === "ready") {
        set("ready");
        dispatchRef.current?.();
        dispatchRef.current = null;
      } else if (msg.type === "result") {
        if (pendingRef.current?.id !== msg.id) return;
        set("ready");
        finishPending({ kind: "results", results: msg.results });
      } else {
        setError(msg.message);
        set("error");
        finishPending({ kind: "error", message: msg.message });
      }
    };
    worker.onmessage = (e: MessageEvent<RunnerResponse>) => handle(e.data);
    worker.onerror = (e) => handle({ type: "fatal", message: e.message || "The Python worker crashed" });

    setError(null);
    setProgress("");
    set("loading");
    const request: RunnerRequest = { type: "load" };
    worker.postMessage(request);
  }, [set, finishPending]);

  const load = useCallback(() => {
    if (statusRef.current === "idle") start();
  }, [start]);

  const retry = useCallback(() => {
    if (statusRef.current === "error") start();
  }, [start]);

  const run = useCallback(
    (code: string, problem: PublicProblem, onlyVisible: boolean) => {
      if (pendingRef.current) return Promise.reject(new Error("A run is already in progress"));
      return new Promise<RunOutcome>((resolve) => {
        const pending: PendingRun = { id: ++nextId.current, resolve };
        pendingRef.current = pending;

        const dispatch = () => {
          set("running");
          pending.timer = setTimeout(() => {
            pendingRef.current = null;
            start(); // kills the stuck worker and warms a fresh one
            resolve({ kind: "timeout" });
          }, cfg.current.timeoutMs);
          const request: RunnerRequest = { type: "run", id: pending.id, code, problem, onlyVisible };
          workerRef.current?.postMessage(request);
        };

        if (statusRef.current === "ready") return dispatch();
        dispatchRef.current = dispatch;
        if (statusRef.current === "idle" || statusRef.current === "error") start();
      });
    },
    [set, start],
  );

  useEffect(
    () => () => {
      finishPending({ kind: "error", message: "The Python runner was closed" });
      workerRef.current?.terminate();
      workerRef.current = null;
      set("idle"); // StrictMode re-runs effects on a live component
    },
    [finishPending, set],
  );

  return { status, progress, error, load, run, retry };
}
