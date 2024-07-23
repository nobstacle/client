"use client";
import * as React from "react";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { ChatType } from "../../../../constant/types";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";

export const CompanyLogo: React.FC = () => {
  const { company } = useCompanyStore();
  const { emitSendTemplate } = useSocketContext();
  const { defaulSlideshowShortcut } = useShortcutStore();
  const { slideshows } = useTemplateStore();

  const template =
    slideshows.filter(({ tag }) => tag === defaulSlideshowShortcut?.value)[0] ??
    null;

  const params = useSearchParams();

  const sendTemplate = (id: number, isAvailable: boolean) => {
    emitSendTemplate({
      refId: id,
      langCode: isAvailable
        ? params.get("lang") || company?.defaultLangCode || "en"
        : company?.defaultLangCode || "en",
      refType: ChatType.Slideshow,
      station: Number(params.get("station") ?? 1),
    });
  };

  const hasHydrated = useHasHydrated();

  if (hasHydrated)
    return (
      <img
        onClick={() => {
          if (template) {
            sendTemplate(
              template.id,
              template.langCode.includes(
                params.get("lang") || company?.defaultLangCode || "",
              ),
            );
          }
        }}
        style={{
          cursor: template ? "pointer" : "default",
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    );

  return <div></div>;
};
