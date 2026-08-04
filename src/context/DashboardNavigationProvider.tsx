"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type DashboardNavigationContextValue = {
  isNavigating: boolean;
  pendingHref: string | null;
  startNavigation: (href: string) => void;
};

const DashboardNavigationContext =
  createContext<DashboardNavigationContextValue | null>(null);

function normalizePath(href: string) {
  return href.split("?")[0];
}

// Maximum time (ms) the progress indicator stays visible.
// If the route hasn't resolved after this, we hide the bar to avoid a
// permanently stuck progress indicator (e.g., on network error or slow server).
const MAX_NAV_INDICATOR_MS = 8000;

export function DashboardNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearNavTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startNavigation = useCallback(
    (href: string) => {
      if (normalizePath(href) === pathname) {
        return;
      }
      clearNavTimeout();
      setPendingHref(href);
      // Auto-clear the indicator after the safety timeout
      timeoutRef.current = setTimeout(() => {
        setPendingHref(null);
      }, MAX_NAV_INDICATOR_MS);
    },
    [pathname],
  );

  // Clear pending state when the route change is confirmed
  useEffect(() => {
    clearNavTimeout();
    setPendingHref(null);
  }, [pathname]);

  // Cleanup on unmount
  useEffect(() => {
    return clearNavTimeout;
  }, []);

  const value = useMemo(
    () => ({
      isNavigating: pendingHref !== null,
      pendingHref,
      startNavigation,
    }),
    [pendingHref, startNavigation],
  );

  return (
    <DashboardNavigationContext.Provider value={value}>
      {children}
    </DashboardNavigationContext.Provider>
  );
}

export function useDashboardNavigation(): DashboardNavigationContextValue {
  const context = useContext(DashboardNavigationContext);
  if (!context) {
    throw new Error(
      "useDashboardNavigation must be used within DashboardNavigationProvider",
    );
  }
  return context;
}
