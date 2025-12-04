"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useHasHydrated } from "../../../../hooks/useHydrated";
// import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";
import * as Io5Icons from "react-icons/io5";
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

import { useShortcutControllerGetShortcutMany } from "../../../../lib/client/api";

export const TemplateShortcutPicker: React.FC<{ checkIframe?: boolean }> = ({
  checkIframe = true
}) => {
  const { emitSendTemplate } = useSocketContext();
  const { company } = useCompanyStore();
  const { texts, images, videos, slideshows, maps, websites, documents } =
    useTemplateStore();
  const isHydrated = useHasHydrated();
  const [isInIframe, setIsInIframe] = useState(false);

  const params = useSearchParams();

  useEffect(() => {
    if (checkIframe) {
      setIsInIframe(window.self !== window.top);
    }
  }, [checkIframe]);

  // REPLACED: useShortcutStore() → direct API call
  const { data: templatesShortcuts = [], isLoading: shortcutsLoading } =
    useShortcutControllerGetShortcutMany(
      { type: "Template" },
      {
        query: {
          queryKey: ["shortcuts", "template"],
          staleTime: 1000 * 60 * 5,
          refetchOnWindowFocus: false,
        },
      }
    );

  const renderIcon = (iconName: string, color?: string) => {
    const IconComponent = (Io5Icons as any)[iconName];
    const iconSize = isInIframe ? 18 : 25; // Smaller in iframe
    return IconComponent ? <IconComponent size={iconSize} color={color || "white"} /> : null;
  };

  const handleOnSendTemplateClick = (
    id: number,
    type: ChatType,
    tag: string,
  ) => {
    let template:
      | GetTextTemplateRes
      | GetImageTemplateRes
      | GetVideoTemplateRes
      | GetSlideshowTemplateRes
      | GetMapTemplateRes
      | GetWebsiteTemplateRes
      | GetDocumentTemplateRes
      | undefined;

    const templateShortcut = templatesShortcuts.find(
      (templateShortcut) => templateShortcut.id === id,
    );

    if (!templateShortcut) return;

    let isExistOnDefaultLanguage = false;

    switch (type) {
      case "Text":
        template = texts.find(
          (text) =>
            text.tag === tag &&
            text.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = texts.find(
            (text) =>
              text.tag === tag &&
              text.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      case "Image":
        template = images.find(
          (image) =>
            image.tag === tag &&
            image.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = images.find(
            (image) =>
              image.tag === tag &&
              image.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      case "Video":
        template = videos.find(
          (video) =>
            video.tag === tag &&
            video.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = videos.find(
            (video) =>
              video.tag === tag &&
              video.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      case "Slideshow":
        template = slideshows.find(
          (slideshow) =>
            slideshow.tag === tag &&
            slideshow.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = slideshows.find(
            (slideshow) =>
              slideshow.tag === tag &&
              slideshow.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      case "Map":
        template = maps.find(
          (map) =>
            map.tag === tag &&
            map.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = maps.find(
            (map) =>
              map.tag === tag &&
              map.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      case "Website":
        template = websites.find(
          (website) =>
            website.tag === tag &&
            website.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = websites.find(
            (website) =>
              website.tag === tag &&
              website.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      case "Document":
        template = documents.find(
          (document) =>
            document.tag === tag &&
            document.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        if (!template && company?.defaultLangCode) {
          template = documents.find(
            (document) =>
              document.tag === tag &&
              document.langCode.includes(company?.defaultLangCode),
          );
          isExistOnDefaultLanguage = true;
        }
        break;

      default:
        template = undefined;
    }

    if (!template) return;

    emitSendTemplate({
      refId: template.id,
      langCode: isExistOnDefaultLanguage
        ? company?.defaultLangCode || "en"
        : params.get("lang") || company?.defaultLangCode || "en",
      refType: type as any,
      station: Number(params.get("station") ?? 1),
      contentExtra:
        (template as GetImageTemplateRes | GetVideoTemplateRes)?.ext ??
        undefined,
    });
  };

  if (!isHydrated || shortcutsLoading) {
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
      {templatesShortcuts
        .sort((a, b) => a.order! - b.order!)
        .map((res) => (
          <span
            key={res.id}
            onClick={() =>
              handleOnSendTemplateClick(res.id, res.key as any, res.value)
            }
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