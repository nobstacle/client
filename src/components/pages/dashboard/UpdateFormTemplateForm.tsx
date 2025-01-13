import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  getContentControllerFindOneQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerFindOne,
  useFormTemplateControllerPatchFormTemplateOne,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { FormValuesRes, GetFormTemplateRes } from "../../../lib/client/model";

interface CreateFormTemplateFormFieldValues {
  values: any[];
}

const schema = yup
  .object({
    values: yup.array().required("Url is required"),
  })
  .required();

export const UpdateFormTemplateForm: React.FC<{
  cb?: (template: GetFormTemplateRes) => void;
  sourceId: number;
  defaultLangCode: string;
  tag: string;
}> = ({ cb, sourceId, defaultLangCode, tag }) => {
  const [inputs, setInputs] = React.useState<FormValuesRes[]>([
    { key: "0", type: "text", value: "" },
  ]);

  const content = useContentControllerFindOne(
    {
      refType: "Form",
      sourceId,
      langCode: defaultLangCode,
    },
    {
      query: {
        staleTime: 0,
        gcTime: 0,
        queryKey: getContentControllerFindOneQueryKey({
          refType: "Form",
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
  } = useForm<CreateFormTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      values: [],
    },
    mode: "onChange",
  });

  React.useEffect(() => {
    if (content.isSuccess) {
      setValue("values", JSON.parse(content.data.content ?? ""));
    }
  }, [content.isSuccess]);

  const updateFormTemplate = useFormTemplateControllerPatchFormTemplateOne();
  const handleUpdateFormTemplate = (
    data: CreateFormTemplateFormFieldValues,
  ) => {
    updateFormTemplate.mutate(
      {
        tag,
        data: {
          defaultLangCode: company.data?.defaultLangCode ?? "en",
          values: data.values,
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

  const onSubmit: SubmitHandler<CreateFormTemplateFormFieldValues> = (data) =>
    handleUpdateFormTemplate(data);

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
          {errors.values && (
            <p className="text-xs text-rose-600">{errors.values.message}</p>
          )}
          {/* {errors.tagSelect && (
            <p className="text-xs text-rose-600">{errors.tagSelect?.message}</p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">{errors.langCode.message}</p>
          )} */}

          {updateFormTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {updateFormTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={updateFormTemplate.status === "pending"}
          disabled={updateFormTemplate.status === "pending"}
          type="submit"
        >
          Update Template
        </Button>
      </div>
    </form>
  );
};
