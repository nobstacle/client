"use client";

import { useSearchParams } from "next/navigation";
import { useHasHydrated } from "../../../../hooks/useHydrated";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { useSocketContext } from "../../../../context/SocketContextProvider";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";
import {
  ChatType,
  GetImageTemplateRes,
  GetMapTemplateRes,
  GetSlideshowTemplateRes,
  GetTextTemplateRes,
  GetVideoTemplateRes,
  GetWebsiteTemplateRes,
} from "../../../../lib/client/model";

export const TemplateShortcutPicker: React.FC = () => {
  const { emitSendTemplate } = useSocketContext();
  const { company } = useCompanyStore();
  const { texts, images, videos, slideshows, maps, websites, documents } =
    useTemplateStore();
  const isHydrated = useHasHydrated();

  const params = useSearchParams();
  const { templatesShortcuts } = useShortcutStore();

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
      | undefined;
    const templateShortcut = templatesShortcuts.filter(
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

        // if not exist on the selected language try to find default language to send
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

        // if not exist on the selected language try to find default language to send
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

        // if not exist on the selected language try to find default language to send
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

        // if not exist on the selected language try to find default language to send
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

        // if not exist on the selected language try to find default language to send
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

        // if not exist on the selected language try to find default language to send
        if (!template && company?.defaultLangCode) {
          template = maps.find(
            (website) =>
              website.tag === tag &&
              website.langCode.includes(company?.defaultLangCode),
          );

          isExistOnDefaultLanguage = true;
        }

        break;

        
      case "Documents":
        template = documents.find(
          (website) =>
            website.tag === tag &&
            website.langCode.includes(
              params.get("lang") || company?.defaultLangCode || "en",
            ),
        );

        // if not exist on the selected language try to find default language to send
        if (!template && company?.defaultLangCode) {
          template = maps.find(
            (website) =>
              website.tag === tag &&
              website.langCode.includes(company?.defaultLangCode),
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

  if (!isHydrated) return;

  return (
    <div className="flex cursor-pointer gap-2">
      {templatesShortcuts
        .sort((a, b) => a.order! - b.order!)
        .map((res) => (
          <span
            key={res.id}
            onClick={() =>
              handleOnSendTemplateClick(res.id, res.key as any, res.value)
            }
            title={`${res.value}/${res.key}`}
            className="block h-[25px] w-[25px] rounded-full"
            style={{ backgroundColor: res.extraValue ?? "#fff" }}
          />
        ))}
    </div>
  );
};
