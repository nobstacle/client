"use client";

import { RegisterForm } from "../../components/pages/register/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen w-screen items-center justify-center bg-primary px-4 py-10">
      <div
        id="container"
        className="flex w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="w-full">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
