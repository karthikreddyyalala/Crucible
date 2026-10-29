import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Warning } from "@phosphor-icons/react";
import { Atmosphere } from "@/components/Atmosphere";
import { Wordmark } from "@/components/Wordmark";
import { MagneticButton } from "@/components/MagneticButton";
import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";
import { signInPrompt, redirectTarget } from "@/lib/authContext";

type Mode = "signin" | "signup" | "confirm" | "forgot" | "reset";

function formatAuthError(e: unknown): string {
  if (!(e instanceof Error)) return "Something went wrong. Try again.";
  switch (e.name) {
    case "UserNotFoundException":         return "No account found with that email.";
    case "NotAuthorizedException":        return "Incorrect email or password.";
    case "UsernameExistsException":       return "An account with that email already exists.";
    case "CodeMismatchException":         return "Incorrect code. Check your email.";
    case "ExpiredCodeException":          return "That code has expired. Request a new one.";
    case "LimitExceededException":        return "Too many attempts. Wait a few minutes and try again.";
    case "InvalidParameterException":     return "Check your email and password format.";
    case "InvalidPasswordException":      return "Password must be 8+ characters with uppercase, lowercase, and a number.";
    default:                              return e.message || "Something went wrong. Try again.";
  }
}

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
  const [error, setError] = useState("");

  const go = (m: Mode) => {
    setError("");
    setCode("");
    setMode(m);
  };

  const submit = async () => {
    setError("");
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
    } catch (e) {
      setError(formatAuthError(e));
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
    : mode === "forgot" ? "We'll email you a reset code."
    : mode === "reset" ? `Enter the code sent to ${email}.`
    : "Your weakness history follows your account across devices.";

  const cta =
    mode === "signup" ? "Create account"
    : mode === "confirm" ? "Confirm & sign in"
    : mode === "forgot" ? "Send reset code"
    : mode === "reset" ? "Reset & sign in"
    : "Sign in";

  const label = mode === "confirm" ? "VERIFY EMAIL" : mode === "forgot" || mode === "reset" ? "RESET PASSWORD" : "ACCOUNT";

  return (
    <div className="relative min-h-[100dvh]">
      <Atmosphere />
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-20 max-w-[1200px] items-center px-5 sm:px-8">
          <Wordmark />
        </div>
      </header>

      <main className="grid min-h-[100dvh] place-items-center px-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          <span className="font-mono text-xs tracking-[0.2em] text-accent">{label}</span>
          <h1 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] font-bold leading-tight tracking-tight text-white-pure">
            {title}
          </h1>
          <p className="mt-2 text-sm text-mist">{subtitle}</p>

          {contextPrompt && (mode === "signin" || mode === "signup") && (
            <div className="mt-4 rounded-xl border border-accent/25 bg-accent/[0.07] px-3.5 py-2.5">
              <span className="font-mono text-[11px] tracking-wide text-accent">
                {contextPrompt}
              </span>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {mode === "confirm" && (
              <Field label="VERIFICATION CODE" value={code} onChange={setCode} placeholder="123456" />
            )}
            {mode === "reset" && (
              <>
                <Field label="RESET CODE" value={code} onChange={setCode} placeholder="123456" />
                <Field label="NEW PASSWORD" type="password" value={newPassword} onChange={setNewPassword} placeholder="8+ chars, upper, lower, number" />
              </>
            )}
            {(mode === "signin" || mode === "signup" || mode === "forgot") && (
              <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
            )}
            {(mode === "signin" || mode === "signup") && (
              <Field label="PASSWORD" type="password" value={password} onChange={setPassword} placeholder="8+ chars, upper, lower, number" />
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-fail/30 bg-fail/5 px-3.5 py-2.5">
                <Warning size={15} weight="fill" className="mt-0.5 shrink-0 text-fail" />
                <span className="text-xs leading-relaxed text-fail">{error}</span>
              </div>
            )}

            <div className="pt-2">
              <MagneticButton onClick={submit} disabled={busy} className="w-full">
                {busy ? "Working…" : cta}
                {!busy && <ArrowRight size={16} weight="bold" />}
              </MagneticButton>
            </div>
          </div>

          {/* Footer links */}
          {mode === "signin" && (
            <div className="mt-6 space-y-3 text-center text-sm text-fog">
              <p>
                No account yet?{" "}
                <button onClick={() => go("signup")} className="text-accent transition-opacity hover:opacity-70">
                  Create one
                </button>
              </p>
              <p>
                <button onClick={() => go("forgot")} className="text-fog transition-colors hover:text-chalk">
                  Forgot password?
                </button>
              </p>
            </div>
          )}
          {mode === "signup" && (
            <p className="mt-6 text-center text-sm text-fog">
              Already have one?{" "}
              <button onClick={() => go("signin")} className="text-accent transition-opacity hover:opacity-70">
                Sign in
              </button>
            </p>
          )}
          {mode === "confirm" && (
            <p className="mt-6 text-center text-sm text-fog">
              Didn't get it?{" "}
              <button onClick={() => authApi.resendCode(email)} className="text-accent transition-opacity hover:opacity-70">
                Resend code
              </button>
            </p>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <p className="mt-6 text-center text-sm text-fog">
              <button onClick={() => go("signin")} className="text-fog transition-colors hover:text-chalk">
                Back to sign in
              </button>
            </p>
          )}
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-mono text-[11px] tracking-[0.16em] text-fog">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-line bg-ink px-4 py-3 text-[15px] text-chalk placeholder:text-fog focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40"
      />
    </div>
  );
}
