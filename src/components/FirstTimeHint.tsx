import { useState, type ReactNode } from "react";
import { Info } from "@phosphor-icons/react";

const seen = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

/** A one-line tip shown until dismissed once on this device. */
export function FirstTimeHint({ id, children, className = "" }: { id: string; children: ReactNode; className?: string }) {
  const key = `crucible.hint.${id}`;
  const [open, setOpen] = useState(() => !seen(key));
  if (!open) return null;
  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* shows again next time */
    }
  };
  return (
    <div role="note" className={`flex items-center gap-3 ${className}`}>
      <Info size={16} weight="bold" className="shrink-0 text-accent" aria-hidden />
      <p className="flex-1 font-sans text-[13.5px] leading-relaxed text-chalk">{children}</p>
      <button
        onClick={dismiss}
        className="min-h-11 shrink-0 rounded-lg px-3 font-sans text-[13px] text-mist transition-colors hover:text-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Got it
      </button>
    </div>
  );
}
