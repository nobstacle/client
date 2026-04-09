import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useUserControllerCreate,
} from "../../../lib/client/api";
import { signIn } from "next-auth/react";
import Input from "../../Input";

const schema = yup
  .object({
    firstName: yup.string().optional(),
    lastName: yup.string().optional(),
    email: yup.string().required(),
    password: yup.string().required().min(8),
  })
  .required();

type FormValues = {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
};

export const RegisterForm: React.FC = () => {
  const createUser = useUserControllerCreate();

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "" },
  });

  const handleRegister = async (data: FormValues) => {
    createUser.mutate(
      {
        data: {
          firstName: data.firstName || undefined,
          lastName: data.lastName || undefined,
          email: data.email,
          password: data.password,
          Roles: "Admin",
        },
      },
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
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-slate-900">Start your 30-day trial</h1>
        <p className="text-sm text-slate-500">
          We’ll create your admin account first, then you can finish your company setup right away.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input
          register={register}
          label="First Name"
          name="firstName"
          type="text"
          required={false}
        />
        <Input
          register={register}
          label="Last Name"
          name="lastName"
          type="text"
          required={false}
        />
      </div>

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
        <p className="text-xs text-rose-600">Password must be at least 8 characters</p>
      )}

      <button
        type="submit"
        className="mt-4 rounded-xl border-2 border-black bg-primary p-2 text-white"
        disabled={createUser.status === "pending"}
      >
        Start Free Trial
      </button>

      {createUser.error?.response?.data.message && (
        <p className="text-center text-xs text-rose-600">
          {createUser.error.response.data.message.charAt(0).toUpperCase() +
            createUser.error.response.data.message.slice(1)}
        </p>
      )}

      <p className="mt-1 text-center text-xs text-slate-500">
        Your access stays active for 30 days from registration.
      </p>
    </form>
  );
};
