import * as React from "react";
import {
  getContentControllerFindOneQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerFindOne,
  useSlideshowTemplateControllerGetTextTags,
  useUploadControllerPatchCompanyFileMany,
} from "../../../lib/client/api";
import { Button } from "../../Button";
import { SlideShowDragImage } from "./Slideshow/DragImage";
import { arrayMove } from "@dnd-kit/sortable";
import { UniqueIdentifier } from "@dnd-kit/core";
import { linkToFile } from "../../../utils";
import { Spinner } from "../../Spinner";

export const UpdateSlideshowTemplateForm: React.FC<{
  cb?: () => void;
  langCode: string;
  sourceId: number;
  tag: string;
}> = ({ cb, sourceId, langCode, tag }) => {
  const [images, setImages] = React.useState<
    { id: number; src: string; file: Blob }[]
  >([]);

  const content = useContentControllerFindOne(
    {
      refType: "Slideshow",
      sourceId,
      langCode,
    },
    {
      query: {
        queryKey: getContentControllerFindOneQueryKey({
          refType: "Slideshow",
          sourceId,
          langCode,
        }),
        retry: 0,
      },
    },
  );

  const fetchContent = async () => {
    if (content.isSuccess) {
      const data = [];
      for (const [index, c] of Array.from(
        content.data.contents?.entries() ?? [],
      )) {
        const obj = {
          id: index + 1,
          src: c,
          file: await linkToFile(c),
        };
        data.push(obj);
      }

      setImages([...images, ...data]);
    }
  };

  React.useEffect(() => {
    if (content.isSuccess) {
      fetchContent();
    }
  }, [content.isSuccess]);

  const company = useCompanyControllerGetCompany();

  const slideshowTags = useSlideshowTemplateControllerGetTextTags();

  const uploadManyFile = useUploadControllerPatchCompanyFileMany({
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

  const handleCreateSlideshowTemplate = () => {
    const files = images.map(({ file }) => file);

    uploadManyFile.mutate(
      {
        data: {
          file: files,
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          langCode: langCode,
          tag,
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCreateSlideshowTemplate();
      }}
    >
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {images.length === 0 && <Spinner />}

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
            onChange={addImagePreview}
            accept="image/png, image/jpeg"
            disabled={content.isLoading}
          />
        </div>

        <div className="text-center">
          {uploadManyFile.error?.message && (
            <p className="text-xs text-rose-600">
              {uploadManyFile.error.response?.data.message}{" "}
            </p>
          )}
        </div>

        <Button
          type="submit"
          isLoading={uploadManyFile.status === "pending"}
          disabled={uploadManyFile.status === "pending" || images.length < 1}
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
