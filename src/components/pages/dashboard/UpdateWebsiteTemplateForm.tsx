import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  getContentControllerFindOneQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerFindOne,
  useWebsiteTemplateControllerPatchWebsiteTemplateOne,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { GetWebsiteTemplateRes } from "../../../lib/client/model";

interface CreateWebsiteTemplateFormFieldValues {
  url: string;
}

const schema = yup
  .object({
    url: yup.string().required("Url is required"),
  })
  .required();

export const UpdateWebsiteTemplateForm: React.FC<{
  cb?: (template: GetWebsiteTemplateRes) => void;
  sourceId: number;
  defaultLangCode: string;
  tag: string;
}> = ({ cb, sourceId, defaultLangCode, tag }) => {
  const content = useContentControllerFindOne(
    {
      refType: "Website",
      sourceId,
      langCode: defaultLangCode,
    },
    {
      query: {
        staleTime: 0,
        gcTime: 0,
        queryKey: getContentControllerFindOneQueryKey({
          refType: "Website",
          sourceId,
          langCode: defaultLangCode,
        }),
      },
    },
  );

  const company = useCompanyControllerGetCompany();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateWebsiteTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      url: "",
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (content.isSuccess) {
      setValue("url", content.data.content ?? "");
    }
  }, [content.isSuccess]);

  const updateWebsiteTemplate =
    useWebsiteTemplateControllerPatchWebsiteTemplateOne();
  const handleUpdateWebsiteTemplate = (
    data: CreateWebsiteTemplateFormFieldValues,
  ) => {
    updateWebsiteTemplate.mutate(
      {
        tag,
        data: {
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          url: data.url,
          langCode: defaultLangCode,
        },
      },
      {
        onSuccess: (template) => {
          if (cb) {
            cb(template);
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateWebsiteTemplateFormFieldValues> = (
    data,
  ) => handleUpdateWebsiteTemplate(data);

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
        {/* <div className="flex flex-col items-end">
          <div className="mt-4 flex">
            <select {...register("tagSelect")}>
              <option value="">Select tag...</option>
              {textTags.data?.map((value, index) => (
                <option value={value} key={`${value}-${index}`}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div> */}

        {/* <div className="flex flex-col">
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
        </div> */}

        <div className="text-center">
          {errors.url && (
            <p className="text-xs text-rose-600">{errors.url.message}</p>
          )}
          {/* {errors.tagSelect && (
            <p className="text-xs text-rose-600">{errors.tagSelect?.message}</p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">{errors.langCode.message}</p>
          )} */}

          {updateWebsiteTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {updateWebsiteTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={updateWebsiteTemplate.status === "pending"}
          disabled={updateWebsiteTemplate.status === "pending"}
          type="submit"
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
