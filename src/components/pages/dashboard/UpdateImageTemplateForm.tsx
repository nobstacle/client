import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  getImageTemplateControllerGetImageTagsQueryKey,
  getTemplateControllerGetImageTemplatesQueryKey,
  templateControllerGetImageTemplates,
  useCompanyControllerGetCompany,
  useUploadControllerUploadCompanyFile,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { GetImageTemplateRes } from "../../../lib/client/model";

interface CreateImageTemplateFormFieldValues {
  file: any;
}

const schema = yup
  .object({
    file: yup.mixed().required("File is required"),
  })
  .required();

export const UpdateImageTemplateForm: React.FC<{
  cb?: (template: GetImageTemplateRes) => void;
  sourceId: number;
  defaultLangCode: string;
  tag: string;
}> = ({ cb, defaultLangCode, tag }) => {
  const company = useCompanyControllerGetCompany();
  const queryClient = useQueryClient();

  const uploadFile = useUploadControllerUploadCompanyFile({
    mutation: { retry: 0 },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateImageTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const handleUpdateImageTemplate = (
    data: CreateImageTemplateFormFieldValues,
  ) => {
    const file = data.file[0];
    uploadFile.mutate(
      {
        data: {
          langCode: defaultLangCode,
          file,
          tag,
          defaultLangCode: company.data?.defaultLangCode ?? "en",
        },
      },
      {
        onSuccess: async (res) => {
          if (cb) {
            const template = await templateControllerGetImageTemplates({
              id: res.sourceId,
            });

            cb(template[0]);
          }

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: getTemplateControllerGetImageTemplatesQueryKey(),
            }),
            queryClient.invalidateQueries({
              queryKey: getImageTemplateControllerGetImageTagsQueryKey(),
            }),
          ]);
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateImageTemplateFormFieldValues> = (data) =>
    handleUpdateImageTemplate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            register={register}
            name="file"
            label="Image to upload"
            type="file"
            required
            accept="image/png, image/jpeg"
          />
        </div>

        <div className="text-center">
          {errors.file?.message && (
            <p className="text-xs text-rose-600">
              {errors.file.message.toString()}
            </p>
          )}
        </div>
        <Button
          isLoading={uploadFile.status === "pending"}
          disabled={uploadFile.status === "pending"}
          type="submit"
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
