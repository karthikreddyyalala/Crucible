import { useEffect, useRef } from "react";

export const IDLE_CHECKIN_MS = 180_000;

/**
 * Calls onIdle once after IDLE_CHECKIN_MS with no change to `activity` (code + message
 * count) while enabled. The store also allows only one check-in per problem.
 */
export function useIdleCheckin(enabled: boolean, activity: string, onIdle: () => void) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => onIdleRef.current(), IDLE_CHECKIN_MS);
    return () => clearTimeout(timer);
  }, [enabled, activity]);
}
