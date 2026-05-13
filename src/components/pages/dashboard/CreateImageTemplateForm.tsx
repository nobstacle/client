import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import {
  getImageTemplateControllerGetImageTagsQueryKey,
  getTemplateControllerGetImageTemplatesQueryKey,
  templateControllerGetImageTemplates,
  useCompanyControllerGetCompany,
  useImageTemplateControllerGetImageTags,
  useUploadControllerUploadCompanyFile,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Upload, Select, Form, Input, Alert, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { languages } from "../../../constant/languages";
import { GetImageTemplateRes } from "../../../lib/client/model";
import { RecommendedDimensions } from "./RecommendedDimensions";

const { Text } = Typography;

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
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
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

            // Backend now returns isUpdate flag
            // Use it directly instead of trying to determine it here
            cb(template[0], res.isUpdate || false);
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
    handleCreateImageTemplateCreate(data);

  const uploadProps = {
    accept: "image/png, image/jpeg, image/gif",
    beforeUpload: (file: File) => {
      setValue("file", [file]);
      return false; // Prevent automatic upload
    },
    showUploadList: true,
    maxCount: 1,
  };

  // Remove duplicates from tags - use Set to ensure unique values
  const uniqueTags = [...new Set(imageTags.data?.map(item => item.tag) || [])];

  const tagOptions = uniqueTags.map((tag) => ({
    value: tag,
    label: tag,
  }));

  const languageOptions = languages.map(({ code, name }, index) => ({
    value: code,
    label: name,
    key: `lang-${code}-${index}`,
  }));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="create-template-form">
      <hr />
      <div className="mt-3 flex flex-col gap-4">
        <RecommendedDimensions />
        <div className="flex flex-col gap-2">
          <Text>Image to upload</Text>
          <Controller
            name="file"
            control={control}
            render={({ field }) => (
              <Upload {...uploadProps}>
                <Button style={{ color: '#000' }} icon={<UploadOutlined />}>Upload Image</Button>
              </Upload>
            )}
          />
        </div>

        <div className="flex flex-col items-start">
          <div className="flex w-full flex-col gap-2">
            <Text>Create a tag</Text>
            <Controller
              name="tagCreate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Type tag name here..."
                  size="middle"
                />
              )}
            />
          </div>
          <div className="mt-4" style={{ width: "100%" }}>
            <Text>Or select an existing tag</Text>
            <Controller
              name="tagSelect"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select tag..."
                  style={{ width: '100%' }}
                  options={tagOptions}
                  allowClear
                  popupClassName="modal-select-dropdown"
                  getPopupContainer={(trigger) => trigger.parentElement!}
                />
              )}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <Text>Language</Text>
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Search or select language..."
                style={{ width: "100%" }}
                options={languageOptions}
                showSearch
                popupClassName="modal-select-dropdown"
                getPopupContainer={(trigger) => trigger.parentElement!}
                filterOption={(input, option) =>
                  (option?.label as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            )}
          />
        </div>

        <div className="text-center">
          {errors.file && (
            <Alert message="File is required" type="error" showIcon className="mb-2" />
          )}
          {errors.tagSelect && (
            <Alert message="Tag is required" type="error" showIcon className="mb-2" />
          )}
          {errors.tagCreate && (
            <Alert
              message={errors.tagCreate?.message}
              type="error"
              showIcon
              className="mb-2"
            />
          )}
          {errors.langCode && (
            <Alert message="Language is required" type="error" showIcon className="mb-2" />
          )}

          {uploadFile.error?.message && (
            <Alert
              message={uploadFile.error.response?.data.message}
              type="error"
              showIcon
              className="mb-2"
            />
          )}
        </div>

        <Button
          type="primary"
          loading={uploadFile.status === "pending"}
          disabled={uploadFile.status === "pending"}
          htmlType="submit"
          style={{ width: "100%", }}
          className="create-template-button"
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};
