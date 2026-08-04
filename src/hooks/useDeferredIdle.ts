import { useEffect, useState } from "react";

/** Enables a flag after the browser is idle (or after a short timeout fallback). */
export const useDeferredIdle = (timeoutMs = 1500) => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setEnabled(true), {
        timeout: timeoutMs,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timerId = window.setTimeout(() => setEnabled(true), 100);
    return () => window.clearTimeout(timerId);
  }, [timeoutMs]);

  return enabled;
};
