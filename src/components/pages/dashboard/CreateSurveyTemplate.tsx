import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { surveyAnswerValToColor } from "../../../utils";

interface SendMapTemplateFormFieldValues {
  identifier: string;
}

const schema = yup.object().shape({
  identifier: yup.string().required("Identifier is required"),
});

export const CreateSurveyTemplate: React.FC = () => {
  const { surveysAnswer, setSearchSurveysAnswers } = useTemplateStore();
  const { search } = useSearchTemplate(surveysAnswer, setSearchSurveysAnswers);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SendMapTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      identifier: "",
    },
  });
  const params = useSearchParams();

  const { emitSendSurvey } = useSocketContext();

  const handleSendSurvey = (data: SendMapTemplateFormFieldValues) => {
    emitSendSurvey({
      tag: data.identifier,
      station: params.get("station") ? Number(params.get("station")) : 1,
    });
    reset();
  };

  const onSubmit: SubmitHandler<SendMapTemplateFormFieldValues> = (data) =>
    handleSendSurvey(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex w-3/12 items-center gap-4 ">
        <Input
          register={register}
          name="identifier"
          label=""
          type="text"
          required
          placeholder="Type survey identifier here"
          className="rounded-md border-2  p-2"
          onChange={(e) => {
            search(e.currentTarget.value);
          }}
        />

        {errors.identifier && (
          <p className="text-xs text-rose-600">{errors.identifier.message} </p>
        )}
        <div>
          <Button
            className="border-1 flex justify-center rounded-md border-black  p-2 px-6 text-center text-white"
            type="submit"
          >
            <SendIcon />
          </Button>
        </div>

        {[1, 2, 3, 4, 5].map((val) => (
          <button
            type="button"
            onClick={() => {
              const filteredVal = surveysAnswer.filter(
                (temp) => temp.value === val,
              );
              console.log("filteredVal", filteredVal);

              setSearchSurveysAnswers(filteredVal);
            }}
            key={val}
            className="flex items-center gap-5"
          >
            <span
              style={{
                backgroundColor: surveyAnswerValToColor(val),
              }}
              className="flex h-[25px] w-[25px]  items-center justify-center rounded-full text-center  text-white"
            >
              {val.toString().charAt(0).toUpperCase()}{" "}
            </span>
          </button>
        ))}
      </div>
    </form>
  );
};
