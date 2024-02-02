"use client";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import { surveyAnswerValToColor } from "../../../utils";
import { CreateSurveyTemplate } from "../../../components/pages/dashboard/CreateSurveyTemplate";

function Page() {
  const isHydrated = useHasHydrated();

  if (!isHydrated) return <div></div>;

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex w-full flex-col gap-4">
        <CreateSurveyTemplate />
      </div>

      <SurveyAnswers />
    </div>
  );
}

function SurveyAnswers() {
  const { surveysAnswer, searchSurveysAnswers } = useTemplateStore();
  const sourceAnswers =
    searchSurveysAnswers.length > 0 ? searchSurveysAnswers : surveysAnswer;

  return (
    <div className="mt-4 flex w-full flex-col items-start justify-start gap-5">
      {sourceAnswers.map(({ tag, value, id, createdAt, stationNo }) => (
        <div key={id} className="flex items-center gap-5">
          <span
            style={{
              backgroundColor: surveyAnswerValToColor(value ?? 0),
            }}
            className="flex h-[50px] w-[50px] items-center justify-center rounded-full text-center  text-white"
          >
            {(value ?? 0).toString().charAt(0).toUpperCase()}{" "}
          </span>
          <div className="flex flex-col items-start justify-start ">
            <div>
              <p className="text-xl">{tag}</p>
            </div>
            <div>
              <p className="inline-block text-sm">
                Station: {stationNo}, Date:{" "}
                {new Date(createdAt).toLocaleString("tr-Tr")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Page;
