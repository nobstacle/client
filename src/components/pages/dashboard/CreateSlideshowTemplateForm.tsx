import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useImageTemplateControllerGetImageTags,
  useSlideshowTemplateControllerGetTextTags,
  useUploadControllerUploadCompanyFile,
  useUploadControllerUploadCompanyFileMany,
} from "../../../lib/client/api";
import { Button } from "../../Button";
import { SlideShowDragImage } from "./Slideshow/DragImage";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "../../Input";
import { languages } from "../../../constant/languages";
import { GetSlideshowTemplateRes } from "../../../lib/client/model";

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

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <SlideShowDragImage
            removeImagePreview={removeImagePreview}
            sort={sortImages}
            items={images}
          />
        </div>
        <div>
          <input
            name="file"
            type="file"
            required
            onChange={addImagePreview}
            accept="image/png, image/jpeg"
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
              {slideshowTags.data?.map((value, index) => (
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
          {errors.tagSelect && (
            <p className="text-xs text-rose-600">Tag is required</p>
          )}
          {errors.tagCreate && (
            <p className="text-xs text-rose-600">{errors.tagCreate?.message}</p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">Language is required</p>
          )}

          {uploadManyFile.error?.message && (
            <p className="text-xs text-rose-600">
              {uploadManyFile.error.response?.data.message}{" "}
            </p>
          )}
        </div>

        <Button
          type="submit"
          isLoading={uploadManyFile.status === "pending"}
          disabled={uploadManyFile.status === "pending" || images.length === 0}
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};
