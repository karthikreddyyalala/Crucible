import { useId, useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Warning } from "@phosphor-icons/react";
import { Wordmark } from "@/components/Wordmark";
import { MagneticButton } from "@/components/MagneticButton";
import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { signInPrompt, redirectTarget } from "@/lib/authContext";

type Mode = "signin" | "signup" | "confirm" | "forgot" | "reset";

const PASSWORD_RULE = "At least 8 characters, with an uppercase letter, a lowercase letter and a number.";
const FOCUS = "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
const LINK = `inline-flex min-h-11 items-center px-1 transition-colors ${FOCUS}`;

/** What went wrong in plain words, and the one step that fixes it (when there is one). */
export function formatAuthError(e: unknown): { message: string; fix?: "signup" | "signin" | "forgot" | "resend" | "confirm" } {
  const name = e instanceof Error ? e.name : "";
  switch (name) {
    case "UserNotFoundException":     return { message: "No account found with that email.", fix: "signup" };
    case "NotAuthorizedException":    return { message: "Incorrect email or password.", fix: "forgot" };
    case "UserNotConfirmedException": return { message: "This email hasn't been verified yet.", fix: "confirm" };
    case "UsernameExistsException":   return { message: "An account with that email already exists.", fix: "signin" };
    case "CodeMismatchException":     return { message: "That code doesn't match. Check the latest email from us.", fix: "resend" };
    case "ExpiredCodeException":      return { message: "That code has expired.", fix: "resend" };
    case "LimitExceededException":    return { message: "Too many attempts. Wait a few minutes, then try again." };
    case "InvalidParameterException": return { message: "Check the email address and password format." };
    case "InvalidPasswordException":  return { message: `That password is too weak. ${PASSWORD_RULE}` };
    default:                          return { message: "Something went wrong signing you in. Check your connection and try again." };
  }
}

