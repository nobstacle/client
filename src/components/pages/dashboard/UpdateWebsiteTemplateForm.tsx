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
  }, [content.isSuccess, content.data?.content, setValue]);

  const updateWebsiteTemplate =
    useWebsiteTemplateControllerPatchWebsiteTemplateOne();
  const handleUpdateWebsiteTemplate = (data: CreateWebsiteTemplateFormFieldValues) => {
    if (!company.data) {
      console.error("Company data not loaded yet");
      return;
    }

    updateWebsiteTemplate.mutate({
      tag,
      data: {
        defaultLangCode: company.data.defaultLangCode ?? "en",
        url: data.url,
        langCode: defaultLangCode,
      },
    }, {
      onSuccess: (template) => {
        if (cb) {
          cb(template);
        }
      },
    });
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

        <div className="text-center">
          {errors.url && (
            <p className="text-xs text-rose-600">{errors.url.message}</p>
          )}

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
