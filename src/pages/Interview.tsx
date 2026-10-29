import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowUp,
  PaperPlaneTilt,
  ArrowCounterClockwise,
  Microphone,
  Waveform,
  SpeakerHigh,
  SpeakerSlash,
  Warning,
  ArrowClockwise,
  ArrowsOut,
  VideoCameraSlash,
} from "@phosphor-icons/react";
import { TopBar } from "@/components/TopBar";
import { TypeChip, DifficultyMeter, WeightedTag } from "@/components/QuestionMeta";
import { InterviewerAvatar, type AvatarState } from "@/components/InterviewerAvatar";
import { TavusAvatar } from "@/components/TavusAvatar";
import { TavusCallOverlay } from "@/components/TavusCallOverlay";
import { ChatTranscript } from "@/components/ChatTranscript";
import { CodingBrief, CodingWorkspace } from "@/components/coding/CodingWorkspace";
import { StageIndicator } from "@/components/coding/StageIndicator";
import { ElapsedTime } from "@/components/coding/ElapsedTime";
import { isMac } from "@/components/coding/format";
import { FirstTimeHint } from "@/components/FirstTimeHint";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { useElevenLabsTTS } from "@/hooks/useElevenLabsTTS";
import { useBackchannel } from "@/hooks/useBackchannel";
import { useTavus } from "@/hooks/useTavus";
import { usePythonRunner } from "@/hooks/usePythonRunner";
import { useSessionStore } from "@/stores/sessionStore";
import { USE_MOCK } from "@/lib/api";
import { isRealInterruption, silenceBeforeSendMs } from "@/lib/turnTaking";

const WIDE = "(min-width: 1024px)";
// The server's limit on one answer; the counter appears as the draft gets close.
const ANSWER_LIMIT = 6000;
const COUNT_FROM = 5000;
const thousands = (n: number) => n.toLocaleString("en-US");
const MAC = typeof navigator !== "undefined" && isMac(navigator.platform || navigator.userAgent);
const SEND_KEY = MAC ? "⌘ Enter" : "Ctrl Enter";
const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const createJsWorker = () =>
  new Worker(new URL("../lib/coding/js.worker.ts", import.meta.url), { type: "module" });

