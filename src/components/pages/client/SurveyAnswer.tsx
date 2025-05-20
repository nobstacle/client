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
  @media (max-width: 640px) {
    .emoticonWrapper .icon-container {
      width: 60px !important;
      height: 60px !important;
    }
  }
  
  @media (min-width: 641px) and (max-width: 768px) {
    .emoticonWrapper .icon-container {
      width: 80px !important;
      height: 80px !important;
    }
  }
  
  @media (min-width: 769px) and (max-width: 1024px) {
    .emoticonWrapper .icon-container {
      width: 100px !important;
      height: 100px !important;
    }
  }
  
  @media (min-width: 1025px) and (max-width: 1300px){
    .emoticonWrapper .icon-container {
      width: 130px !important;
      height: 130px !important;
    }
  }
     @media (min-width: 1301px) {
    .emoticonWrapper .icon-container {
      width: 220px !important;
      height: 220px !important;
    }
  }
`;

const SurveyAnswer: React.FC<{ tag: string }> = ({ tag }) => {
  const [emptyDefaultSlideshow, setEmptySlideshow] = React.useState(false);
  const [selectedVal, setSelectedVal] = React.useState<number>();
  const { emitSendSurveyAnswer } = useSocketContext();
  const params = useSearchParams();
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

  const { emitSendTemplate } = useSocketContext();

  React.useEffect(() => {
    setEmptySlideshow(false);
  }, [tag]);

  const { company } = useCompanyStore();

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

  return (
    <>
      <style jsx>{responsiveStyles}</style>
      <div className="flex flex-col gap-4 md:gap-6 lg:gap-8 emoticonWrapper">
        <div className="flex flex-wrap justify-center gap-3 md:gap-4 lg:gap-5">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              key={val.toString()}
              className="p-2 sm:p-3 md:p-4 transition-all duration-200"
              style={{
                border: selectedVal === val ? "4px solid rgb(59, 89, 152)" : "none",
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