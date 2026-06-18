import * as React from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  useUserControllerCreate,
} from "../../../lib/client/api";
import { signIn } from "next-auth/react";

const schema = yup
  .object({
    firstName: yup.string().optional(),
    lastName: yup.string().optional(),
    email: yup.string().email("Invalid email format").required("Email is required"),
    password: yup.string().required("Password is required").min(8, "Password must be at least 8 characters"),
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

  const { errors } = formState;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-3xl font-bold text-gray-900">Start your 30-day trial</h1>
        <p className="mt-2 text-sm text-gray-600">
          We'll create your admin account first, then you can finish your company setup right away.
        </p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="firstName" className="text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            id="firstName"
            {...register("firstName")}
            type="text"
            placeholder="John"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.firstName && (
            <p className="text-xs text-rose-600">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="lastName" className="text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="lastName"
            {...register("lastName")}
            type="text"
            placeholder="Doe"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {errors.lastName && (
            <p className="text-xs text-rose-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email Field */}
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <input
            id="email"
            {...register("email")}
            type="email"
            placeholder="you@company.com"
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {errors.email && (
          <p className="text-xs text-rose-600">{errors.email.message}</p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <input
            id="password"
            {...register("password")}
            type="password"
            placeholder="Minimum 8 characters"
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        {errors.password && (
          <p className="text-xs text-rose-600">{errors.password.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={createUser.status === "pending"}
        className="mt-4 w-full rounded-lg bg-primary py-3 px-4 text-white font-semibold shadow-md transition-all hover:bg-primary-dark hover:shadow-lg hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {createUser.status === "pending" ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating account...
          </span>
        ) : (
          "Start Free Trial"
        )}
      </button>

      {/* Error Message */}
      {createUser.error?.response?.data.message && (
        <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
          <p className="text-sm text-rose-700 text-center">
            {createUser.error.response.data.message.charAt(0).toUpperCase() +
              createUser.error.response.data.message.slice(1)}
          </p>
        </div>
      )}

      {/* Footer Note */}
      <p className="text-center text-xs text-gray-500">
        Your access stays active for 30 days from registration.
      </p>
    </form>
  );
};
