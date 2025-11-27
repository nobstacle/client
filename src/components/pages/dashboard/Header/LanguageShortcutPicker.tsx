"use client";

import { useState } from "react";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import { GetShortcutRes } from "../../../../lib/client/model";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { Spinner } from "../../../Spinner";
import { useSocketContext } from "../../../../context/SocketContextProvider";

export const LanguageShortcutPicker: React.FC = () => {
  const { company } = useCompanyStore();
  const router = useRouterWithQueryParams();
  const params = useSearchParams();
  const [checked, setChecked] = useState<string>("");
  const isHydrated = useHasHydrated();
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  const headerLangaugePickerDefault =
    params.get("lang") || company?.defaultLangCode || "en";

  const { languagesShortcuts } = useShortcutStore();
  const { emitSendLangCode } = useSocketContext();

  const handleLanguageChange = (value: string) => {
    setChecked(value);
    router.push("lang", value);

    emitSendLangCode({
      langCode: value,
      station: Number(params.get("station") ?? 1),
    });
  };

  if (!isHydrated) return <Spinner />;

  const sortedLanguages = languagesShortcuts.sort((a, b) => a.order! - b.order!);
  const selectedLanguage = sortedLanguages.find(
    lang => headerLangaugePickerDefault === lang.value || checked === lang.value
  );

  return (
    <>
      {/* Mobile Select Dropdown */}
      <div className="block md:hidden">
        <select
          value={selectedLanguage?.value || headerLangaugePickerDefault}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className={isMobile ? 'w-full rounded-md' : "rounded-md"}
        >
          {sortedLanguages.map((res) => (
            <option key={res.id} value={res.value} className="bg-primary text-white">
              {res.value}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop Radio Buttons */}
      <div className="hidden md:flex md:gap-4">
        {sortedLanguages.map((res) => (
          <RadioInput
            key={res.id}
            onClick={handleLanguageChange}
            data={res}
            isChecked={
              headerLangaugePickerDefault === res.value || checked === res.value
            }
          />
        ))}
      </div>
    </>
  );
};

const RadioInput: React.FC<{
  data: GetShortcutRes;
  isChecked: boolean;
  onClick: (value: string) => void;
}> = ({ data, isChecked, onClick }) => {
  return (
    <div className="flex items-center gap-2">
      <input
        onClick={(e) => onClick(e.currentTarget.value)}
        className="cursor-pointer"
        id={`${data.value}-${data.order}`}
        value={data.value}
        type="radio"
        checked={isChecked}
        readOnly
      />
      <label className="text-white cursor-pointer" htmlFor={`${data.value}-${data.order}`}>
        {data.value}
      </label>
    </div>
  );
};