// The coding editor needs ≥ 1024 px; below that the round is talk-only.
function useWideScreen(): boolean {
  const [wide, setWide] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.(WIDE).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(WIDE);
    if (!mq) return;
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

const NO_TERMS: string[] = [];

export function Interview() {
  const navigate = useNavigate();
  const status = useSessionStore((s) => s.status);
  const plan = useSessionStore((s) => s.plan);
  const messages = useSessionStore((s) => s.messages);
  const currentIdx = useSessionStore((s) => s.currentIdx);
  const followUpCount = useSessionStore((s) => s.followUpCount);
  const submitAnswer = useSessionStore((s) => s.submitAnswer);
  const endInterview = useSessionStore((s) => s.endInterview);
  const phase = useSessionStore((s) => s.phase);
  const useVideo = useSessionStore((s) => s.useVideo);
  const justRestored = useSessionStore((s) => s.justRestored);
  const clearRestored = useSessionStore((s) => s.clearRestored);
  const turnError = useSessionStore((s) => s.turnError);
  const clearTurnError = useSessionStore((s) => s.clearTurnError);
  const retryFinalize = useSessionStore((s) => s.retryFinalize);
  const finalizing = useSessionStore((s) => s.finalizing);
  const codingStage = useSessionStore((s) => s.codingStage);
  const eventInFlight = useSessionStore((s) => s.eventInFlight);

  const [draft, setDraft] = useState("");
  const [lastDraft, setLastDraft] = useState("");
  const wide = useWideScreen();
  // A coding question below 1024 px has no editor: the store tells Marcus to talk it through.
  const setEditorShown = useSessionStore((s) => s.setEditorShown);
  useEffect(() => setEditorShown(wide), [wide, setEditorShown]);
  // Lives here so Python stays loaded from one coding problem to the next.
  const pythonRunner = usePythonRunner();
  const jsRunner = usePythonRunner({ createWorker: createJsWorker, language: "javascript" });
  const codingLanguage = useSessionStore((s) => s.codingLanguage);
  const runner = codingLanguage === "javascript" ? jsRunner : pythonRunner;

  // Voice: ElevenLabs (human-sounding, via the backend) with the browser's
  // built-in voice as the fallback when it isn't configured or a call fails.
  const eleven = useElevenLabsTTS();
  const webSpeech = useSpeechSynthesis();
  // The candidate's own skills help the transcriber hear them right ("Kafka", "Terraform").
  const skills = useSessionStore((s) => s.profile?.candidateSkills);
  // On Flux, the transcriber says when the candidate has finished; handleTurnEnd sends it.
  const stt = useSpeechInput(skills ?? NO_TERMS, (text) => handleTurnEnd(text));
  const backchannel = useBackchannel();

  // Optional Tavus video avatar. Dormant unless the backend has a key; when it
  // becomes ready it takes over both the face and the voice (it speaks the
  // lines itself), so we skip ElevenLabs to avoid doubled audio.
  const tavus = useTavus();

  // ElevenLabs first; the browser voice covers lines it can't (or isn't configured for).
  const tts = {
    speak: (text: string) => void eleven.speak(text, webSpeech.speak),
    cancel: () => {
      eleven.cancel();
      webSpeech.cancel();
    },
    speaking: eleven.speaking || webSpeech.speaking,
    supported: eleven.available || webSpeech.supported,
  };
  const interviewerSpeaking = tavus.ready ? tavus.speaking : tts.speaking;

  const voiceCapable = webSpeech.supported || stt.supported;
  const [voiceOn, setVoiceOn] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  // "Continue without video" while the video room is still connecting.
  const [skipVideo, setSkipVideo] = useState(false);
  const [videoNoticeOpen, setVideoNoticeOpen] = useState(true);
  // Where a top-bar link would take them, while we ask before leaving a live interview.
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const lastSpokenId = useRef<string | null>(null);

  // Video mode: connect the avatar at session start so it greets on camera.
  // On leaving the page, always tear down the (billed) Tavus conversation.
  useEffect(() => {
    if (useVideo) {
      setVoiceOn(true);
      tavus.activate();
    }
    return () => {
      tavus.deactivate();
    };
    // once, on entry
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // In video mode, present it as a call: open the stage once the avatar is live.
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (useVideo && tavus.ready && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setCallOpen(true);
    }
  }, [useVideo, tavus.ready]);

  // Speak each new interviewer message aloud when voice is on. The video avatar
  // wins when it's live; otherwise the stylized avatar + ElevenLabs (or the browser voice) does.
  useEffect(() => {
    if (!voiceOn) return;
    const last = messages[messages.length - 1];
    if (!last || last.speaker !== "interviewer") return;
    // In video mode, wait for the avatar to connect so IT delivers the greeting
    // (don't let ElevenLabs jump in first). But if it's still connecting only —
    // once it errors or isn't configured, fall through to ElevenLabs immediately.
    const connecting = tavus.status === "idle" || tavus.status === "connecting";
    if (useVideo && !skipVideo && !tavus.ready && connecting) return;
    if (lastSpokenId.current === last.id) return;
    lastSpokenId.current = last.id;
    if (tavus.ready) tavus.speak(last.text);
    else if (tts.supported) tts.speak(last.text);
  }, [messages, voiceOn, tts, tavus, useVideo, skipVideo]);

  // While dictating, mirror the live transcript into the draft.
  useEffect(() => {
    if (stt.listening) setDraft(stt.transcript);
  }, [stt.listening, stt.transcript]);

  // Hands-free turn-taking in voice mode: when the interviewer finishes
  // speaking, start listening; when the candidate pauses long enough after
  // saying something, send it — like talking to a person, not filling a form.
  const wasSpeaking = useRef(false);
  useEffect(() => {
    const finished = wasSpeaking.current && !interviewerSpeaking;
    const started = !wasSpeaking.current && interviewerSpeaking;
    wasSpeaking.current = interviewerSpeaking;
    // On Flux the mic is open while he talks, so the candidate can interrupt him.
    const opens = finished || (started && stt.semantic && !useVideo);
    if (!opens || !voiceOn || status !== "live" || !stt.supported || stt.listening) return;
    // The "he started" start is Flux-only: it never falls back to Nova-3 or the browser.
    if (finished) stt.start();
    else stt.start(true);
  }, [interviewerSpeaking, voiceOn, status, stt, useVideo]);

  // Interrupting: a real sentence from the candidate stops his voice at once; their
  // turn is then sent when Flux hears them finish. Only the ElevenLabs voice: the
  // browser's OS voice isn't echo-cancelled, so the mic hears him as the candidate.
  const lastInterviewerLine = [...messages].reverse().find((m) => m.speaker === "interviewer")?.text ?? "";
  // A turn that began while he was talking may be him, even if it ends after he stops.
  const heardWhileSpeaking = useRef(false);
  useEffect(() => {
    // A fresh mic (or a used-up turn) empties the transcript: start the overlap check over.
    if (!stt.transcript.trim()) heardWhileSpeaking.current = false;
    else if (interviewerSpeaking) heardWhileSpeaking.current = true;
    if (stt.semantic && !useVideo && eleven.speaking && isRealInterruption(stt.transcript, lastInterviewerLine)) tts.cancel();
    // tts is recreated every render; the transcript is what matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stt.transcript]);

  // Flux knows when they've finished, so only the fallback transcriber waits out a silence.
  const autoSending = voiceOn && stt.listening && !stt.semantic && !!stt.transcript.trim();
  const sendDelayMs = silenceBeforeSendMs(stt.transcript);
  useEffect(() => {
    if (!autoSending) return;
    const t = setTimeout(() => sendText(stt.transcript, true), sendDelayMs);
    return () => clearTimeout(t);
    // sendText is recreated every render; the transcript is what matters here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSending, stt.transcript, sendDelayMs]);

  // No active session (e.g. refreshed straight here) — bounce to setup.
  // Delay the results navigation slightly so the closing message is visible.
  useEffect(() => {
    if (status === "idle") navigate("/setup");
    if (status === "complete") {
      const t = setTimeout(() => navigate("/results"), 1800);
      return () => clearTimeout(t);
    }
  }, [status, navigate]);

  // Acknowledge a resumed session, then drop the flag after a moment.
  useEffect(() => {
    if (!justRestored) return;
    const t = setTimeout(() => clearRestored(), 5000);
    return () => clearTimeout(t);
  }, [justRestored, clearRestored]);

  const thinking = status === "thinking";
  // Marcus handling a check-in or Submit isn't a reply to the candidate: they can keep
  // typing, and what they send goes out right after it.
  const locked = (thinking && !eventInFlight) || status === "wrapping" || status === "complete";

  // Restore the draft when a turn fails so the user can retry without retyping.
  useEffect(() => {
    if (turnError && lastDraft) setDraft(lastDraft);
  }, [turnError]);

  // Drop out of the full-screen call if voice/video goes away or the session ends.
  useEffect(() => {
    if (!voiceOn || !tavus.ready || status === "wrapping" || status === "complete") {
      setCallOpen(false);
    }
  }, [voiceOn, tavus.ready, status]);

  if (!plan) return null;

  const question = plan.questions[currentIdx];
  const inQuestions = phase === "question";
  const codingQ = inQuestions && question?.type === "coding" ? question : null;
  const workspace = codingQ !== null && wide;
  const stageLabel =
    phase === "warmup" || phase === "background" ? "INTRODUCTIONS"
    : phase === "closing" ? "YOUR QUESTIONS FOR THE INTERVIEWER"
    : null;
  const total = plan.questions.length;
  const progressPct =
    phase === "closing" ? 100 : inQuestions ? (currentIdx / total) * 100 : 0;

  const avatarState: AvatarState = tts.speaking
    ? "speaking"
    : stt.listening
    ? "listening"
    : "idle";

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    if (next) {
      // Unlock audio inside this click — browsers keep audio silent otherwise.
      eleven.unlock();
      backchannel.unlock();
      // Video only for a video session: a voice session must never start a billed Tavus call.
      if (useVideo && !skipVideo) tavus.activate();
    } else {
      tts.cancel();
      if (useVideo) tavus.deactivate();
      if (stt.listening) stt.stop();
    }
  };

  const toggleMic = () => {
    if (stt.listening) {
      stt.stop();
    } else {
      eleven.unlock();
      backchannel.unlock();
      tts.cancel();
      stt.start(); // never the click event: start(true) means Flux-only
    }
  };

  const send = () => sendText(draft);

  // Flux heard the candidate finish. true = the text is used up (sent or thrown away),
  // false = keep it and let the next turn add to it.
  function handleTurnEnd(text: string): boolean {
    if (!voiceOn) return false; // dictating: keep building the draft
    const overlapped = interviewerSpeaking || heardWhileSpeaking.current;
    heardWhileSpeaking.current = false;
    // A turn that began while he was talking is his own voice leaking back or a "mm-hm",
    // unless it's a real interruption.
    if (overlapped && !isRealInterruption(text, lastInterviewerLine)) return true;
    if (locked || text.length > ANSWER_LIMIT) return false; // keep it; nothing is lost
    if (interviewerSpeaking) tts.cancel();
    void sendText(text, true);
    return true;
  }

  async function sendText(raw: string, spoken = false) {
    if (!raw.trim() || locked || raw.length > ANSWER_LIMIT) return;
    // A quick "Mm-hm" covers the wait for his reply. Only mid-question, never on video.
    if (spoken && phase === "question" && !useVideo) backchannel.play();
    if (stt.listening) stt.stop();
    const text = raw.trim();
    setLastDraft(text);
    clearTurnError();
    // Cleared now so the line reads as sent (it's already in the transcript); submitAnswer
    // only resolves after Marcus replies. false = it wasn't sent: hand the draft back.
    setDraft("");
    if (!(await submitAnswer(text))) setDraft((d) => d || text);
  }

  // What's happening right now, in words. Always on screen and read out politely.
  const statusText =
    status === "complete" ? "Interview complete. Opening your results."
    : status === "wrapping" ? (turnError ? "Your results haven't saved yet." : "Saving your results…")
    : thinking && eventInFlight ? "Marcus is looking at your code. You can keep typing."
    : thinking ? "Marcus is thinking…"
    : workspace && runner.status === "running" ? "Running your code…"
    : interviewerSpeaking ? "Marcus is speaking."
    : stt.listening ? (voiceOn ? "Listening. Your answer sends when you finish." : "Listening. Tap the mic again to stop.")
    : "Your turn.";
  const statusTone =
    interviewerSpeaking && !thinking ? "bg-accent" : stt.listening && !thinking ? "bg-survive" : thinking ? "bg-mist animate-pulse-dot" : "bg-line-bright";
  const statusLine = (className: string) => (
    <p role="status" data-testid="interview-status" className={`flex min-w-0 items-center gap-2 font-sans text-[13px] text-mist ${className}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusTone}`} />
      <span className="truncate">{statusText}</span>
    </p>
  );

  const inProgress = status === "live" || status === "thinking" || status === "wrapping";
  // Top-bar links (the logo) would drop a live interview: ask first.
  const guardLeaving = (e: MouseEvent) => {
    const link = (e.target as Element).closest("a");
    if (!link || !inProgress) return;
    e.preventDefault();
    setLeaveTo(link.getAttribute("href") ?? "/");
  };
  const leave = () => {
    if (stt.listening) stt.stop();
    tts.cancel();
    navigate(leaveTo ?? "/");
  };

  const tooLong = draft.length > ANSWER_LIMIT;
  const counting = draft.length > COUNT_FROM;
  const resendable = status !== "wrapping" && !!draft.trim() && !locked && !tooLong;

  const renderComposer = (compact: boolean) => (
    <div className="border-t border-line bg-void/80 backdrop-blur-xl">
      <div className={compact ? "px-4 py-3" : "mx-auto max-w-[820px] px-5 py-4 sm:px-8"}>
        <div className="relative flex items-end gap-3 overflow-hidden rounded-2xl border border-line bg-ink p-2.5 focus-within:border-line-bright">
          {/* Hands-free: fills during the pause before the answer sends;
              speaking again restarts it (keyed on the transcript). */}
          {autoSending && (
            <motion.span
              key={stt.transcript}
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-survive/70"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: sendDelayMs / 1000, ease: "linear" }}
            />
          )}
          {stt.supported && (
            <button
              onClick={toggleMic}
              disabled={locked}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl tactile transition-colors disabled:opacity-30 ${FOCUS} ${
                stt.listening
                  ? "bg-survive/15 text-survive"
                  : "border border-line-bright text-mist hover:text-chalk"
              }`}
              aria-label={stt.listening ? "Stop dictation" : "Speak your answer"}
              title={stt.listening ? "Stop dictation" : "Speak your answer"}
            >
              {stt.listening ? (
                <motion.span
                  animate={{ scale: [1, 0.8, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Waveform size={18} weight="fill" />
                </motion.span>
              ) : (
                <Microphone size={18} weight="bold" />
              )}
            </button>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            disabled={locked}
            rows={2}
            aria-label="Your answer"
            aria-keyshortcuts={MAC ? "Meta+Enter" : "Control+Enter"}
            aria-invalid={tooLong || undefined}
            aria-describedby={counting ? "answer-length" : undefined}
            placeholder={
              stt.listening
                ? "Listening…"
                : thinking && eventInFlight
                ? "Marcus is looking at your run. You can keep typing."
                : thinking
                ? "Marcus is thinking…"
                : status === "wrapping" && turnError
                ? "Your results haven't saved yet. Try again above."
                : status === "wrapping" || status === "complete"
                ? "Interview complete. Saving your results…"
                : compact
                ? "Talk through your thinking, or ask Marcus a question."
                : "Type or speak your answer. Be specific."
            }
            className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-2.5 py-2 font-sans text-[15px] leading-relaxed text-chalk placeholder:text-fog focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!draft.trim() || locked || tooLong}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-void tactile transition-opacity disabled:opacity-30 ${FOCUS}`}
            aria-label="Send answer"
            title={`Send answer (${SEND_KEY})`}
          >
            {thinking ? <PaperPlaneTilt size={18} weight="fill" /> : <ArrowUp size={18} weight="bold" />}
          </button>
        </div>
        <div className="mt-2 flex items-center gap-3 px-1">
          {tooLong ? (
            <p role="status" className="font-sans text-[12px] text-fail">
              Keep each answer under {thousands(ANSWER_LIMIT)} characters.
            </p>
          ) : (
            <p className="hidden font-sans text-[12px] text-mist sm:block">
              {voiceOn && stt.supported
                ? "Hands-free: your answer sends when you finish speaking."
                : `${stt.supported ? "Mic to speak. " : ""}${SEND_KEY} to send.${compact ? "" : " Vague answers get follow-ups."}`}
            </p>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            {counting && (
              <span
                id="answer-length"
                className={`font-mono text-[10px] tabular-nums tracking-wide ${tooLong ? "text-fail" : "text-mist"}`}
              >
                {thousands(draft.length)} / {thousands(ANSWER_LIMIT)}
              </span>
            )}
            {phase === "closing" && status === "live" && (
              <button
                onClick={() => {
                  if (stt.listening) stt.stop();
                  tts.cancel();
                  void endInterview();
                }}
                className={`min-h-11 shrink-0 rounded-lg px-2 font-sans text-[13px] text-mist underline-offset-4 transition-colors hover:text-chalk hover:underline ${FOCUS}`}
              >
                No questions, end the interview
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const banners = (
    <>
      {/* resume notice */}
      <AnimatePresence>
        {justRestored && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-survive/25 bg-survive/[0.06]"
          >
            <div role="status" className="mx-auto flex max-w-[820px] items-center gap-2.5 px-5 py-3 sm:px-8">
              <ArrowCounterClockwise size={15} weight="bold" className="shrink-0 text-survive" aria-hidden />
              <span className="font-sans text-[13.5px] text-chalk">
                Session restored. You're right where you left off.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* turn error banner */}
      <AnimatePresence>
        {turnError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-fail/25 bg-fail/[0.06]"
          >
            <div role="alert" className="mx-auto flex max-w-[820px] flex-wrap items-center justify-between gap-x-3 gap-y-1 px-5 py-2 sm:px-8">
              <div className="flex min-w-0 items-start gap-2.5 py-1">
                <Warning size={15} weight="fill" className="mt-0.5 shrink-0 text-fail" aria-hidden />
                <p className="font-sans text-[13.5px] leading-relaxed text-chalk">
                  {turnError}
                  {resendable && " Your answer is still in the box."}
                </p>
              </div>
              <button
                onClick={() => {
                  // Finalize failures (e.g. a 503 from the memory-profile
                  // write) have nothing left to resubmit: retry the
                  // finalize call itself. A failed turn resends the restored
                  // draft; with nothing to resend, just close the banner.
                  if (status === "wrapping") retryFinalize();
                  else if (resendable) void sendText(draft);
                  else clearTurnError();
                }}
                disabled={status === "wrapping" && finalizing}
                className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 font-sans text-[13.5px] font-medium text-chalk transition-colors hover:text-white-pure disabled:opacity-40 ${FOCUS}`}
              >
                <ArrowClockwise size={14} weight="bold" aria-hidden />
                {status === "wrapping" ? (finalizing ? "Trying again…" : "Try again") : resendable ? "Send again" : "Dismiss"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {useVideo && tavus.status === "error" && videoNoticeOpen && (
        <div role="status" className="border-b border-line">
          <div className="mx-auto flex max-w-[820px] items-center justify-between gap-3 px-5 py-1.5 sm:px-8">
            <span className="flex items-center gap-2.5 font-sans text-[13.5px] text-mist">
              <VideoCameraSlash size={15} className="shrink-0" aria-hidden />
              Video couldn't connect. Marcus carries on by voice.
            </span>
            <button
              onClick={() => setVideoNoticeOpen(false)}
              className={`min-h-11 shrink-0 rounded-lg px-3 font-sans text-[13px] text-mist transition-colors hover:text-chalk ${FOCUS}`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {voiceOn && stt.supported && (
        <FirstTimeHint id="voice" className="mx-auto w-full max-w-[820px] px-5 py-1 sm:px-8">
          Hands-free: Marcus listens once he finishes speaking, and your answer sends when you're done.
          {stt.semantic && !useVideo ? " You can cut in while he talks." : ""} Turn voice off to type instead.
        </FirstTimeHint>
      )}
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
    <div className="flex h-[100dvh] flex-col">
      {!codingQ && <h1 className="sr-only">Interview with Marcus</h1>}
      {/* display: contents keeps the header's layout; this only catches clicks on its links. */}
      <div className="contents" onClickCapture={guardLeaving}>
      <TopBar
        wide={workspace}
        right={
          <div className="flex items-center gap-2 sm:gap-4">
            {voiceCapable && (
              <button
                onClick={toggleVoice}
                aria-label="Voice"
                aria-pressed={voiceOn}
                className={`inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 font-sans text-[13px] tactile transition-colors disabled:opacity-50 ${FOCUS} ${
                  voiceOn
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-line-bright text-mist hover:text-chalk"
                }`}
                title={voiceOn ? "Turn voice off" : "Turn voice on"}
              >
                {voiceOn ? <SpeakerHigh size={15} weight="fill" aria-hidden /> : <SpeakerSlash size={15} aria-hidden />}
                <span className="hidden sm:inline">{voiceOn ? "Voice on" : "Voice off"}</span>
              </button>
            )}
            {USE_MOCK && (
              <span
                className="hidden rounded-full border border-warning/40 px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] text-warning sm:inline"
                title="No backend connected: replies are scripted, not generated. Set VITE_USE_MOCK=false to use the real interviewer."
              >
                DEMO MODE
              </span>
            )}
            <span className="whitespace-nowrap font-mono text-[11px] tracking-wide text-mist">
              {inQuestions ? `Question ${currentIdx + 1} of ${total}` : phase === "closing" ? "Your questions" : "Introductions"}
            </span>
            {workspace && <StageIndicator stage={codingStage} />}
            {codingQ && (
              <span className="hidden sm:inline-flex">
                <ElapsedTime key={codingQ.id} clockId={`${plan.sessionId}:${codingQ.id}`} />
              </span>
            )}
            <div aria-hidden className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-surface-2 sm:block">
              <motion.div
                className="h-full rounded-full bg-accent"
                animate={{ width: `${progressPct}%` }}
                transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.6 }}
              />
            </div>
          </div>
        }
      />
      </div>

      {workspace ? (
        <>
          {banners}
          <CodingWorkspace
            key={codingQ.id}
            question={codingQ}
            runner={runner}
            conversation={
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line px-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">Conversation</span>
                  {followUpCount > 0 && (
                    <span className="font-mono text-[10px] tracking-[0.16em] text-accent">FOLLOW-UP {followUpCount}</span>
                  )}
                  {statusLine("ml-auto")}
                  {voiceOn && tavus.ready && (
                    <button
                      onClick={() => setCallOpen(true)}
                      className={`shrink-0 rounded-lg ${FOCUS}`}
                      title="Expand to full-screen call"
                      aria-label="Expand to full-screen call"
                    >
                      <TavusAvatar track={tavus.videoTrack} speaking={tavus.speaking} size={32} />
                    </button>
                  )}
                </div>
                <ChatTranscript messages={messages} thinking={thinking} compact live={!voiceOn} />
                {renderComposer(true)}
              </div>
            }
          />
        </>
      ) : (
        <>
          {/* current question header */}
          <div className="border-b border-line bg-ink/50">
            <div className="mx-auto flex max-w-[820px] items-center gap-4 px-5 py-4 sm:px-8 sm:py-5">
              {voiceOn &&
                (tavus.ready ? (
                  <button
                    onClick={() => setCallOpen(true)}
                    className={`group relative shrink-0 rounded-2xl ${FOCUS}`}
                    title="Expand to full-screen call"
                    aria-label="Expand to full-screen call"
                  >
                    <TavusAvatar track={tavus.videoTrack} speaking={tavus.speaking} size={72} />
                    <span className="absolute inset-0 grid place-items-center rounded-2xl bg-void/50 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <ArrowsOut size={20} weight="bold" className="text-white-pure" />
                    </span>
                  </button>
                ) : (
                  <InterviewerAvatar state={avatarState} size={72} />
                ))}
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
                {stageLabel ? (
                  <span className="font-mono text-[11px] tracking-[0.16em] text-mist">{stageLabel}</span>
                ) : (
                  <>
                    <TypeChip type={question.type} />
                    <DifficultyMeter value={question.targetDifficulty} />
                    {question.weightedFromWeakness && <WeightedTag />}
                  </>
                )}
                {inQuestions && followUpCount > 0 && (
                  <span className="font-mono text-[10px] tracking-[0.16em] text-accent">
                    FOLLOW-UP {followUpCount}
                  </span>
                )}
                {statusLine("w-full")}
              </div>
            </div>
          </div>

          {banners}

          <ChatTranscript
            messages={messages}
            thinking={thinking}
            live={!voiceOn}
            inset={codingQ ? <CodingBrief question={codingQ} /> : undefined}
            insetBefore={codingQ ? messages.find((m) => m.questionId === codingQ.id)?.id : undefined}
          />
          {renderComposer(false)}
        </>
      )}

      <AnimatePresence>
        {useVideo && !skipVideo && !tavus.ready && (tavus.status === "idle" || tavus.status === "connecting") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="fixed inset-0 z-[60] grid place-items-center bg-void/95 px-5 backdrop-blur-xl"
          >
            <div className="flex flex-col items-center gap-5 text-center">
              <span aria-hidden className="inline-block h-9 w-9 animate-spin rounded-full border-2 border-line-bright border-t-accent" />
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-chalk">
                  Connecting you to Marcus…
                </p>
                <p className="mt-1 font-sans text-[13.5px] text-mist">Setting up the video room. This takes a few seconds.</p>
              </div>
              <button
                onClick={() => {
                  setSkipVideo(true);
                  void tavus.deactivate();
                }}
                className={`min-h-11 rounded-lg px-4 font-sans text-[13.5px] text-mist transition-colors hover:text-chalk ${FOCUS}`}
              >
                Continue without video
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callOpen && tavus.ready && (
          <TavusCallOverlay
            videoTrack={tavus.videoTrack}
            speaking={tavus.speaking}
            questionText={[...messages].reverse().find((m) => m.speaker === "interviewer")?.text ?? question.prompt}
            listening={stt.listening}
            draft={draft}
            thinking={thinking}
            sttSupported={stt.supported}
            followUpLabel={
              inQuestions && followUpCount > 0 ? `FOLLOW-UP ${followUpCount}` : undefined
            }
            onToggleMic={toggleMic}
            onSend={send}
            onClose={() => setCallOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {leaveTo !== null && <LeaveDialog onStay={() => setLeaveTo(null)} onLeave={leave} />}
      </AnimatePresence>
    </div>
    </MotionConfig>
  );
}

function LeaveDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] grid place-items-center bg-void/80 px-4 backdrop-blur-sm"
      onClick={onStay}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="leave-title"
        aria-describedby="leave-body"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onStay();
        }}
        className="w-full max-w-[400px] rounded-2xl border border-line-bright bg-surface p-6"
      >
        <h2 id="leave-title" className="font-display text-lg font-semibold tracking-tight text-chalk">
          Leave the interview?
        </h2>
        <p id="leave-body" className="mt-2 font-sans text-[14px] leading-relaxed text-mist">
          Marcus stops here, and this session won't be scored.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            onClick={onLeave}
            className={`min-h-11 rounded-lg px-4 font-sans text-[14px] text-mist transition-colors hover:text-chalk ${FOCUS}`}
          >
            Leave
          </button>
          <button
            autoFocus
            onClick={onStay}
            className={`min-h-11 rounded-lg bg-accent px-5 font-sans text-[14px] font-semibold text-void tactile ${FOCUS}`}
          >
            Stay in the interview
          </button>
        </div>
      </div>
    </motion.div>
  );
}
