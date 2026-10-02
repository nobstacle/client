"use client";

import { create } from "zustand";
import { GetShortcutRes } from "../../client/model";
import { persist } from "zustand/middleware";

interface ShortcutState {
  shortcuts: GetShortcutRes[];
  setShortcuts: (shortcut: GetShortcutRes[]) => void;
  setDefaultSlideshowShortcut: (shortcut?: GetShortcutRes | null) => void;
  defaulSlideshowShortcut: GetShortcutRes | null;
  setLanguagesShortcuts: (shortcuts?: GetShortcutRes[]) => void;
  languagesShortcuts: GetShortcutRes[];

  setTemplatesShortcuts: (shortcuts?: GetShortcutRes[]) => void;
  templatesShortcuts: GetShortcutRes[];
}

const useShortcutStore = create<ShortcutState>()(
  persist(
    (set, get) => ({
      shortcuts: [],
      setShortcuts: (shortcuts) => {
        const current = get().shortcuts;
        if (current === shortcuts) return;
        set({ shortcuts: shortcuts || [] });
      },
      setDefaultSlideshowShortcut: (defaulSlideshowShortcut) => {
        const current = get().defaulSlideshowShortcut;
        if (current === defaulSlideshowShortcut) return;
        if (current?.id === defaulSlideshowShortcut?.id && current?.value === defaulSlideshowShortcut?.value) return;
        set({ defaulSlideshowShortcut: defaulSlideshowShortcut || null });
      },
      defaulSlideshowShortcut: null,
      languagesShortcuts: [],
      setLanguagesShortcuts: (languagesShortcuts) => {
        const current = get().languagesShortcuts;
        if (current === languagesShortcuts) return;
        set({ languagesShortcuts: languagesShortcuts || [] });
      },
      templatesShortcuts: [],
      setTemplatesShortcuts: (templatesShortcuts) => {
        const current = get().templatesShortcuts;
        if (current === templatesShortcuts) return;
        set({ templatesShortcuts: templatesShortcuts || [] });
      },
    }),
    {
      name: "shortcut-storage", // name of the item in the storage (must be unique)
    },
  ),
);

export default useShortcutStore;
