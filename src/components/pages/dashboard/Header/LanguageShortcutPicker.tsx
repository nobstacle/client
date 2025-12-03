"use client";

import { useState } from "react";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { GetShortcutRes } from "../../../../lib/client/model";

// This is the correct hook!
import { useShortcutControllerGetShortcutMany } from "../../../../lib/client/api";

export const LanguageShortcutPicker: React.FC = () => {
  const router = useRouterWithQueryParams();
  const params = useSearchParams();
  const { emitSendLangCode } = useSocketContext();
  const isHydrated = useHasHydrated();

  const [checked, setChecked] = useState<string>("");

  // Fetch shortcuts directly from backend
  const { data: shortcuts = [], isLoading } = useShortcutControllerGetShortcutMany(
    { type: "Language" }, // Filter by language shortcuts
    {
      query: {
        queryKey: ["shortcuts", "language"],
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
      },
    }
  );

  const currentLang = params.get("lang") || "en";

  const handleLanguageChange = (value: string) => {
    setChecked(value);
    router.push("lang", value);
    emitSendLangCode({
      langCode: value,
      station: Number(params.get("station") ?? 1),
    });
  };

  if (!isHydrated || isLoading) {
    return <div className="h-8 w-32 bg-white/20 rounded animate-pulse" />;
  }

  if (shortcuts.length === 0) {
    return null; // Hide if no shortcuts configured
  }

  const sorted = [...shortcuts].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <>
      {/* Mobile: Select */}
      <div className="block md:hidden">
        <select
          value={currentLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded bg-white/10 text-white border border-white/20"
        >
          {sorted.map((s) => (
            <option key={s.id} value={s.value}>
              {s.value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Radio Buttons */}
      <div className="hidden md:flex items-center gap-4">
        {sorted.map((shortcut) => {
          const isActive = currentLang === shortcut.value || checked === shortcut.value;

          return (
            <button
              key={shortcut.id}
              onClick={() => handleLanguageChange(shortcut.value)}
              className={`flex items-center gap-2 px-3 py-1 rounded transition-all ${
                isActive
                  ? "bg-white text-[#3b5998] font-semibold"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full border-2 transition-all ${
                  isActive ? "border-white bg-white" : "border-white/60"
                }`}
              >
                {isActive && <div className="w-1.5 h-1.5 m-0.5 rounded-full bg-[#3b5998]" />}
              </div>
              <span className="text-sm font-medium">{shortcut.value.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};