import * as React from "react";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import {
  getShortcutControllerGetShortcutOneQueryKey,
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  useShortcutControllerGetShortcutOne,
  useTemplateControllerGetSlideshowTemplates,
} from "../../../lib/client/api";
import useCompanyStore from "../../../lib/zustand/store/companyStore";
import { ChatType } from "../../../constant/types";
import { AngryIcon } from "../../icons/survey/AngryIcon";
import { MehIcon } from "../../icons/survey/MehIcon";
import { NotBadIcon } from "../../icons/survey/NotBadIcon";
import { VeryNiceIcon } from "../../icons/survey/VeryNiceIcon";
import { GoodIcon } from "../../icons/survey/GoodIcon";

// Add CSS to your global stylesheet or component styles
const responsiveStyles = `
  @media (max-width: 650px) {
    .emoticonWrapper .icon-container {
      width: 50px !important;
      height: 50px !important;
    }
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    .emoticonWrapper .icon-container {
      width: 70px !important;
      height: 70px !important;
    }
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    .emoticonWrapper .icon-container {
      width: 90px !important;
      height: 90px !important;
    }
  }
  
  @media (min-width: 1025px) and (max-width: 1300px){
    .emoticonWrapper .icon-container {
      width: 120px !important;
      height: 120px !important;
    }
  }
     @media (min-width: 1301px) {
    .emoticonWrapper .icon-container {
      width: 180px !important;
      height: 180px !important;
    }
  }
`;

<style jsx>{`
  ${responsiveStyles}

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`}</style>


const SurveyAnswer: React.FC<{ tag: string; survey?: any }> = ({ tag, survey }) => {
  const [emptyDefaultSlideshow, setEmptySlideshow] = React.useState(false);
  const [selectedVal, setSelectedVal] = React.useState<number>();
  const { emitSendSurveyAnswer, emitSendTemplate } = useSocketContext();
  const params = useSearchParams();
  const { company } = useCompanyStore();

  const defaultSlideshowShortcut = useShortcutControllerGetShortcutOne(
    { type: "DefaultSlideshow" },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryKey: getShortcutControllerGetShortcutOneQueryKey({
          type: "DefaultSlideshow",
        }),
      },
    },
  );

  const slideshowTemplates = useTemplateControllerGetSlideshowTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetSlideshowTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  React.useEffect(() => {
    setEmptySlideshow(false);
  }, [tag]);

  const sendSurveyAnswer = (value: number) => {
    setSelectedVal(value);
    emitSendSurveyAnswer({
      tag,
      station: Number(params.get("station") ?? 1),
      value,
    });

    if (defaultSlideshowShortcut.data && slideshowTemplates.data) {
      const slideshow = slideshowTemplates.data.find(
        ({ tag }) => tag === defaultSlideshowShortcut.data.value,
      );

      if (!slideshow) {
        setEmptySlideshow(true);
      } else {
        emitSendTemplate({
          refId: slideshow.id ?? NaN,
          langCode: params.get("lang") || company?.defaultLangCode || "en",
          refType: ChatType.Slideshow,
          station: Number(params.get("station") ?? 1),
          self: true,
        });
      }
    } else {
      setEmptySlideshow(true);
    }
  };

  if (emptyDefaultSlideshow) {
    return (
      <div className="text-center text-lg md:text-xl lg:text-2xl font-medium">
        Thank you for your feedback!
      </div>
    );
  }

  // Extract template content safely
  const templateContent =
    survey?.surveyHeader?.template?.content
      ?.replace(/\n/g, " ")
      ?.trim() || "";

  return (
    <>
      <style jsx>{responsiveStyles}</style>
      <div className="flex flex-col items-center gap-10 md:gap-6 emoticonWrapper">
        {/* ✅ Conditionally show template text */}
        {templateContent && (
          <div
            className="text-center px-4 sm:px-6 md:px-8 max-w-5xl leading-snug mb-6"
            style={{
              fontSize: "clamp(1.25rem, 2vw + 0.5rem, 2.25rem)",
              fontWeight: 600,
              lineHeight: 1.4,
              color: "#3b5998",
            }}
          >
            {templateContent}
          </div>
        )}

        {/* Emoticon buttons */}
        <div className="flex flex-wrap justify-center gap-4  sm:gap-6  md:gap-6 lg:gap-5">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val}
              className="p-2 sm:p-3 md:p-4 transition-all duration-200 customSurveyButton"
              style={{
                border: "none",
                borderRadius: "12px",
                transform: selectedVal === val ? "scale(1.05)" : "scale(1)",
              }}
              onClick={() => sendSurveyAnswer(val)}
              value={val}
            >
              <div className="icon-container">
                {val === 1 && <AngryIcon className="icon w-full h-full" />}
                {val === 2 && <MehIcon className="icon w-full h-full" />}
                {val === 3 && <NotBadIcon className="icon w-full h-full" />}
                {val === 4 && <GoodIcon className="icon w-full h-full" />}
                {val === 5 && <VeryNiceIcon className="icon w-full h-full" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default SurveyAnswer;