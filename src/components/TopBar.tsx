import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Wordmark } from "./Wordmark";
import { authApi } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

export function TopBar({ right, wide = false }: { right?: ReactNode; wide?: boolean }) {
  const navigate = useNavigate();
  const status = useAuthStore((s) => s.status);
  const signOut = useAuthStore((s) => s.signOut);

  const showSignOut = authApi.configured && status === "authed" && !right;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-void/70 backdrop-blur-xl">
      <div className={`mx-auto flex h-16 items-center justify-between px-5 sm:px-8 ${wide ? "max-w-none" : "max-w-[1200px]"}`}>
        <Wordmark />
        {right}
        {showSignOut && (
          <button
            onClick={async () => {
              await signOut();
              navigate("/");
            }}
            className="font-mono text-[11px] tracking-wide text-fog transition-colors hover:text-chalk"
          >
            SIGN OUT
          </button>
        )}
      </div>
    </header>
  );
}
