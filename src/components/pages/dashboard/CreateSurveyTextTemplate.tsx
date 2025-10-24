import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  // Add your survey template API hooks here
  // useSurveyTemplateControllerCreate,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Select, Input, Alert, Typography } from "antd";
import { languages } from "../../../constant/languages";

const { Text } = Typography;
const { TextArea } = Input;

interface CreateSurveyTextTemplateFormFieldValues {
  title: string;
  text: string;
  langCode: string;
}

const schema = yup.object().shape({
  title: yup
    .string()
    .required("Title is required")
    .max(100, "Title must be at most 100 characters"),
  text: yup
    .string()
    .required("Text is required")
    .max(1000, "Text must be at most 1000 characters"),
  langCode: yup.string().required("Language is required"),
});

export const CreateSurveyTextTemplateForm: React.FC<{
  cb?: (template: any, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const company = useCompanyControllerGetCompany();

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateSurveyTextTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      title: "",
      text: "",
      langCode: company.data?.defaultLangCode ?? "en",
    },
  });

  // Replace this with your actual API hook
  const [isLoading, setIsLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const handleCreateSurveyTemplate = async (
    data: CreateSurveyTextTemplateFormFieldValues,
  ) => {
    setIsLoading(true);
    setApiError(null);

    try {
      // Replace with your actual API call
      // const result = await createSurveyTemplate(data);
      
      // Simulated API call - remove this and use actual API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      console.log("Survey template data:", data);
      
      if (cb) {
        // Pass the created template and false for isUpdate
        cb(data, false);
      }
      
      reset();
      setIsLoading(false);
    } catch (error: any) {
      setApiError(error?.response?.data?.message || "Failed to create template");
      setIsLoading(false);
    }
  };

  const onSubmit: SubmitHandler<CreateSurveyTextTemplateFormFieldValues> = (
    data,
  ) => handleCreateSurveyTemplate(data);

  const languageOptions = [
    ...languages.map(({ code, name }) => ({
      value: code,
      label: name,
    })),
    { value: "tr", label: "Turkish" },
    { value: "fr", label: "French" },
  ];

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="create-template-form"
    >
      <hr />
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Text>Title</Text>
          <Controller
            name="title"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Enter template title..."
                size="middle"
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Text>Text</Text>
          <Controller
            name="text"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Enter survey text content..."
                rows={6}
                showCount
                maxLength={1000}
              />
            )}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Text>Language</Text>
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select language..."
                style={{ width: "100%" }}
                options={languageOptions}
              />
            )}
          />
        </div>

        <div className="text-center">
          {errors.title && (
            <Alert
              message={errors.title?.message}
              type="error"
              showIcon
              className="mb-2"
            />
          )}
          {errors.text && (
            <Alert
              message={errors.text?.message}
              type="error"
              showIcon
              className="mb-2"
            />
          )}
          {errors.langCode && (
            <Alert
              message="Language is required"
              type="error"
              showIcon
              className="mb-2"
            />
          )}
          {apiError && (
            <Alert message={apiError} type="error" showIcon className="mb-2" />
          )}
        </div>

        <Button
          type="primary"
          loading={isLoading}
          disabled={isLoading}
          htmlType="submit"
          style={{ width: "100%" }}
          className="create-template-button"
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};