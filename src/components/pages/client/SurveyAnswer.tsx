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
import { useViewportScale } from "../../../hooks/useViewportScale";
import { getContainMediaStyle } from "../../../utils/contentFit";
import SafeContentFrame from "./SafeContentFrame";

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

// Map emoticon types to their corresponding values
const EMOTICON_MAP = {
  1: 'VERY_SAD',
  2: 'SAD',
  3: 'NEUTRAL',
  4: 'HAPPY',
  5: 'VERY_HAPPY'
};

const SurveyAnswer: React.FC<{ tag: string; survey?: any; handleComplete: any }> = ({ tag, survey, handleComplete }) => {
  const [emptyDefaultSlideshow, setEmptySlideshow] = React.useState(false);
  const [selectedVal, setSelectedVal] = React.useState<number>();
  const [showEmoticonContent, setShowEmoticonContent] = React.useState(false);
  const [selectedEmoticonData, setSelectedEmoticonData] = React.useState<any>(null);
  const { emitSendSurveyAnswer, emitSendTemplate } = useSocketContext();
  const params = useSearchParams();
  const { company } = useCompanyStore();
  const { scale } = useViewportScale();

  const adaptiveTextSizeRem = Math.min(4.2, Math.max(1.75, 3.2 * scale));
  const adaptiveLineHeightRem = Math.min(5.2, Math.max(2.4, 4.1 * scale));

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
    setShowEmoticonContent(false);
    setSelectedEmoticonData(null);
  }, [tag]);

  const sendSurveyAnswer = (value: number) => {
    setSelectedVal(value);

    // Check if there's an emoticon template for this value
    const emoticonKey = EMOTICON_MAP[value];
    const emoticonTemplate = survey?.emoticonTemplates?.[emoticonKey];
    let sentByUser = JSON.parse(survey?.sentBy);

    if (emoticonTemplate && emoticonTemplate.templateData) {
      // Show the emoticon template content
      setSelectedEmoticonData(emoticonTemplate);
      setShowEmoticonContent(true);

      // Send survey answer
      emitSendSurveyAnswer({
        tag,
        station: Number(params.get("station") ?? 1),
        value,
        userId: sentByUser?.user?.id || sentByUser?.id
      });

      return;
    }

    // If no emoticon template, proceed with default slideshow logic
    emitSendSurveyAnswer({
      tag,
      station: Number(params.get("station") ?? 1),
      value,
        userId: sentByUser?.user?.id || sentByUser?.id
    });

    if (defaultSlideshowShortcut.data && slideshowTemplates.data) {
      const slideshow = slideshowTemplates.data.find(
        ({ tag }) => tag === defaultSlideshowShortcut.data.value,
      );

      if (!slideshow) {
        setEmptySlideshow(true);
        handleComplete();
      } else {
        emitSendTemplate({
          refId: slideshow.id ?? NaN,
          langCode: params.get("lang") || company?.defaultLangCode || "en",
          refType: ChatType.Slideshow,
          station: Number(params.get("station") ?? 1),
          self: true,
        });
        handleComplete();
      }
    } else {
      setEmptySlideshow(true);
      handleComplete();
    }
  };

  // Render emoticon template content
  if (showEmoticonContent && selectedEmoticonData) {
    const { templateType, templateData } = selectedEmoticonData;

    return (
      <SafeContentFrame className="flex items-center justify-center bg-black">
        {templateType === 'Text' && (
          <div className="w-full bg-white p-5">
            <p
              className="mx-auto text-center"
              style={{
                fontSize: `${adaptiveTextSizeRem}rem`,
                lineHeight: `${adaptiveLineHeightRem}rem`,
                whiteSpace: "pre-wrap",
                maxWidth: "92vw",
              }}
            >
              {templateData.content}
            </p>
          </div>
        )}

        {templateType === 'Image' && (
          <img
            alt="emoticon_template_image"
            style={getContainMediaStyle()}
            src={templateData.url}
          />
        )}

        {templateType === 'Video' && (
          <div
            style={{
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              pointerEvents: 'none',
              backgroundColor: 'black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <video
              autoPlay
              loop
              playsInline
              style={getContainMediaStyle()}
            >
              <source src={templateData.url} type="video/mp4" />
            </video>
          </div>
        )}

        {templateType === 'Website' && (
          <iframe
            className="h-full w-full"
            src={templateData.url}
          />
        )}

        {templateType === 'Document' && (
          <div className="w-full h-full overflow-hidden">
            <iframe
              src={templateData.url}
              className="w-full h-full"
              title="Document"
              frameBorder="0"
            />
          </div>
        )}
      </SafeContentFrame>
    );
  }

  if (emptyDefaultSlideshow) {
    return (
      <SafeContentFrame className="flex items-center justify-center bg-white text-center text-lg md:text-xl lg:text-2xl font-medium">
        Thank you for your feedback!
      </SafeContentFrame>
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
      <SafeContentFrame className="flex flex-col items-center justify-center gap-10 bg-white md:gap-6 emoticonWrapper">
        {/* ✅ Conditionally show template text */}
        {templateContent && (
          <div
            className="text-center px-4 sm:px-6 md:px-8 max-w-5xl leading-snug mb-6"
            style={{
              fontSize: `clamp(1.25rem, ${Math.max(1.75, scale * 1.95)}vw, 2.5rem)`,
              fontWeight: 600,
              lineHeight: 1.4,
              color: "#3b5998",
            }}
          >
            {templateContent}
          </div>
        )}

        {/* Emoticon buttons */}
        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-6 lg:gap-5">
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
      </SafeContentFrame>
    </>
  );
};

export default SurveyAnswer;
