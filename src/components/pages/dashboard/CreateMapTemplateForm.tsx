import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SubmitHandler, useForm, Controller } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { Form, Input, Button, Select, Space, Typography, Alert, Spin } from "antd";
import { languages } from "../../../constant/languages";
import {
  getMapTemplateControllerGetMapTagsQueryKey,
  getTemplateControllerGetMapTemplatesQueryKey,
  useCompanyControllerGetCompany,
  useMapTemplateControllerCreateMapTemplate,
  useMapTemplateControllerGetMapTags,
} from "../../../lib/client/api";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

const { Text } = Typography;
const { Option } = Select;

interface CreateMapsTemplateFormFieldValues {
  tagCreate?: string;
  tagSelect?: string;
  origin: string;
  destination: string;
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
    origin: yup.string().required("Origin address is required"),
    destination: yup.string().required("Destination address is required"),
    langCode: yup.string().required("Language is required"),
  },
  [["tagCreate", "tagSelect"]],
);

export const CreateMapsTemplateForm: React.FC<{
  cb?: (template: any, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const queryClient = useQueryClient();
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBB5xoUCTVJoyYUy-4r7LAySR8SpfaVsHA",
    libraries: ["places"],
    language: "en",
  });

  const mapTags = useMapTemplateControllerGetMapTags();
  const company = useCompanyControllerGetCompany();

  const {
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<CreateMapsTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      tagCreate: "",
      tagSelect: "",
      origin: "",
      destination: "",
      langCode: "",
    },
  });

  const [originAutocomplete, setOriginAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);
  const [destinationAutocomplete, setDestinationAutocomplete] = React.useState<google.maps.places.Autocomplete | null>(null);

  const onOriginLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setOriginAutocomplete(autocomplete);
  };

  const onDestinationLoad = (autocomplete: google.maps.places.Autocomplete) => {
    setDestinationAutocomplete(autocomplete);
  };

  const onOriginPlaceChanged = () => {
    if (originAutocomplete !== null) {
      const place = originAutocomplete.getPlace();
      if (place.formatted_address) {
        setValue("origin", place.formatted_address);
      }
    }
  };

  const onDestinationPlaceChanged = () => {
    if (destinationAutocomplete !== null) {
      const place = destinationAutocomplete.getPlace();
      if (place.formatted_address) {
        setValue("destination", place.formatted_address);
      }
    }
  };

  const createMapsTemplate = useMapTemplateControllerCreateMapTemplate();

  const handleCreateMapsTemplate = (
    data: CreateMapsTemplateFormFieldValues,
  ) => {
    createMapsTemplate.mutate(
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
              !!mapTags.data?.find(({ tag }) => tag === template.tag) ||
              false,
            );
          }
          void queryClient.invalidateQueries({
            queryKey: getTemplateControllerGetMapTemplatesQueryKey(),
          });
          void queryClient.invalidateQueries({
            queryKey: getMapTemplateControllerGetMapTagsQueryKey(),
          });
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateMapsTemplateFormFieldValues> = (data) =>
    handleCreateMapsTemplate(data);

  if (!isLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <Spin size="large" />
        <div style={{ marginTop: '10px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="create-template-form customMapForm">
      <hr />
      <Space direction="vertical" size="middle" style={{ width: '100%', paddingTop: '1rem' }}>

        {/* Origin and Destination Address Fields */}
        <Space direction="vertical" size="small" style={{ width: '100%', rowGap: '0.3rem' }}>
          <Form.Item
            label="Origin Address"
            validateStatus={errors.origin ? 'error' : ''}
            help={errors.origin?.message}
            required
          >
            <Controller
              name="origin"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  onLoad={onOriginLoad}
                  onPlaceChanged={onOriginPlaceChanged}
                >
                  <Input
                    {...field}
                    placeholder="Type origin address here..."
                    status={errors.origin ? 'error' : ''}
                  />
                </Autocomplete>
              )}
            />
          </Form.Item>

          <Form.Item
            label="Destination Address"
            validateStatus={errors.destination ? 'error' : ''}
            help={errors.destination?.message}
            required
          >
            <Controller
              name="destination"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  onLoad={onDestinationLoad}
                  onPlaceChanged={onDestinationPlaceChanged}
                >
                  <Input
                    {...field}
                    placeholder="Type destination address here..."
                    status={errors.destination ? 'error' : ''}
                  />
                </Autocomplete>
              )}
            />
          </Form.Item>
        </Space>

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
            style={{ marginTop: '0.4rem' }}
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
                  {mapTags.data?.map((value, index) => (
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
          style={{ marginTop: '0.3rem' }}
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
        {createMapsTemplate.error?.message && (
          <Alert
            message={createMapsTemplate.error.response?.data.message}
            type="error"
            showIcon
          />
        )}

        {/* Submit Button */}
        <Form.Item style={{ textAlign: 'center', marginBottom: 0, marginTop: '0.6rem' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={createMapsTemplate.status === "pending"}
            disabled={createMapsTemplate.status === "pending"}
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
