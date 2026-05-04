"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { languages } from "../../../../constant/languages";
import { useCompanyControllerGetCompany } from "../../../../lib/client/api";
import { UseFormRegister } from "react-hook-form";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useShortcuts } from "../../../../app/dashboard/ShortcutProvider";

interface LanguagePickerPropsI {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue: string;
  register?: UseFormRegister<any>;
  name: string;
  checkIframe?: boolean;
  compactDesktop?: boolean;
}

export const LanguagePicker: React.FC<LanguagePickerPropsI> = ({
  defaultValue,
  onChange,
  register,
  name,
  checkIframe = true,
  compactDesktop = false,
}) => {
  const registerActive = register ? { ...register(name) } : {};
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const dense = checkIframe || compactDesktop;
  const uniqueLanguages = useMemo(() => {
    const seen = new Set<string>();
    return languages.filter((language) => {
      if (seen.has(language.code)) {
        return false;
      }
      seen.add(language.code);
      return true;
    });
  }, []);

  return (
    <select
      className={isMobile ? 'w-full rounded-md' : `rounded-md truncate ${dense ? 'text-xs' : ''}`}
      onChange={onChange}
      value={defaultValue}
      name={name}
      style={{ 
        maxWidth: isMobile ? '' : dense ? '112px' : '145px',
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      }}
      {...registerActive}
    >
      {uniqueLanguages.map(({ code, name }) => (
        <option
          value={code}
          key={code}
          style={{
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            whiteSpace: 'nowrap'
          }}
        >
          {name}
        </option>
      ))}
    </select>
  );
};

export const HeaderLanguagePicker = ({
  checkIframe = true,
  compactDesktop = false,
}: {
  checkIframe?: boolean;
  compactDesktop?: boolean;
}) => {
  const router = useRouterWithQueryParams();
  const params = useSearchParams();
  const { data } = useCompanyControllerGetCompany();
  const isHydrated = useHasHydrated();
  const { emitSendLangCode } = useSocketContext();

  // Get language shortcuts to check if selected language exists
  const { languageShortcuts, addLanguageShortcut } = useShortcuts();

  const headerLangaugePickerDefault =
    params.get("lang") || data?.defaultLangCode || "en";

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.currentTarget.value;

    // Update URL and emit socket event
    router.push("lang", newLang);
    emitSendLangCode({
      langCode: newLang,
      station: Number(params.get("station") ?? 1),
    });

    // Check if the selected language exists in shortcuts
    const existsInShortcuts = languageShortcuts.some(
      shortcut => shortcut.value === newLang
    );

    // If language doesn't exist in shortcuts, add it
    if (!existsInShortcuts && addLanguageShortcut) {
      try {
        await addLanguageShortcut(newLang);
      } catch (error) {
        console.error('[HeaderLanguagePicker] Failed to add language shortcut:', error);
      }
    }
  };

  if (!isHydrated) return null;

  return (
    <LanguagePicker
      name="header-language-picker"
      checkIframe={checkIframe}
      compactDesktop={compactDesktop}
      defaultValue={headerLangaugePickerDefault}
      onChange={handleLanguageChange}
    />
  );
};
