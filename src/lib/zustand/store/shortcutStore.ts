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
      setShortcuts: (shortcuts) => set(() => ({ shortcuts })),
      setDefaultSlideshowShortcut: (defaulSlideshowShortcut) =>
        set(() => ({ defaulSlideshowShortcut })),
      defaulSlideshowShortcut: null,
      languagesShortcuts: [],
      setLanguagesShortcuts: (languagesShortcuts) =>
        set(() => ({ languagesShortcuts })),
      templatesShortcuts: [],
      setTemplatesShortcuts: (templatesShortcuts) =>
        set(() => ({ templatesShortcuts })),
    }),
    {
      name: "shortcut-storage", // name of the item in the storage (must be unique)
    },
  ),
);

export default useShortcutStore;
