"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";
import * as Io5Icons from "react-icons/io5";
import { useShortcuts } from "../../../../app/dashboard/ShortcutProvider";
import {
  ChatType,
  GetDocumentTemplateRes,
  GetImageTemplateRes,
  GetMapTemplateRes,
  GetSlideshowTemplateRes,
  GetTextTemplateRes,
  GetVideoTemplateRes,
  GetWebsiteTemplateRes,
} from "../../../../lib/client/model";

export const TemplateShortcutPicker: React.FC<{ checkIframe?: boolean }> = ({
  checkIframe = true
}) => {
  const { emitSendTemplate } = useSocketContext();
  const { company } = useCompanyStore();
  const { texts, images, videos, slideshows, maps, websites, documents } = useTemplateStore();
  const isHydrated = useHasHydrated();
  const [isInIframe, setIsInIframe] = useState(false);
  const params = useSearchParams();

  // Get from shared provider (no API call here!)
  const { templateShortcuts, isLoading } = useShortcuts();

  useEffect(() => {
    if (checkIframe) {
      setIsInIframe(window.self !== window.top);
    }
  }, [checkIframe]);

  // Memoize sorted shortcuts
  const sortedShortcuts = useMemo(() => {
    return [...templateShortcuts].sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [templateShortcuts]);

  const renderIcon = (iconName: string, color?: string) => {
    const IconComponent = (Io5Icons as any)[iconName];
    const iconSize = isInIframe ? 18 : 25;
    return IconComponent ? <IconComponent size={iconSize} color={color || "white"} /> : null;
  };

  const handleOnSendTemplateClick = (id: number, type: ChatType, tag: string) => {
    const templateShortcut = templateShortcuts.find((s) => s.id === id);
    if (!templateShortcut) return;

    if (isInIframe) {
      window.parent.postMessage({
        type: 'TEMPLATE_SHORTCUT_CLICK',
        templateType: type,
        refType: type,
        id: id,
        tag: tag
      }, '*');
      return;
    }

    // ... rest of your existing click handler logic
    let template:
      | GetTextTemplateRes
      | GetImageTemplateRes
      | GetVideoTemplateRes
      | GetSlideshowTemplateRes
      | GetMapTemplateRes
      | GetWebsiteTemplateRes
      | GetDocumentTemplateRes
      | undefined;

    let isExistOnDefaultLanguage = false;

    switch (type) {
      case "Text":
        template = texts.find(
          (text) =>
            text.tag === tag &&
            text.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = texts.find(
            (text) => text.tag === tag && text.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      // ... add other cases (Image, Video, etc.)
    }

    if (!template) return;

    emitSendTemplate({
      refId: template.id,
      langCode: isExistOnDefaultLanguage
        ? company?.defaultLangCode || "en"
        : params.get("lang") || company?.defaultLangCode || "en",
      refType: type as any,
      station: Number(params.get("station") ?? 1),
      contentExtra: (template as GetImageTemplateRes | GetVideoTemplateRes)?.ext ?? undefined,
    });
  };

  if (!isHydrated || isLoading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-6 h-6 bg-white/20 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className={`flex cursor-pointer ${isInIframe ? 'gap-1' : 'gap-2'}`}>
      {sortedShortcuts.map((res) => (
        <span
          key={res.id}
          onClick={() => handleOnSendTemplateClick(res.id, res.key as any, res.value)}
          title={`${res.value}/${res.key}`}
          className={`flex items-center justify-center ${
            isInIframe ? 'h-[20px] w-[20px]' : 'h-[25px] w-[25px]'
          }`}
        >
          {renderIcon(res.extraValue ?? "IoAdd", res.color)}
        </span>
      ))}
    </div>
  );
};