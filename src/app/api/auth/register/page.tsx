"use client";

import { RegisterForm } from "../../../../components/pages/register/RegisterForm";

export default function RegisterPage() {

  return (
    <main className="flex h-screen w-screen items-center justify-center bg-primary">
      <div
        id="container"
        className="flex w-3/12 rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="w-full">
          <RegisterForm />
        </div>
      </div>
    </main>
  );
}
