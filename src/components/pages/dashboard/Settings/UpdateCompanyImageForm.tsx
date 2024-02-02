import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useUploadControllerUploadCompanyLogo } from "../../../../lib/client/api";
import useCompanyStore from "../../../../lib/zustand/store/companyStore";
import Input from "../../../Input";
import { Button } from "../../../Button";

const schema = yup
  .object()
  .shape({
    file: yup
      .mixed()
      .test("required", "You have to provide a file", (file: any) => {
        if (file.length > 0) return true;
        return false;
      })
      .required("File is required"),
  })
  .required();

type FormValues = {
  file: any;
};

export const UpdateCompanyForm: React.FC = () => {
  const { setCompany, company } = useCompanyStore();

  const uploadCompanyLogo = useUploadControllerUploadCompanyLogo();

  const {
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: {},
  });

  const handleRegister = async (data: FormValues) => {
    const file = data.file[0];

    uploadCompanyLogo.mutate(
      { data: { file } },
      {
        onSuccess: async (url) => {
          if (!company) return;
          setCompany({ ...company, logoUrl: url.url });
          reset();
        },
      },
    );
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => handleRegister(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col ">
      <div className="mb-2 flex flex-col">
        <label className="font-extrabold text-gray-400">Update Logo</label>
        <Input
          register={register}
          name="file"
          label=""
          type="file"
          required
          accept="image/png, image/jpeg"
        />
      </div>

      <div className="text-center">
        {errors.file?.message && (
          <p className="text-xs text-rose-600">
            {errors.file.message.toString()}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="rounded-xl  bg-primary p-2 text-white"
        disabled={uploadCompanyLogo.status === "pending"}
        isLoading={uploadCompanyLogo.status === "pending"}
      >
        Save
      </Button>

      {uploadCompanyLogo.error?.response?.data.message && (
        <p className="text-center text-xs text-rose-600">
          {uploadCompanyLogo.error.response.data.message
            .charAt(0)
            .toUpperCase() +
            uploadCompanyLogo.error.response.data.message.slice(1)}
        </p>
      )}
    </form>
  );
};
