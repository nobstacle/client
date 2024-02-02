"use client";

import { useSearchParams } from "next/navigation";
import { languages } from "../../../../constant/languages";
import { useCompanyControllerGetCompany } from "../../../../lib/client/api";
import { UseFormRegister } from "react-hook-form";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import { Spinner } from "../../../Spinner";

interface LanguagePickerPropsI {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  defaultValue: string;
  register?: UseFormRegister<any>;
  name: string;
}

export const LanguagePicker: React.FC<LanguagePickerPropsI> = ({
  defaultValue,
  onChange,
  register,
  name,
}) => {
  const registerActive = register ? { ...register(name) } : {};

  return (
    <select
      className="rounded-md"
      onChange={onChange}
      defaultValue={defaultValue}
      name={name}
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

export const HeaderLanguagePicker = () => {
  const router = useRouterWithQueryParams();
  const params = useSearchParams();
  const { data } = useCompanyControllerGetCompany();
  const isHydrated = useHasHydrated();
  const headerLangaugePickerDefault =
    params.get("lang") || data?.defaultLangCode || "en";

  if (!isHydrated) return null;

  return (
    <LanguagePicker
      name="header-language-picker"
      defaultValue={headerLangaugePickerDefault}
      onChange={(e) => {
        router.push("lang", e.currentTarget.value);
      }}
    />
  );
};
