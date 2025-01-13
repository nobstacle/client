import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import {
  useCompanyControllerGetCompany,
  useTextTemplateControllerGetTextTags,
  useFormTemplateControllerCreateFormTemplate,
  useFormTemplateControllerGetFormTags,
} from "../../../lib/client/api";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import Input from "../../Input";
import { Button } from "../../Button";
import { languages } from "../../../constant/languages";
import { FormValuesRes, GetFormTemplateRes } from "../../../lib/client/model";
import { PlusIcon } from "../../icons/PlusIcon";

interface CreateFormTemplateFormFieldValues {
  tagCreate?: string;
  tagSelect?: string;
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
    langCode: yup.string().required("Language is required"),
  },
  [["tagCreate", "tagSelect"]],
);

export const CreateFormTemplateForm: React.FC<{
  cb?: (template: GetFormTemplateRes, isUpdate: boolean) => void;
}> = ({ cb }) => {
  const FormTags = useFormTemplateControllerGetFormTags();
  const company = useCompanyControllerGetCompany();
  const [inputs, setInputs] = React.useState<FormValuesRes[]>([
    { key: "0", type: "text", value: "" },
  ]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormTemplateFormFieldValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      tagCreate: "",
      tagSelect: "",
      langCode: "",
    },
  });

  const createFormTemplate = useFormTemplateControllerCreateFormTemplate();
  const handleCreateTextTemplate = (
    data: CreateFormTemplateFormFieldValues,
  ) => {
    const validInputs = inputs.filter(({ value }) => value.length > 0);

    createFormTemplate.mutate(
      {
        data: {
          ...data,
          values: validInputs,
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
                !!FormTags.data?.find(({ tag }) => tag === template.tag) ||
                false,
            );
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<CreateFormTemplateFormFieldValues> = (data) => {
    handleCreateTextTemplate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mt-3 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {inputs.map(({ value, key, type }) => (
            <input
              name={key}
              type={type}
              value={value}
              onChange={(e) => {
                const find = [...inputs];
                const indexOf = find.findIndex((form) => form.key === key);
                find[indexOf].value = e.currentTarget.value;

                setInputs(find);
              }}
              required
              placeholder="Form field id"
              className="w-full rounded-3xl  border-2 border-black p-2"
            />
          ))}
          <div className="flex w-full justify-end p-1">
            <button
              onClick={() =>
                setInputs([
                  ...inputs,
                  {
                    key: (inputs.length + 1).toString(),
                    value: "",
                    type: "Text",
                  },
                ])
              }
            >
              <PlusIcon width="24px" />
            </button>
          </div>
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
              {FormTags.data?.map((value, index) => (
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
          {(errors.tagCreate || errors.tagSelect) && (
            <p className="text-xs text-rose-600">
              {errors.tagCreate?.message || errors.tagSelect?.message}
            </p>
          )}
          {errors.langCode && (
            <p className="text-xs text-rose-600">{errors.langCode.message}</p>
          )}

          {createFormTemplate.error?.message && (
            <p className="text-xs text-rose-600">
              {createFormTemplate.error.response?.data.message}{" "}
            </p>
          )}
        </div>
        <Button
          isLoading={createFormTemplate.status === "pending"}
          disabled={createFormTemplate.status === "pending"}
          type="submit"
        >
          Create Template
        </Button>
      </div>
    </form>
  );
};
