"use client";

import { useState, useEffect } from "react";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useShortcuts } from "../../../../app/dashboard/ShortcutProvider";


export const LanguageShortcutPicker = ({ checkIframe = true }: { checkIframe?: boolean }) => {
  const router = useRouterWithQueryParams();
  const params = useSearchParams();
  const { emitSendLangCode } = useSocketContext();
  const isHydrated = useHasHydrated();

  // Get from shared provider (no API call here!)
  const { languageShortcuts, isLoading, error } = useShortcuts();

  const [checked, setChecked] = useState<string>("");
  const currentLang = params.get("lang") || "en";

  const handleLanguageChange = (value: string) => {
    setChecked(value);
    router.push("lang", value);
    emitSendLangCode({
      langCode: value,
      station: Number(params.get("station") ?? 1),
    });
  };

  // Only show skeleton on initial mount
  if (!isHydrated) {
    return (
      <div className={`${checkIframe ? 'h-6 w-24' : 'h-8 w-32'} bg-white/20 rounded animate-pulse`} />
    );
  }

  // If error, show fallback
  if (error) {
    console.error('[LanguageShortcutPicker] Error loading shortcuts:', error);
    return null;
  }

  // If loading and no data, show minimal loader
  if (isLoading && languageShortcuts.length === 0) {
    return (
      <div className={`flex items-center ${checkIframe ? 'gap-2 px-2' : 'gap-4 px-3'}`}>
        <span className={`text-white/60 ${checkIframe ? 'text-xs' : 'text-sm'}`}>
          Loading...
        </span>
      </div>
    );
  }

  // If no shortcuts available
  if (languageShortcuts.length === 0) {
    return null;
  }

  const sorted = [...languageShortcuts].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <>
      {/* Mobile: Select */}
      <div className="block md:hidden">
        <select
          value={currentLang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className={`w-full ${checkIframe ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'} rounded bg-white/10 border border-white/20`}
        >
          {sorted.map((s) => (
            <option key={s.id} value={s.value} style={{ color: 'black' }}>
              {s.value.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop: Radio Buttons */}
      <div className={`hidden md:flex items-center ${checkIframe ? '' : 'gap-4'}`}>
        {sorted.map((shortcut) => {
          const isActive = currentLang === shortcut.value || checked === shortcut.value;

          return (
            <button
              key={shortcut.id}
              onClick={() => handleLanguageChange(shortcut.value)}
              className={`flex items-center ${checkIframe ? 'gap-1 px-2 py-0.5' : 'gap-2 px-3 py-1'} rounded transition-all ${
                isActive
                  ? "bg-white text-[#3b5998] font-semibold"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              <div
                className={`${checkIframe ? 'w-2.5 h-2.5' : 'w-3 h-3'} rounded-full border-2 transition-all ${
                  isActive ? "border-white bg-white" : "border-white/60"
                }`}
              >
                {isActive && (
                  <div className={`${checkIframe ? 'w-1 h-1 m-0.5' : 'w-1.5 h-1.5 m-0.5'} rounded-full bg-[#3b5998]`} />
                )}
              </div>
              <span className={`${checkIframe ? 'text-xs' : 'text-sm'} font-medium`}>
                {shortcut.value.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
};