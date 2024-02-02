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

  if (emptyDefaultSlideshow) return <div>Thank you for feedback!</div>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-4">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val.toString()}
            className="p-4"
            style={{
              border: selectedVal === val ? "4px solid rgb(59, 89, 152)" : 0,
            }}
            onClick={(e) => {
              if (e.currentTarget.value) {
                sendSurveyAnswer(parseInt(e.currentTarget.value, 10));
              }
            }}
            value={val}
          >
            {val === 1 && (
              <div>
                <AngryIcon />
              </div>
            )}

            {val === 2 && (
              <div>
                <MehIcon />
              </div>
            )}

            {val === 3 && (
              <div>
                <NotBadIcon />
              </div>
            )}

            {val === 4 && (
              <div>
                <GoodIcon />
              </div>
            )}

            {val === 5 && (
              <div>
                <VeryNiceIcon />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SurveyAnswer;
