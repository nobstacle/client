"use client";

import { createContext, useContext, ReactNode, useMemo, useEffect } from "react";
import { useShortcutControllerGetShortcutMany, useShortcutControllerCreateShortcutMany } from "../../lib/client/api";
import { GetShortcutRes } from "../../lib/client/model";
import useShortcutStore from "../../lib/zustand/store/shortcutStore";

interface ShortcutsContextType {
  languageShortcuts: GetShortcutRes[];
  templateShortcuts: GetShortcutRes[];
  isLoading: boolean;
  error: Error | null;
  addLanguageShortcut?: (lang: string) => Promise<void>;
  refetch?: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextType>({
  languageShortcuts: [],
  templateShortcuts: [],
  isLoading: true,
  error: null,
});

export const useShortcuts = () => useContext(ShortcutsContext);

const EMPTY_SHORTCUTS: GetShortcutRes[] = [];

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  const createShortcutMany = useShortcutControllerCreateShortcutMany();

  // Fetch ALL shortcuts in ONE request with maximum caching
  const { data, isLoading, error, refetch } = useShortcutControllerGetShortcutMany(
    undefined,
    {
      query: {
        queryKey: ["shortcuts", "all"],
        staleTime: 60 * 1000,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: false,
        retry: 2,
        retryDelay: 1000,
      },
    }
  );

  const allShortcuts = data ?? EMPTY_SHORTCUTS;

  // Synchronize server shortcut data into Zustand store so settings forms load existing configurations.
  // Using useShortcutStore.getState() avoids subscribing ShortcutsProvider to the store, preventing infinite render loops.
  useEffect(() => {
    if (!data || !Array.isArray(data)) return;

    const store = useShortcutStore.getState();
    store.setShortcuts(data);
    store.setLanguagesShortcuts(data.filter((s) => s.type === "Language"));
    store.setTemplatesShortcuts(data.filter((s) => s.type === "Template"));
    const ds = data.find((s) => s.type === "DefaultSlideshow");
    store.setDefaultSlideshowShortcut(ds || null);
  }, [data]);

  // Memoize filtered shortcuts to avoid recalculation
  const languageShortcuts = useMemo(
    () => allShortcuts.filter((s) => s.type === "Language"),
    [allShortcuts]
  );

  const templateShortcuts = useMemo(
    () => allShortcuts.filter((s) => s.type === "Template"),
    [allShortcuts]
  );

  const addLanguageShortcut = async (lang: string) => {
    try {
      const currentLanguages = allShortcuts.filter((s) => s.type === "Language");
      if (currentLanguages.some((s) => s.value === lang) || currentLanguages.length >= 7) return;

      const postShortCutReqArray = [
        ...currentLanguages.map((item, idx) => ({
          type: "Language" as const,
          value: item.value,
          key: item.value,
          order: idx + 1,
        })),
        {
          type: "Language" as const,
          value: lang,
          key: lang,
          order: currentLanguages.length + 1,
        },
      ];

      await createShortcutMany.mutateAsync({ data: { postShortCutReqArray } });
      refetch();
    } catch (err) {
      console.error("[ShortcutsProvider] Failed to add language shortcut:", err);
    }
  };

  const contextValue = useMemo(
    () => ({
      languageShortcuts,
      templateShortcuts,
      isLoading,
      error: error as Error | null,
      addLanguageShortcut,
      refetch: () => { refetch(); },
    }),
    [languageShortcuts, templateShortcuts, isLoading, error, refetch]
  );

  return (
    <ShortcutsContext.Provider value={contextValue}>
      {children}
    </ShortcutsContext.Provider>
  );
}