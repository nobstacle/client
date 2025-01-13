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

  const headerLangaugePickerDefault =
    params.get("lang") || company?.defaultLangCode || "en";

  const { languagesShortcuts } = useShortcutStore();
  const { emitSendLangCode } = useSocketContext();

  if (!isHydrated) return <Spinner />;

  return (
    <>
      {languagesShortcuts
        .sort((a, b) => a.order! - b.order!)
        .map((res) => (
          <RadioInput
            key={res.id}
            onClick={(value) => {
              setChecked(value);
              router.push("lang", value);

              emitSendLangCode({
                langCode: value,
                station: Number(params.get("station") ?? 1),
              });
            }}
            data={res}
            isChecked={
              headerLangaugePickerDefault === res.value
                ? headerLangaugePickerDefault === res.value
                : checked === res.value
            }
          />
        ))}
    </>
  );
};

const RadioInput: React.FC<{
  data: GetShortcutRes;
  isChecked: boolean;
  onClick: (e: string) => void;
}> = ({ data, isChecked, onClick }) => {
  return (
    <div>
      <label className="text-white" htmlFor={data.value}>
        {data.value}{" "}
      </label>
      <input
        onClick={(e) => onClick(e.currentTarget.value)}
        className="cursor-pointer"
        id={`${data.value}-${data.order}`}
        value={data.value}
        type="radio"
        checked={isChecked}
      />
    </div>
  );
};
