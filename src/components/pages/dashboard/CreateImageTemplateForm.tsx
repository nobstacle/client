import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  getTemplateControllerGetImageTemplatesQueryOptions,
  templateControllerGetImageTemplates,
  useCompanyControllerGetCompany,
  useImageTemplateControllerGetImageTags,
  useTemplateControllerGetImageTemplates,
  useUploadControllerUploadCompanyFile,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
import { GetImageTemplateRes } from "../../../lib/client/model";

interface CreateImageTemplateFormFieldValues {
  file: any;
  langCode: string;
  tagSelect?: string;
  tagCreate?: string;
}

const schema = yup.object().shape(
  {
    file: yup.mixed().required("File is required"),
    langCode: yup.string().required(),
    tagSelect: yup.string().when("tagCreate", {
      is: (val: any) => !val || val.length === 0,
      then: () => yup.string().required("Tag is required"),
      otherwise: () => yup.string(),
    }),

    tagCreate: yup.string().when("tagSelect", {
      is: (val: any) => !val || val.length === 0,
      then: () => yup
        .string()
        .required("Tag is required")
        .max(30, "Tag must be at most 30 characters"),
      otherwise: () => yup.string(),
    }),
  },
  [["tagCreate", "tagSelect"]],
);

export const CreateImageTemplateForm: React.FC<{
  cb?: (image: GetImageTemplateRes, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const imageTags = useImageTemplateControllerGetImageTags();
  const company = useCompanyControllerGetCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateImageTemplateFormFieldValues>({
    resolver: yupResolver(schema),
  });

  const uploadFile = useUploadControllerUploadCompanyFile({
    mutation: { retry: 0 },
  });

  const handleCreateImageTemplateCreate = (
    data: CreateImageTemplateFormFieldValues,
  ) => {
    const file = data.file[0];

    uploadFile.mutate(
      {
        data: {
          ...data,
          file,
          tag: (data.tagCreate as string) || (data.tagSelect as string),
          defaultLangCode: company.data?.defaultLangCode ?? "en",
        },
      },
      {
        onSuccess: async (res) => {
          if (cb) {
            const template = await templateControllerGetImageTemplates({
              id: res.sourceId,
            });

            cb(
              template[0],
              !!data.tagSelect ||
              !!imageTags.data?.find(({ tag }) => tag === template[0].tag) ||
              false,
            );
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateImageTemplateFormFieldValues> = (data) =>
    handleCreateImageTemplateCreate(data);

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
            accept="image/png, image/jpeg, image/gif"
          />
        </div>
        <div className="flex flex-col items-end">
          <div className="flex w-full flex-col gap-2 ">
            <Input
              register={register}
              name="tagCreate"
              label="Tag create or select"
              type="text"
              required
              placeholder="Type tag name here..."
            />
          </div>
          <div className="mt-4 flex">
            <select {...register("tagSelect")}>
              <option value="">Select tag...</option>
              {imageTags.data?.map((value, index) => (
                <option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-md text-gray-500">Language</label>
          <div>
            <select {...register("langCode")}>
              <option value="">Select language...</option>
              {languages.map(({ code, name }) => (
                <option value={code} key={code}>
                  {name}
                </option>
              ))}
              <option value="tr">Turkish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>

        <div className="text-center">
          {errors.file && (
            <p className="text-xs text-rose-600">File is required</p>
          )}
          {errors.tagSelect && (
            <p className="text-xs text-rose-600">Tag is required</p>
          )}
          {errors.tagCreate && (
            <p className="text-xs text-rose-600">{errors.tagCreate?.message}</p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">Language is required</p>
          )}

          {uploadFile.error?.message && (
            <p className="text-xs text-rose-600">
              {uploadFile.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={uploadFile.status === "pending"}
          disabled={uploadFile.status === "pending"}
          type="submit"
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};
