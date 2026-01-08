import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import {
  templateControllerGetVideoTemplates,
  useCompanyControllerGetCompany,
  useUploadControllerUploadCompanyFile,
  useVideoTemplateControllerGetVideoTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Upload, Select, Form, Alert, Space, Input } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { languages } from "../../../constant/languages";
import { GetVideoTemplateRes } from "../../../lib/client/model";

interface CreateImageTemplateFormFieldValues {
  file: any;
  langCode: string;
  tagSelect?: string;
  tagCreate?: string;
}

const schema = yup.object().shape(
  {
    file: yup
      .mixed()
      .required("File is required")
      .test(
        "fileSize",
        "Please upload a file that is 100 MB or smaller.",
        (value: any) => {
          console.log(value[0].size <= 100 * 1024, value[0].size, 576);
          return value && value[0].size <= 100 * 1024 * 1024; // 100mb
        },
      ),
    langCode: yup.string().required(),
    tagSelect: yup.string().when("tagCreate", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () => yup.string().required(),
    }),

    tagCreate: yup.string().when("tagSelect", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () =>
        yup
          .string()
          .required("Tag is required")
          .max(30, "Tag must be at most 30 characters"),
    }),
  },
  [["tagCreate", "tagSelect"]],
);

export const CreateVideoTemplateForm: React.FC<{
  cb?: (video: GetVideoTemplateRes, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const videoTags = useVideoTemplateControllerGetVideoTags();

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

  const company = useCompanyControllerGetCompany();

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
            const template = await templateControllerGetVideoTemplates({
              id: res.sourceId,
            });
            cb(
              template[0],
              !!data.tagSelect ||
              !!videoTags.data?.find(({ tag }) => tag === template[0].tag) ||
              false,
            );
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateImageTemplateFormFieldValues> = (data) =>
    handleCreateImageTemplateCreate(data);

  const uploadProps = {
    accept: "video/mp4,video/ogg,video/webm",
    beforeUpload: (file: File) => {
      setValue("file", [file]);
      return false; // Prevent automatic upload
    },
    maxCount: 1,
    onRemove: () => {
      setValue("file", null);
    },
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="create-template-form customMapForm">
      <hr />
      {/* Origin and Destination Address Fields */}
      <Space direction="vertical" size="small" style={{ width: '100%', rowGap: '0.3rem', paddingTop: '1rem' }}>

        {/* File Upload */}
        <Form.Item
          label="Video to upload"
          validateStatus={errors.file ? "error" : ""}
          help={errors.file?.message}
        >
          <Controller
            name="file"
            control={control}
            render={({ field }) => (
              <Upload {...uploadProps}>
                <Button style={{ color: '#000' }} icon={<UploadOutlined />}>Click to Upload</Button>
              </Upload>
            )}
          />
        </Form.Item>

        {/* Tag Create Input */}
        <Form.Item
          label="Create a tag"
          validateStatus={errors.tagCreate ? "error" : ""}
          help={errors.tagCreate?.message}
        >
          <Controller
            name="tagCreate"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Type tag name here..."
              />
            )}
          />
        </Form.Item>

        {/* Tag Select */}
        <Form.Item
          label="Or select an existing tag"
          validateStatus={errors.tagSelect ? "error" : ""}
          help={errors.tagSelect?.message}
        >
          <Controller
            name="tagSelect"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select tag..."
                style={{ width: "100%" }}
                allowClear
              >
                {videoTags.data?.map((value, index) => (
                  <Select.Option value={value.tag} key={`${value.tag}-${index}`}>
                    {value.tag}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Language Select */}
        <Form.Item
          label="Language"
          validateStatus={errors.langCode ? "error" : ""}
          help={errors.langCode?.message || "Language is required"}
        >
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Search or select language..."
                style={{ width: "100%" }}
                showSearch
                filterOption={(input, option) =>
                  (option?.children as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                optionFilterProp="children"
              >
                {languages.map(({ code, name }, index) => (
                  <Select.Option value={code} key={index}>
                    {name}
                  </Select.Option>
                ))}
              </Select>
            )}
          />
        </Form.Item>

        {/* Error Messages */}
        {uploadFile.error?.message && (
          <Alert
            message={uploadFile.error.response?.data.message}
            type="error"
            showIcon
          />
        )}

        {/* Submit Button */}
        <Form.Item style={{ textAlign: "center", marginTop: '2rem' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={uploadFile.status === "pending"}
            disabled={uploadFile.status === "pending"}
            style={{ width: "100%", }}
            className="create-template-button"
          >
            Create Template
          </Button>
        </Form.Item>
      </Space>
    </Form>
  );
};