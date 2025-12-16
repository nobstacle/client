"use client";

import { createContext, useContext, ReactNode } from "react";
import { useShortcutControllerGetShortcutMany } from "../../lib/client/api";
import { GetShortcutRes } from "../../lib/client/model";

interface ShortcutsContextType {
  languageShortcuts: GetShortcutRes[];
  templateShortcuts: GetShortcutRes[];
  isLoading: boolean;
}

const ShortcutsContext = createContext<ShortcutsContextType>({
  languageShortcuts: [],
  templateShortcuts: [],
  isLoading: true,
});

export const useShortcuts = () => useContext(ShortcutsContext);

export function ShortcutsProvider({ children }: { children: ReactNode }) {
  // Fetch ALL shortcuts in ONE request
  const { data: allShortcuts = [], isLoading } = useShortcutControllerGetShortcutMany(
    undefined, // Fetch all types
    {
      query: {
        queryKey: ["shortcuts", "all"],
        staleTime: Infinity, // Cache forever
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
      },
    }
  );

  // Split into categories (done client-side, no extra API call)
  const languageShortcuts = allShortcuts.filter((s) => s.type === "Language");
  const templateShortcuts = allShortcuts.filter((s) => s.type === "Template");

  return (
    <ShortcutsContext.Provider
      value={{
        languageShortcuts,
        templateShortcuts,
        isLoading,
      }}
    >
      {children}
    </ShortcutsContext.Provider>
  );
}