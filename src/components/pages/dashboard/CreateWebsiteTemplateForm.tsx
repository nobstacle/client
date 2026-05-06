import * as React from "react";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useTextTemplateControllerGetTextTags,
  useWebsiteTemplateControllerCreateWebsiteTemplate,
  useWebsiteTemplateControllerGetWebsiteTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Alert
} from "antd";
import { languages } from "../../../constant/languages";
import { GetWebsiteTemplateRes } from "../../../lib/client/model";

const { Text } = Typography;
const { Option } = Select;

interface CreateWebsiteTemplateFormFieldValues {
  tagCreate?: string;
  tagSelect?: string;
  url: string;
  langCode: string;
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
    url: yup.string().required("Url is required"),
    langCode: yup.string().required("Language is required"),
  },
  [["tagCreate", "tagSelect"]],
);

export const CreateWebsiteTemplateForm: React.FC<{
  cb?: (template: GetWebsiteTemplateRes, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const websiteTags = useWebsiteTemplateControllerGetWebsiteTags();
  const company = useCompanyControllerGetCompany();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateWebsiteTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      tagCreate: "",
      tagSelect: "",
      url: "",
      langCode: "",
    },
  });

  const createWebsiteTemplate =
    useWebsiteTemplateControllerCreateWebsiteTemplate();

  const handleCreateTextTemplate = (
    data: CreateWebsiteTemplateFormFieldValues,
  ) => {
    createWebsiteTemplate.mutate(
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
              !!websiteTags.data?.find(({ tag }) => tag === template.tag) ||
              false,
            );
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateWebsiteTemplateFormFieldValues> = (
    data,
  ) => handleCreateTextTemplate(data);

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="create-template-form customMapForm">
      <hr />
      <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: '1rem' }}>

        {/* URL Field */}
        <Form.Item
          label="URL"
          validateStatus={errors.url ? 'error' : ''}
          help={errors.url?.message}
          required
        >
          <Controller
            name="url"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                placeholder="Type URL here..."
                status={errors.url ? 'error' : ''}
              />
            )}
          />
        </Form.Item>

        {/* Tag Creation/Selection */}
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Form.Item
            label="Create a tag"
            validateStatus={errors.tagCreate ? 'error' : ''}
            help={errors.tagCreate?.message}
            required
          >
            <Controller
              name="tagCreate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  placeholder="Type tag name here..."
                  status={errors.tagCreate ? 'error' : ''}
                />
              )}
            />
          </Form.Item>

          <Form.Item
            label="Or select an existing tag"
            validateStatus={errors.tagSelect ? 'error' : ''}
            help={errors.tagSelect?.message}
          >
            <Controller
              name="tagSelect"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  placeholder="Select tag..."
                  style={{ width: '100%' }}
                  status={errors.tagSelect ? 'error' : ''}
                  allowClear
                  popupClassName="modal-select-dropdown"
                  getPopupContainer={(trigger) => trigger.parentElement!}
                >
                  {websiteTags.data?.map((value, index) => (
                    <Option value={value.tag} key={`${value.tag}-${index}`}>
                      {value.tag}
                    </Option>
                  ))}
                </Select>
              )}
            />
          </Form.Item>
        </Space>

        {/* Language Selection */}
        <Form.Item
          label="Language"
          validateStatus={errors.langCode ? 'error' : ''}
          help={errors.langCode?.message}
          required
        >
          <Controller
            name="langCode"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                placeholder="Search or select language..."
                style={{ width: '100%' }}
                status={errors.langCode ? 'error' : ''}
                showSearch
                popupClassName="modal-select-dropdown"
                getPopupContainer={(trigger) => trigger.parentElement!}
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

        {/* Error Display */}
        {createWebsiteTemplate.error?.message && (
          <Alert
            message={createWebsiteTemplate.error.response?.data.message}
            type="error"
            showIcon
          />
        )}

        {/* Submit Button */}
        <Form.Item style={{ textAlign: 'center', marginBottom: 0 }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={createWebsiteTemplate.status === "pending"}
            disabled={createWebsiteTemplate.status === "pending"}
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