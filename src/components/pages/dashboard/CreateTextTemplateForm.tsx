import * as React from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useTextTemplateControllerCreateTextTemplate,
  useTextTemplateControllerGetTextTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Input, Select, Form, Typography, Space } from "antd";
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

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 12 }}>
        
        {/* Content Field */}
        <div>
          <Text style={{ color: '#6b7280', fontSize: '14px' }}>Content</Text>
          <Controller
            name="content"
            control={control}
            render={({ field }) => (
              <TextArea
                {...field}
                placeholder="Type content here..."
                status={errors.content ? 'error' : ''}
                style={{ marginTop: 8 }}
              />
            )}
          />
        </div>

        {/* Tag Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <div style={{ width: '100%' }}>
            <Text style={{ color: '#6b7280', fontSize: '14px' }}>Tag create or select</Text>
            <Controller
              name="tagCreate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Type tag name here..."
                  status={errors.tagCreate ? 'error' : ''}
                  style={{ marginTop: 8 }}
                />
              )}
            />
          </div>
          
          <div style={{ marginTop: 16 }}>
            <Controller
              name="tagSelect"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select tag..."
                  style={{ minWidth: 200 }}
                  status={errors.tagSelect ? 'error' : ''}
                  allowClear
                >
                  {textTags.data?.map((value, index) => (
                    <Select.Option value={value.tag} key={`${value.tag}-${index}`}>
                      {value.tag}
                    </Select.Option>
                  ))}
                </Select>
              )}
            />
          </div>
        </div>

        {/* Language Field */}
        <div>
          <Text style={{ color: '#6b7280', fontSize: '14px' }}>Language</Text>
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Select language..."
                style={{ width: '100%', marginTop: 8 }}
                status={errors.langCode ? 'error' : ''}
              >
                {languages.map(({ code, name }) => (
                  <Select.Option value={code} key={code}>
                    {name}
                  </Select.Option>
                ))}
                <Select.Option value="tr">Turkish</Select.Option>
                <Select.Option value="fr">French</Select.Option>
              </Select>
            )}
          />
        </div>

        {/* Error Messages */}
        <div style={{ textAlign: 'center' }}>
          {errors.content && (
            <Text type="danger" style={{ fontSize: '12px', display: 'block' }}>
              {errors.content.message}
            </Text>
          )}
          {errors.tagSelect && (
            <Text type="danger" style={{ fontSize: '12px', display: 'block' }}>
              {errors.tagCreate?.message || errors.tagSelect?.message}
            </Text>
          )}
          {errors.tagCreate && (
            <Text type="danger" style={{ fontSize: '12px', display: 'block' }}>
              {errors.tagCreate?.message}
            </Text>
          )}
          {errors.langCode && (
            <Text type="danger" style={{ fontSize: '12px', display: 'block' }}>
              {errors.langCode.message}
            </Text>
          )}
          {createTextTemplate.error?.message && (
            <Text type="danger" style={{ fontSize: '12px', display: 'block' }}>
              {createTextTemplate.error.response?.data.message}
            </Text>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="primary"
          htmlType="submit"
          loading={createTextTemplate.status === "pending"}
          disabled={createTextTemplate.status === "pending"}
          style={{ width: '100%' }}
        >
          Create Template
        </Button>
      </Space>
    </form>
  );
};