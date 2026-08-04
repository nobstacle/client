"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

export function DashboardNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const startNavigation = useCallback(
    (href: string) => {
      if (normalizePath(href) === pathname) {
        return;
      }
      setPendingHref(href);
    },
    [pathname],
  );

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

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
