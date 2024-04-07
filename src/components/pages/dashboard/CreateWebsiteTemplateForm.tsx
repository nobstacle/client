import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useTextTemplateControllerGetTextTags,
  useWebsiteTemplateControllerCreateWebsiteTemplate,
  useWebsiteTemplateControllerGetWebsiteTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
import { GetWebsiteTemplateRes } from "../../../lib/client/model";

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
          .max(20, "Tag must be at most 20 characters"),
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
    register,
    handleSubmit,
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input
            register={register}
            name="url"
            label="Url"
            type="text"
            required
            placeholder="Type content here..."
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
              {websiteTags.data?.map((value, index) => (
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
          {errors.url && (
            <p className="text-xs text-rose-600">{errors.url.message}</p>
          )}
          {(errors.tagCreate || errors.tagSelect) && (
            <p className="text-xs text-rose-600">
              {errors.tagCreate?.message || errors.tagSelect?.message}
            </p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">{errors.langCode.message}</p>
          )}

          {createWebsiteTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {createWebsiteTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={createWebsiteTemplate.status === "pending"}
          disabled={createWebsiteTemplate.status === "pending"}
          type="submit"
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};
