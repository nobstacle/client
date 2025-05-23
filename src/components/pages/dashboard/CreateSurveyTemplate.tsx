import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
// import Input from "../../Input";
import { Button } from "../../Button";
import { SendIcon } from "../../icons/SendIcon";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useSearchTemplate } from "../../../hooks/useSearchTemplate";
import useTemplateStore from "../../../lib/zustand/store/templateStore";
import { surveyAnswerValToColor } from "../../../utils";
import { Card } from 'antd';
import { Input as AntdInput } from "antd";

interface SendMapTemplateFormFieldValues {
  identifier: string;
}

const schema = yup.object().shape({
  identifier: yup.string().required("Identifier is required"),
});

export const CreateSurveyTemplate: React.FC = () => {
  const { surveysAnswer, setSearchSurveysAnswers, searchSurveysAnswers } =
    useTemplateStore();
  const { search } = useSearchTemplate(surveysAnswer, setSearchSurveysAnswers);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
    watch
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
    setSearchSurveysAnswers([]);
    search("");
  };

  const onSubmit: SubmitHandler<SendMapTemplateFormFieldValues> = (data) =>
    handleSendSurvey(data);

  return (
    <Card bordered className="w-full mb-6 pb-0 customSUrveyHeaderCard">
      <form
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* Input Section */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 w-full md:w-1/2">

          <Controller
            name="identifier"
            control={control}
            render={({ field }) => (
              <AntdInput
                {...field}
                value={field.value}
                placeholder="Type survey identifier here"
                status={errors.identifier ? "error" : ""}
                onChange={(e) => {
                  field.onChange(e);
                  search(e.currentTarget.value);
                }}
                style={{ width: '50%' }}
              />
            )}
          />
          <Button
            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 rounded-md px-4 py-2 text-white headerButton"
            type="submit"
          >
            <SendIcon />
          </Button>
          {errors.identifier && (
            <p className="text-sm text-red-600">{errors.identifier.message}</p>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 justify-start md:justify-end flex-wrap">
          {[1, 2, 3, 4, 5].map((val) => (
            <button
              type="button"
              onClick={() => {
                if (
                  searchSurveysAnswers.find(
                    (searchSurvey) => searchSurvey.value === val,
                  )
                ) {
                  setSearchSurveysAnswers([]);
                } else {
                  const filteredVal = surveysAnswer.filter(
                    (temp) => temp.value === val,
                  );
                  setSearchSurveysAnswers(filteredVal);
                }
              }}
              key={val}
              className="flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium"
              style={{
                backgroundColor: surveyAnswerValToColor(val),
              }}
            >
              <b>{val.toString().charAt(0).toUpperCase()}</b>
            </button>
          ))}
        </div>
      </form>
    </Card>
  );
};
