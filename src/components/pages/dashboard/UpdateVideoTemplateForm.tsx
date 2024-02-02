import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  templateControllerGetVideoTemplates,
  useCompanyControllerGetCompany,
  useUploadControllerUploadCompanyFile,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { GetVideoTemplateRes } from "../../../lib/client/model";

interface CreateVideoTemplateFormFieldValues {
  file: any;
}

const schema = yup
  .object({
    file: yup.mixed().required("File is required"),
  })
  .required();

export const UpdateVideoTemplateForm: React.FC<{
  cb?: (template: GetVideoTemplateRes) => void;
  sourceId: number;
  defaultLangCode: string;
  tag: string;
}> = ({ cb, defaultLangCode, tag }) => {
  const company = useCompanyControllerGetCompany();

  const uploadFile = useUploadControllerUploadCompanyFile({
    mutation: { retry: 0 },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateVideoTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    mode: "onChange",
  });

  const handleUpdateVideoTemplate = (
    data: CreateVideoTemplateFormFieldValues,
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
            const template = await templateControllerGetVideoTemplates({
              id: res.sourceId,
            });

            cb(template[0]);
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateVideoTemplateFormFieldValues> = (data) =>
    handleUpdateVideoTemplate(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            register={register}
            name="file"
            label="Video to upload"
            type="file"
            required
            accept="video/mp4, video/ogg, video/webm"
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
