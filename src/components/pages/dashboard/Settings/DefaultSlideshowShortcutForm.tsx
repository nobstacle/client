import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useShortcutControllerCreateShortcutMany,
  useShortcutControllerPatchShortcut,
  useSlideshowTemplateControllerGetTextTags,
} from "../../../../lib/client/api";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import { Button } from "../../../Button";
import useShortcutStore from "../../../../lib/zustand/store/shortcutStore";
import useTemplateStore from "../../../../lib/zustand/store/templateStore";

const schema = yup
  .object()
  .shape({
    tag: yup.string().required("Slideshow tag is required"),
  })
  .required();

type FormValues = {
  tag: string;
};

export const DefaultSlideshowShortcutForm: React.FC = () => {
  const { company } = useCompanyStore();
  const { defaulSlideshowShortcut, setDefaultSlideshowShortcut } =
    useShortcutStore();

  const slideshowTags = useSlideshowTemplateControllerGetTextTags();
  const shortcutCreate = useShortcutControllerCreateShortcutMany();
  const shortcutPatch = useShortcutControllerPatchShortcut();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { tag: "" },
  });

  const handleDefaultSlideshow = async (data: FormValues) => {
    if (!defaulSlideshowShortcut) {
      shortcutCreate.mutate(
        {
          data: {
            postShortCutReqArray: [
              {
                type: "DefaultSlideshow",
                value: data.tag,
              },
            ],
          },
        },
        {
          onSuccess: (res) => {
            setDefaultSlideshowShortcut(res[0]);
          },
        },
      );
    } else {
      shortcutPatch.mutate(
        {
          id: defaulSlideshowShortcut.id,
          data: {
            type: "DefaultSlideshow",
            value: data.tag,
          },
        },
        {
          onSuccess: (res) => {
            setDefaultSlideshowShortcut(res);
          },
        },
      );
    }
  };

  React.useEffect(() => {
    if (slideshowTags.isSuccess && defaulSlideshowShortcut?.value) {
      setValue("tag", defaulSlideshowShortcut.value);
    }
  }, [defaulSlideshowShortcut?.value, slideshowTags.isSuccess]);

  const onSubmit: SubmitHandler<FormValues> = (data) =>
    handleDefaultSlideshow(data);

  if (slideshowTags.data?.length === 0) return null;
  if (slideshowTags.isPending) return null;
  if (!company?.logoUrl) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <label className="font-extrabold text-gray-400">
        Default Slideshow Shortcut{" "}
      </label>
      <div className="mt-4 flex">
        <select {...register("tag")}>
          <option value="" label="Select tag...">
            Select tag...
          </option>
          {slideshowTags.data?.map((value, index) => (
            <option value={value.tag} key={`${value.tag}-${index}`}>
              {value.tag}
            </option>
          ))}
        </select>
      </div>

      <div className="text-center">
        {errors.tag?.message && (
          <p className="text-xs text-rose-600">
            {errors.tag.message.toString()}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="rounded-xl  bg-primary p-2 text-white"
        disabled={
          shortcutCreate.status === "pending" ||
          shortcutPatch.status === "pending"
        }
        isLoading={
          shortcutCreate.status === "pending" ||
          shortcutPatch.status === "pending"
        }
      >
        Save
      </Button>

      {shortcutCreate.error?.response?.data.message && (
        <p className="text-center text-xs text-rose-600">
          {shortcutCreate.error.response.data.message.charAt(0).toUpperCase() +
            shortcutCreate.error.response.data.message.slice(1)}
        </p>
      )}
    </form>
  );
};