const FIX_LABEL = {
  signup: "Create an account",
  signin: "Sign in instead",
  forgot: "Reset your password",
  resend: "Send a new code",
  confirm: "Verify your email",
} as const;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const refresh = useAuthStore((s) => s.refresh);

  const from = (location.state as { from?: string } | null)?.from;
  const contextPrompt = signInPrompt(from);
  const dest = redirectTarget(from);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ReturnType<typeof formatAuthError> | null>(null);
  const [notice, setNotice] = useState("");

  const go = (m: Mode) => {
    setError(null);
    setNotice("");
    setCode("");
    setMode(m);
  };

  const resend = async () => {
    setError(null);
    setNotice("");
    try {
      if (mode === "reset") await authApi.forgotPassword(email);
      else await authApi.resendCode(email);
      setNotice(`A new code is on its way to ${email}.`);
    } catch (e) {
      setError(formatAuthError(e));
    }
  };

  const applyFix = async (fix: NonNullable<ReturnType<typeof formatAuthError>["fix"]>) => {
    if (fix === "resend") return resend();
    if (fix === "confirm") {
      go("confirm");
      return resend();
    }
    go(fix);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice("");
    setBusy(true);
    try {
      if (mode === "signup") {
        const { needsConfirm } = await authApi.signUp(email, password);
        if (needsConfirm) { go("confirm"); return; }
      }
      if (mode === "confirm") {
        await authApi.confirm(email, code);
        await authApi.signIn(email, password);
        await refresh();
        navigate(dest);
        return;
      }
      if (mode === "forgot") {
        await authApi.forgotPassword(email);
        go("reset");
        return;
      }
      if (mode === "reset") {
        await authApi.confirmForgotPassword(email, code, newPassword);
        await authApi.signIn(email, newPassword);
        await refresh();
        navigate(dest);
        return;
      }
      // signin
      await authApi.signIn(email, password);
      await refresh();
      navigate(dest);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const title =
    mode === "signup" ? "Create your account"
    : mode === "confirm" ? "Check your email"
    : mode === "forgot" ? "Reset your password"
    : mode === "reset" ? "Set a new password"
    : "Welcome back";

  const subtitle =
    mode === "confirm" ? `We sent a 6-digit code to ${email}.`
    : mode === "forgot" ? "We'll email you a code to reset it."
    : mode === "reset" ? `Enter the code we sent to ${email}.`
    : "Sign in so your progress follows you to any device.";

  const cta =
    mode === "signup" ? "Create account"
    : mode === "confirm" ? "Confirm and sign in"
    : mode === "forgot" ? "Send reset code"
    : mode === "reset" ? "Reset and sign in"
    : "Sign in";

  const busyLabel =
    mode === "signup" ? "Creating your account…"
    : mode === "forgot" ? "Sending the code…"
    : mode === "confirm" || mode === "reset" ? "Checking the code…"
    : "Signing in…";

  return (
    <div className="relative min-h-[100dvh]">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="grid min-h-[100dvh] place-items-center px-5 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          <h1 className="font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight tracking-tight text-white-pure">
            {title}
          </h1>
          <p className="mt-2 text-sm text-mist">{subtitle}</p>

          {contextPrompt && (mode === "signin" || mode === "signup") && (
            <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-chalk">{contextPrompt}</p>
          )}

          <form onSubmit={submit} className="mt-8 space-y-4">
            {(mode === "confirm" || mode === "reset") && (
              <Field
                label={mode === "confirm" ? "VERIFICATION CODE" : "RESET CODE"}
                value={code}
                onChange={setCode}
                placeholder="123456"
                autoComplete="one-time-code"
                inputMode="numeric"
              />
            )}
            {mode === "reset" && (
              <Field
                label="NEW PASSWORD"
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                hint={PASSWORD_RULE}
              />
            )}
            {(mode === "signin" || mode === "signup" || mode === "forgot") && (
              <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
            )}
            {(mode === "signin" || mode === "signup") && (
              <Field
                label="PASSWORD"
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                hint={mode === "signup" ? PASSWORD_RULE : undefined}
              />
            )}

            {error && (
              <div role="alert" className="flex items-start gap-2 border-l-2 border-fail pl-3">
                <Warning size={15} weight="fill" className="mt-0.5 shrink-0 text-fail" aria-hidden />
                <p className="text-sm leading-relaxed text-chalk">
                  {error.message}
                  {error.fix && (
                    <>
                      {" "}
                      <button type="button" onClick={() => applyFix(error.fix!)} className={`text-accent underline-offset-4 hover:underline ${FOCUS}`}>
                        {FIX_LABEL[error.fix]}
                      </button>
                    </>
                  )}
                </p>
              </div>
            )}
            <p aria-live="polite" className="text-sm text-survive empty:hidden">{notice}</p>

            <div className="pt-2">
              <MagneticButton type="submit" disabled={busy} className="w-full">
                {busy ? busyLabel : cta}
                {!busy && <ArrowRight size={16} weight="bold" aria-hidden />}
              </MagneticButton>
            </div>
          </form>

          {/* Footer links */}
          <div className="mt-6 flex flex-col items-center text-sm text-mist">
            {mode === "signin" && (
              <>
                <p>
                  No account yet?{" "}
                  <button onClick={() => go("signup")} className={`${LINK} text-accent`}>Create one</button>
                </p>
                <button onClick={() => go("forgot")} className={`${LINK} hover:text-chalk`}>Forgot password?</button>
              </>
            )}
            {mode === "signup" && (
              <p>
                Already have one?{" "}
                <button onClick={() => go("signin")} className={`${LINK} text-accent`}>Sign in</button>
              </p>
            )}
            {(mode === "confirm" || mode === "reset") && (
              <p>
                Didn't get it?{" "}
                <button onClick={resend} className={`${LINK} text-accent`}>Resend code</button>
              </p>
            )}
            {mode !== "signin" && mode !== "signup" && (
              <button onClick={() => go("signin")} className={`${LINK} hover:text-chalk`}>Back to sign in</button>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  inputMode,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete: string;
  inputMode?: "numeric";
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-mono text-[11px] tracking-[0.16em] text-mist">{label}</label>
      <input
        id={id}
        required
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-[15px] text-chalk placeholder:text-fog focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
      />
      {hint && <p id={`${id}-hint`} className="text-xs text-mist">{hint}</p>}
    </div>
  );
}
