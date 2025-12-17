"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useShortcutControllerGetShortcutMany } from "../../lib/client/api";
import { GetShortcutRes } from "../../lib/client/model";

interface ShortcutsContextType {
  languageShortcuts: GetShortcutRes[];
  templateShortcuts: GetShortcutRes[];
  isLoading: boolean;
  error: Error | null;
}

const ShortcutsContext = createContext<ShortcutsContextType>({
  languageShortcuts: [],
  templateShortcuts: [],
  isLoading: true,
  error: null,
});

export const useShortcuts = () => useContext(ShortcutsContext);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  // Fetch ALL shortcuts in ONE request with maximum caching
  const { data: allShortcuts = [], isLoading, error } = useShortcutControllerGetShortcutMany(
    undefined,
    {
      query: {
        queryKey: ["shortcuts", "all"],
        staleTime: Infinity, // Never consider data stale
        gcTime: Infinity, // Keep in cache forever
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        retry: 2, // Retry failed requests twice
        retryDelay: 1000, // Wait 1s between retries
      },
    }
  );

  // Memoize filtered shortcuts to avoid recalculation
  const languageShortcuts = useMemo(
    () => allShortcuts.filter((s) => s.type === "Language"),
    [allShortcuts]
  );

  const templateShortcuts = useMemo(
    () => allShortcuts.filter((s) => s.type === "Template"),
    [allShortcuts]
  );

  const contextValue = useMemo(
    () => ({
      languageShortcuts,
      templateShortcuts,
      isLoading,
      error: error as Error | null,
    }),
    [languageShortcuts, templateShortcuts, isLoading, error]
  );

  return (
    <ShortcutsContext.Provider value={contextValue}>
      {children}
    </ShortcutsContext.Provider>
  );
}