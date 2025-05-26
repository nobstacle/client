import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
// import { GetMapsTemplateRes } from "../../../lib/client/model";
import {
  useCompanyControllerGetCompany,
  useMapTemplateControllerCreateMapTemplate,
  useMapTemplateControllerGetMapTags,
} from "../../../lib/client/api";
import { Autocomplete, useJsApiLoader } from "@react-google-maps/api";

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
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBB5xoUCTVJoyYUy-4r7LAySR8SpfaVsHA",
    libraries: ["places"],
    language: "en",
  });

  const mapTags = useMapTemplateControllerGetMapTags();
  const company = useCompanyControllerGetCompany();

  const {
    register,
    handleSubmit,
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
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateMapsTemplateFormFieldValues> = (data) =>
    handleCreateMapsTemplate(data);

  if (!isLoaded) {
    return <p>Loading...</p>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Autocomplete>
            <Input
              register={register}
              name="origin"
              label="Origin Address"
              type="text"
              required
              placeholder="Type origin address here..."
            />
          </Autocomplete>

          <Autocomplete>
            <Input
              register={register}
              name="destination"
              label="Destination Address"
              type="text"
              required
              placeholder="Type destination address here..."
            />
          </Autocomplete>
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
              {mapTags.data?.map((value, index) => (
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
          {errors.destination && (
            <p className="text-xs text-rose-600">
              {errors.destination.message}
            </p>
          )}

          {errors.origin && (
            <p className="text-xs text-rose-600">{errors.origin.message}</p>
          )}
          {errors.tagSelect && (
            <p className="text-xs text-rose-600">
              {errors.tagCreate?.message || errors.tagSelect?.message}
            </p>
          )}
          {errors.tagCreate && (
            <p className="text-xs text-rose-600">{errors.tagCreate?.message}</p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">{errors.langCode.message}</p>
          )}

          {createMapsTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {createMapsTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={createMapsTemplate.status === "pending"}
          disabled={createMapsTemplate.status === "pending"}
          type="submit"
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};
