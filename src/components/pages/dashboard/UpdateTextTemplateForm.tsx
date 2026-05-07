import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  getContentControllerFindOneQueryKey,
  getTemplateControllerGetTextTemplatesQueryKey,
  getTextTemplateControllerGetTextTagsQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerFindOne,
  useTextTemplateControllerCreateTextTemplate,
  useTextTemplateControllerGetTextTags,
  useTextTemplateControllerPatchTextTemplateOne,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
import { GetTextTemplateRes } from "../../../lib/client/model";

interface CreateTextTemplateFormFieldValues {
  content: string;
}

const schema = yup
  .object({
    content: yup.string().required("Content is required"),
  })
  .required();

export const UpdateTextTemplateForm: React.FC<{
  cb?: (template: GetTextTemplateRes) => void;
  sourceId: number;
  defaultLangCode: string;
  tag: string;
}> = ({ cb, sourceId, defaultLangCode, tag }) => {
  const queryClient = useQueryClient();
  const content = useContentControllerFindOne(
    {
      refType: "Text",
      sourceId,
      langCode: defaultLangCode,
    },
    {
      query: {
        staleTime: 0,
        gcTime: 0,
        queryKey: getContentControllerFindOneQueryKey({
          refType: "Text",
          sourceId,
          langCode: defaultLangCode,
        }),
      },
    },
  );

  const company = useCompanyControllerGetCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateTextTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      content: "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (content.isSuccess) {
      setValue("content", content.data.content ?? "");
    }
  }, [content.isSuccess]);

  const updateTextTemplate = useTextTemplateControllerPatchTextTemplateOne();
  const handleUpdateTextTemplate = (
    data: CreateTextTemplateFormFieldValues,
  ) => {
    updateTextTemplate.mutate(
      {
        tag,
        data: {
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          content: data.content,
          langCode: defaultLangCode,
        },
      },
      {
        onSuccess: (template) => {
          if (cb) {
            cb(template);
          }
          void queryClient.invalidateQueries({
            queryKey: getTemplateControllerGetTextTemplatesQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getTextTemplateControllerGetTextTagsQueryKey(),
          });
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateTextTemplateFormFieldValues> = (data) =>
    handleUpdateTextTemplate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            register={register}
            name="content"
            label="Content"
            type="text"
            required
            placeholder="Type content here..."
          />
        </div>
        <div className="text-center">
          {errors.content && (
            <p className="text-xs text-rose-600">{errors.content.message}</p>
          )}

          {updateTextTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {updateTextTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={updateTextTemplate.status === "pending"}
          disabled={updateTextTemplate.status === "pending"}
          type="submit"
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
