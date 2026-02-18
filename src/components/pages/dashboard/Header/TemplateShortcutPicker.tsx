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


export const TemplateShortcutPicker: React.FC<{ checkIframe?: boolean; isMobile?: boolean }> = ({
  checkIframe = true,
  isMobile
}) => {
  const { emitSendTemplate } = useSocketContext();
  const { company } = useCompanyStore();
  const { texts, images, videos, slideshows, maps, websites, documents, scrolls } = useTemplateStore();
  const isHydrated = useHasHydrated();
  const [isInIframe, setIsInIframe] = useState(false);
  const params = useSearchParams();

  // Get from shared provider (no API call here!)
  const { templateShortcuts, isLoading, error } = useShortcuts();

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

    // Rest of your existing click handler logic
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
      case "Image":
        template = images.find(
          (img) =>
            img.tag === tag &&
            img.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = images.find(
            (img) => img.tag === tag && img.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      case "Video":
        template = videos.find(
          (vid) =>
            vid.tag === tag &&
            vid.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = videos.find(
            (vid) => vid.tag === tag && vid.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      case "Website":
        template = websites.find(
          (web) =>
            web.tag === tag &&
            web.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = websites.find(
            (web) => web.tag === tag && web.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      case "Slideshow":
        template = slideshows.find(
          (slide) =>
            slide.tag === tag &&
            slide.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = slideshows.find(
            (slide) => slide.tag === tag && slide.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      case "Scroll":
        template = scrolls.find(
          (scroll) =>
            scroll.tag === tag &&
            scroll.langCode?.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = scrolls.find(
            (scroll) =>
              scroll.tag === tag &&
              scroll.langCode?.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      case "Map":
        template = maps.find(
          (map) =>
            map.tag === tag &&
            map.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = maps.find(
            (map) => map.tag === tag && map.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
      case "Document":
        template = documents.find(
          (doc) =>
            doc.tag === tag &&
            doc.langCode.includes(params.get("lang") || company?.defaultLangCode || "en")
        );
        if (!template && company?.defaultLangCode) {
          template = documents.find(
            (doc) => doc.tag === tag && doc.langCode.includes(company?.defaultLangCode)
          );
          isExistOnDefaultLanguage = true;
        }
        break;
    }

    if (!template) return;

    let contentExtra = undefined;
    if (type === "Image" || type === "Video" || type === "Website" || type === "Document" || type === "Scroll") {
  contentExtra = (template as any)?.ext;
  } else if (type === "Map") {
      contentExtra = JSON.stringify({
        origin: (template as GetMapTemplateRes)?.origin || '',
        destination: (template as GetMapTemplateRes)?.destination || ''
      });
    }

    emitSendTemplate({
      refId: template.id,
      langCode: isExistOnDefaultLanguage
        ? company?.defaultLangCode || "en"
        : params.get("lang") || company?.defaultLangCode || "en",
      refType: type as any,
      station: Number(params.get("station") ?? 1),
      contentExtra: contentExtra,
    });
  };

  // Only show skeleton on initial mount
  if (!isHydrated) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-6 h-6 bg-white/20 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  // If error, don't show anything
  if (error) {
    console.error('[TemplateShortcutPicker] Error loading shortcuts:', error);
    return null;
  }

  // If loading and no data, show minimal loader
  if (isLoading && templateShortcuts.length === 0) {
    return (
      <div className={`flex items-center ${isInIframe ? 'gap-1 px-2' : 'gap-2 px-3'}`}>
        <span className={`text-white/60 ${isInIframe ? 'text-xs' : 'text-sm'}`}>
          Loading...
        </span>
      </div>
    );
  }

  // If no shortcuts
  if (sortedShortcuts.length === 0) {
    return null;
  }

  return (
    <div className={`flex cursor-pointer ${isMobile ? 'justify-center align-items-center gap-4' : ''} ${isInIframe ? 'gap-1' : 'gap-2'}`}>
      {sortedShortcuts.map((res) => (
        <span
          key={res.id}
          onClick={() => handleOnSendTemplateClick(res.id, res.key as any, res.value)}
          title={`${res.value}/${res.key}`}
          className={`flex items-center justify-center ${isInIframe ? 'h-[20px] w-[20px]' : 'h-[25px] w-[25px]'
            }`}
        >
          {renderIcon(res.extraValue ?? "IoAdd", res.color)}
        </span>
      ))}
    </div>
  );
};