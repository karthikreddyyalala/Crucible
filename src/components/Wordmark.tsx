import { Link } from "react-router-dom";

export function Wordmark({ to = "/" }: { to?: string }) {
  return (
    <Link to={to} className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <span className="relative grid h-7 w-7 place-items-center">
        <svg viewBox="0 0 32 32" className="h-7 w-7">
          <path
            d="M9 22 L16 9 L23 22"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="24.5" r="1.7" fill="var(--color-survive)" />
        </svg>
        <span className="absolute inset-0 rounded-full bg-accent/20 blur-md opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </span>
      <span className="font-display text-[17px] font-bold tracking-tight text-chalk">
        Crucible
      </span>
    </Link>
  );
}
