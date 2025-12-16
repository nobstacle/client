import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useImageTemplateControllerGetImageTags,
  useSlideshowTemplateControllerGetTextTags,
  useUploadControllerUploadCompanyFile,
  useUploadControllerUploadCompanyFileMany,
} from "../../../lib/client/api";
import { Button, Upload, Select, Typography, Space, Alert } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { SlideShowDragImage } from "./Slideshow/DragImage";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { languages } from "../../../constant/languages";
import { GetSlideshowTemplateRes } from "../../../lib/client/model";

const { Text } = Typography;
const { Option } = Select;

interface CreateSlideshowTemplateFormFieldValues {
  langCode: string;
  tagSelect?: string;
  tagCreate?: string;
}

const schema = yup.object().shape(
  {
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

export const CreateSlideshowTemplateForm: React.FC<{
  cb?: () => void;
}> = ({ cb }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateSlideshowTemplateFormFieldValues>({
    resolver: yupResolver(schema),
  });
  const company = useCompanyControllerGetCompany();

  const slideshowTags = useSlideshowTemplateControllerGetTextTags();

  const [images, setImages] = React.useState<
    { id: number; src: string; file: Blob }[]
  >([]);

  const uploadManyFile = useUploadControllerUploadCompanyFileMany({
    mutation: { retry: 0 },
  });

  const addImagePreview = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.currentTarget.files) {
      const file = e.currentTarget?.files[0];
      if (file) {
        const src = URL.createObjectURL(file);
        setImages([...images, { id: images.length + 1, src, file }]);
      }
    }
  };

  const removeImagePreview = (id: number) => {
    const filter = images.filter((image) => image.id !== id);

    setImages(filter);
  };

  const sortImages = (item1: UniqueIdentifier, item2: UniqueIdentifier) => {
    setImages((prevItems) => {
      const oldIndex = prevItems.findIndex((item) => item.id === item1);
      const newIndex = prevItems.findIndex((item) => item.id === item2);

      let shallow = [...prevItems];

      shallow = arrayMove(prevItems, oldIndex, newIndex);

      return shallow;
    });
  };

  const handleCreateSlideshowTemplate = (
    data: CreateSlideshowTemplateFormFieldValues,
  ) => {
    const files = images.map(({ file }) => file);
    uploadManyFile.mutate(
      {
        data: {
          file: files,
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          langCode: data.langCode,
          tag: (data.tagCreate as string) || (data.tagSelect as string),
        },
      },
      {
        onSuccess: () => {
          if (cb) {
            cb();
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateSlideshowTemplateFormFieldValues> = (
    data,
  ) => handleCreateSlideshowTemplate(data);

  // Custom upload props to integrate with react-hook-form
  const uploadProps = {
    beforeUpload: (file: any) => {
      const src = URL.createObjectURL(file);
      setImages([...images, { id: images.length + 1, src, file }]);
      return false; // Prevent automatic upload
    },
    maxCount: 1,
    accept: "image/png, image/jpeg",
    showUploadList: false, // We handle the list with SlideShowDragImage
  };


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="create-template-form">
      <hr />
      <Space direction="vertical" size="middle" style={{ width: "100%", paddingTop: '1rem' }}>
        {images?.length > 0 && (
          <div>
            <SlideShowDragImage
              removeImagePreview={removeImagePreview}
              sort={sortImages}
              items={images}
            />
          </div>
        )}
        <div>
          <Text>Image to upload</Text>
          <Upload {...uploadProps}>
            <Button style={{ color: '#000' }} icon={<UploadOutlined />}>Add Image</Button>
          </Upload>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ width: "100%" }}>
            <Text>Create a tag</Text>
            <input
              style={{
                width: "100%",
                borderRadius: "6px",
                border: "1px solid #d9d9d9",
                padding: "8px 11px",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.3s",
              }}
              {...register("tagCreate")}
              placeholder="Type tag name here..."
              onFocus={(e) => {
                e.target.style.borderColor = "#1890ff";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#d9d9d9";
              }}
            />
          </div>
          <div style={{ marginTop: "16px", width: "100%" }}>
            <Text>Or select an existing tag</Text>
            <Select
              placeholder="Select tag..."
              style={{ width: '100%' }}
              {...register("tagSelect")}
              onChange={(value) => setValue("tagSelect", value)}
            >
              <Option value="">Select tag...</Option>
              {slideshowTags.data?.map((value, index) => (
                <Option value={value.tag} key={`${value.tag}-${index}`}>
                  {value.tag}
                </Option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Text>Language</Text>
          <Select
            placeholder="Select language..."
            style={{ width: "100%" }}
            {...register("langCode")}
            onChange={(value) => setValue("langCode", value)}
          >
            <Option value="">Select language...</Option>
            {languages.map(({ code, name }, index) => (
              <Select.Option value={code} key={index}>
                {name}
              </Select.Option>
            ))}
          </Select>
        </div>

        <div style={{ textAlign: "center" }}>
          {errors.tagSelect && (
            <Alert
              message="Tag is required"
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}
          {errors.tagCreate && (
            <Alert
              message={errors.tagCreate?.message}
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}
          {errors.langCode && (
            <Alert
              message="Language is required"
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}

          {uploadManyFile.error?.message && (
            <Alert
              message={uploadManyFile.error.response?.data.message}
              type="error"
              showIcon
              style={{ marginBottom: "8px" }}
            />
          )}
        </div>

        <Button
          type="primary"
          htmlType="submit"
          loading={uploadManyFile.status === "pending"}
          disabled={uploadManyFile.status === "pending" || images.length === 0}
          style={{ width: "100%", }}
          className="create-template-button"
        >
          Create Template
        </Button>
      </Space>
    </form>
  );
};