import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useCompanyControllerCreateCompany,
  useUserControllerCreate,
} from "../../../lib/client/api";
import { signIn } from "next-auth/react";
import Input from "../../Input";

const schema = yup
  .object({
    email: yup.string().required(),
    password: yup.string().required(),
  })
  .required();

type FormValues = {
  email: string;
  password: string;
};

export const RegisterForm: React.FC = () => {
  const createUser = useUserControllerCreate();

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const handleRegister = async (data: FormValues) => {
    createUser.mutate(
      { data: { email: data.email, password: data.password } },
      {
        onSuccess: async () => {
          await signIn("credentials", {
            redirect: true,
            callbackUrl: "/",
            email: data.email,
            password: data.password,
          });
        },
      },
    );
  };

  const onSubmit: SubmitHandler<FormValues> = (data) => handleRegister(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
      <Input
        register={register}
        label="Email"
        name="email"
        type="email"
        required
      />
      {formState.errors.email && (
        <p className="text-xs text-rose-600">Email is required</p>
      )}

      <Input
        register={register}
        label="Password"
        name="password"
        type="password"
        required
      />
      {formState.errors.password && (
        <p className="text-xs text-rose-600">Password is required</p>
      )}

      <button
        type="submit"
        className="mt-4 rounded-xl border-2 border-black bg-primary p-2 text-white"
        disabled={createUser.status === "pending"}
      >
        Sign Up
      </button>

      {createUser.error?.response?.data.message && (
        <p className="text-center text-xs text-rose-600">
          {createUser.error.response.data.message.charAt(0).toUpperCase() +
            createUser.error.response.data.message.slice(1)}
        </p>
      )}
    </form>
  );
};
