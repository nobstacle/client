// Updated CreateTextTemplateForm with matching design to CreateImageTemplateForm

import * as React from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useTextTemplateControllerCreateTextTemplate,
  useTextTemplateControllerGetTextTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Input, Select, Alert, Typography } from "antd";
import { languages } from "../../../constant/languages";
import { GetTextTemplateRes } from "../../../lib/client/model";

const { TextArea } = Input;
const { Text } = Typography;

interface CreateTextTemplateFormFieldValues {
  tagCreate?: string;
  tagSelect?: string;
  content: string;
  langCode?: string;
}

const schema = yup.object().shape(
  {
    tagSelect: yup.string().when("tagCreate", {
      is: (val: any) => val && val.length > 0,
      then: () => yup.string(),
      otherwise: () => yup.string().required("Tag is required"),
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
    content: yup.string().required("Content is required"),
    langCode: yup.string().required("Language is required"),
  },
  [["tagCreate", "tagSelect"]],
);

export const CreateTextTemplateForm: React.FC<{
  cb?: (template: GetTextTemplateRes, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const textTags = useTextTemplateControllerGetTextTags();
  const company = useCompanyControllerGetCompany();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTextTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      tagCreate: "",
      tagSelect: undefined,
      content: "",
      langCode: undefined,
    },
  });

  const createTextTemplate = useTextTemplateControllerCreateTextTemplate();

  const handleCreateTextTemplate = (
    data: CreateTextTemplateFormFieldValues,
  ) => {
    createTextTemplate.mutate(
      {
        data: {
          ...data,
          tag: (data.tagCreate as string) || (data.tagSelect as string),
          defaultLangCode: company.data?.defaultLangCode ?? "en",
        },
      },
      {
        onSuccess: (template) => {
          if (cb) {
            cb(
              template,
              !!data.tagSelect ||
              !!textTags.data?.find(({ tag }) => tag === template.tag) ||
              false,
            );
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateTextTemplateFormFieldValues> = (data) =>
    handleCreateTextTemplate(data);

  // Remove duplicates from tags
  const uniqueTags = [...new Set(textTags.data?.map(item => item.tag) || [])];

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
        {/* Content Field */}
        <div className="flex flex-col gap-2">
          <Text>Content</Text>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Type content here..."
                rows={4}
              />
            )}
          />
        </div>

        {/* Tag Fields */}
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
                  placeholder="Search or select tag..."
                  style={{ width: '100%' }}
                  options={tagOptions}
                  allowClear
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
        </div>

        {/* Language Field */}
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

        {/* Error Messages */}
        <div className="text-center">
          {errors.content && (
            <Alert message={errors.content.message} type="error" showIcon className="mb-2" />
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

          {createTextTemplate.error?.message && (
            <Alert
              message={createTextTemplate.error.response?.data.message}
              type="error"
              showIcon
              className="mb-2"
            />
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="primary"
          loading={createTextTemplate.status === "pending"}
          disabled={createTextTemplate.status === "pending"}
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