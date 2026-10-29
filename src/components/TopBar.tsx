import { type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

const QUIET =
  "inline-flex min-h-11 items-center rounded-lg px-2 text-[13px] text-mist transition-colors hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function TopBar({ right, wide = false }: { right?: ReactNode; wide?: boolean }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);

  // A page that passes its own right-side content (the live interview) owns that slot.
  const showSignOut = authApi.configured && status === "authed" && !right;
  const showProgress = !right && pathname !== "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-void/70 backdrop-blur-xl">
      <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-5 sm:px-8 ${wide ? "max-w-none" : "max-w-[1200px]"}`}>
        <Wordmark />
        {right}
        {!right && (
          <nav aria-label="Account" className="flex items-center gap-2 sm:gap-4">
            {showProgress && (
              <Link to="/dashboard" className={QUIET}>
                Your progress
              </Link>
            )}
            {showSignOut && (
              <button
                onClick={async () => {
                  await signOut();
                  navigate("/");
                }}
                className={QUIET}
              >
                Sign out
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
