"use client";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import { SearchTemplateForm } from "../../../components/pages/dashboard/SearchTemplateForm";
import { surveyAnswerValToColor } from "../../../utils";
import { CreateSurveyTemplate } from "../../../components/pages/dashboard/CreateSurveyTemplate";
import { useSession } from "next-auth/react";
import { TrashIcon } from "../../../components/icons/TrashIcon";
import { useSurveyAnswerControllerDeleteSurveyAnswer } from "../../../lib/client/api";

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
  const {
    surveysAnswer,
    setSearchSurveysAnswers,
    setSurveyAnswers,
    searchSurveysAnswers,
  } = useTemplateStore();
  const sourceAnswers =
    searchSurveysAnswers.length > 0 ? searchSurveysAnswers : surveysAnswer;

  const { data: userData } = useSession();
  const deleteSurveyAnswer = useSurveyAnswerControllerDeleteSurveyAnswer();

  const handleDeleteSurveyAnswer = (id: number) => {
    deleteSurveyAnswer.mutate(
      { id },
      {
        onSuccess: () => {
          // delete from local states
          setSearchSurveysAnswers(
            searchSurveysAnswers.filter((val) => val.id !== id),
          );
          setSurveyAnswers(surveysAnswer.filter((val) => val.id !== id));
        },
      },
    );
  };

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

          {userData?.user.Roles?.includes("Admin") && (
            <button
              className="h-8 w-8  text-danger"
              onClick={() => handleDeleteSurveyAnswer(id)}
              disabled={deleteSurveyAnswer.status === "pending"}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default Page;
