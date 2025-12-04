"use client";

import { useSearchParams } from "next/navigation";
import { languages } from "../../../../constant/languages";
import { useCompanyControllerGetCompany } from "../../../../lib/client/api";
import { UseFormRegister } from "react-hook-form";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useHasHydrated } from "../../../../hooks/useHydrated";
// import { Spinner } from "../../../Spinner";
import { useSocketContext } from "../../../../context/SocketContextProvider";

interface LanguagePickerPropsI {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue: string;
  register?: UseFormRegister<any>;
  name: string;
  checkIframe?: boolean;
}

export const LanguagePicker: React.FC<LanguagePickerPropsI> = ({
  defaultValue,
  onChange,
  register,
  name,
  checkIframe = true,
}) => {
  const registerActive = register ? { ...register(name) } : {};
  let isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  return (
    <select
      className={isMobile ? 'w-full rounded-md' : "rounded-md"}
      onChange={onChange}
      defaultValue={defaultValue}
      name={name}
      style={{ maxWidth: isMobile ? '' : '145px' }}
      {...registerActive}
    >
      {languages.map(({ code, name }) => (
        <option selected={code === defaultValue} value={code} key={code}>
          {name}
        </option>
      ))}
    </select>
  );
};

export const HeaderLanguagePicker = ({ checkIframe = true }: { checkIframe?: boolean }) => {
  const router = useRouterWithQueryParams();
  const params = useSearchParams();
  const { data } = useCompanyControllerGetCompany();
  const isHydrated = useHasHydrated();
  const headerLangaugePickerDefault =
    params.get("lang") || data?.defaultLangCode || "en";
  const { emitSendLangCode } = useSocketContext();

  if (!isHydrated) return null;

  return (
    <LanguagePicker
      name="header-language-picker"
      checkIframe={checkIframe}
      defaultValue={headerLangaugePickerDefault}
      onChange={(e) => {
        router.push("lang", e.currentTarget.value);

        emitSendLangCode({
          langCode: e.currentTarget.value,
          station: Number(params.get("station") ?? 1),
        });
      }}
    />
  );
};
