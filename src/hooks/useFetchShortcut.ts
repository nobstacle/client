import { useEffect } from "react";
import {
  getShortcutControllerGetShortcutManyQueryKey,
  getShortcutControllerGetShortcutOneQueryKey,
  useShortcutControllerGetShortcutMany,
  useShortcutControllerGetShortcutOne,
} from "../lib/client/api";
import useShortcutStore from "../lib/zustand/store/shortcutStore";

export const useFetchShortcut = () => {
  const defaultSlideshowShortcut = useShortcutControllerGetShortcutOne(
    { type: "DefaultSlideshow" },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryKey: getShortcutControllerGetShortcutOneQueryKey({
          type: "DefaultSlideshow",
        }),
      },
    },
  );

  const langaugeShortcuts = useShortcutControllerGetShortcutMany(
    {
      type: "Language",
    },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getShortcutControllerGetShortcutManyQueryKey({
          type: "Language",
        }),
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  );

  const templateShortcuts = useShortcutControllerGetShortcutMany(
    {
      type: "Template",
    },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getShortcutControllerGetShortcutManyQueryKey({
          type: "Template",
        }),
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  );

  const {
    setDefaultSlideshowShortcut,
    setLanguagesShortcuts,
    setTemplatesShortcuts,
  } = useShortcutStore();

  useEffect(() => {
    if (defaultSlideshowShortcut.isSuccess) {
      if (defaultSlideshowShortcut.data) {
        setDefaultSlideshowShortcut(defaultSlideshowShortcut.data);
      }
    } else {
      setDefaultSlideshowShortcut(null);
    }
  }, [defaultSlideshowShortcut.isSuccess]);

  useEffect(() => {
    if (langaugeShortcuts.isSuccess) {
      if (langaugeShortcuts.data) {
        setLanguagesShortcuts(langaugeShortcuts.data);
      }
    } else {
      setLanguagesShortcuts([]);
    }
  }, [langaugeShortcuts.isSuccess]);

  useEffect(() => {
    if (templateShortcuts.isSuccess) {
      if (templateShortcuts.data) {
        setTemplatesShortcuts(templateShortcuts.data);
      }
    } else {
      setTemplatesShortcuts([]);
    }
  }, [templateShortcuts.isSuccess]);
};
