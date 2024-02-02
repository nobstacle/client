import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useCompanyControllerCreateCompany,
  useUploadControllerUploadCompanyLogo,
} from "../../../lib/client/api";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LanguagePicker } from "../dashboard/Header/LanguagePicker";
import { Button } from "../../Button";
import useCompanyStore from "../../../lib/zustand/store/companyStore";
import Input from "../../Input";

const schema = yup
  .object({
    name: yup.string().required(),
    defaultLangCode: yup.string().required(),
    stationCount: yup.number().required(),
    file: yup.mixed().optional(),
  })
  .required();

type FormValues = {
  name: string;
  defaultLangCode: string;
  stationCount: number;
  file?: any;
};

export const CreateCompanyForm: React.FC = () => {
  const { setCompany } = useCompanyStore();
  const navigate = useRouter();
  const session = useSession();
  const createCompany = useCompanyControllerCreateCompany({
    request: {
      headers: {
        Authorization: `Bearer ${session.data?.user.backendTokens.at}`,
      },
    },
  });

  const uploadCompanyLogo = useUploadControllerUploadCompanyLogo({
    request: {
      headers: {
        Authorization: `Bearer ${session.data?.user.backendTokens.at}`,
      },
    },
  });

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { name: "", defaultLangCode: "en", stationCount: 5 },
  });

  const handleRegister = async (data: FormValues) => {
    session.update();
    createCompany.mutate(
      {
        data: {
          name: data.name,
          defaultLangCode: data.defaultLangCode,
          stationCount: data.stationCount,
        },
      },
      {
        onSuccess: async (company) => {
          const file = data.file[0];
          if (file) {
            uploadCompanyLogo.mutate(
              { data: { file } },
              {
                onSuccess: async (url) => {
                  setCompany({ ...company, logoUrl: url.url });
                  await session.update();
                  navigate.push("/");
                },
              },
            );
          } else {
            setCompany(company);
            await session.update();
            navigate.push("/");
          }
        },
      },
    );
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => handleRegister(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <label htmlFor="email" className="text-md text-gray-500">
        Create Company
      </label>
      <input
        className="w-full rounded-3xl  border-2 border-black p-2"
        {...register("name")}
        type="text"
        placeholder="Company name..."
      />
      {formState.errors.name && (
        <p className="text-xs text-rose-600">Company name is required</p>
      )}
      <div className="mb-2 flex flex-col">
        <label htmlFor="email" className="text-md text-gray-500">
          Logo:
        </label>
        <Input
          register={register}
          name="file"
          label=""
          type="file"
          required
          accept="image/png, image/jpeg"
        />
      </div>

      <div className="flex w-full flex-col gap-5">
        <div className="flex flex-col">
          <label htmlFor="email" className="text-md text-gray-500">
            Company Language:
          </label>
          <LanguagePicker
            defaultValue="en"
            name="defaultLangCode"
            register={register}
          />
        </div>

        <div className="flex flex-col">
          <div className="flex w-full justify-end gap-4">
            <label htmlFor="email" className="text-md text-gray-500">
              Station:
            </label>
            <select
              className="min-w-[80px] rounded-md"
              defaultValue={"5"}
              {...register("stationCount")}
            >
              {Array(10)
                .fill(1)
                .map((x, y) => x + y)
                .map((val, index) => (
                  <option
                    value={String(val)}
                    key={`station-picker-item-${index}`}
                  >
                    {val}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>
      {formState.errors.defaultLangCode && (
        <p className="text-xs text-rose-600">Language is required</p>
      )}

      <Button
        type="submit"
        className="mt-4 rounded-xl border-2 border-black bg-primary p-2 text-white"
        disabled={
          createCompany.status === "pending" ||
          uploadCompanyLogo.status === "pending"
        }
        isLoading={
          createCompany.status === "pending" ||
          uploadCompanyLogo.status === "pending"
        }
      >
        Create Company
      </Button>

      {createCompany.error?.response?.data.message && (
        <p className="text-center text-xs text-rose-600">
          {createCompany.error.response.data.message.charAt(0).toUpperCase() +
            createCompany.error.response.data.message.slice(1)}
        </p>
      )}
    </form>
  );
};
