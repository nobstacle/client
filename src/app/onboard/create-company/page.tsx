"use client";
import { CreateCompanyForm } from "../../../components/pages/company/CreateCompanyForm";

export default function CreateCompany() {
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-primary">
      <div
        id="container"
        className="flex w-3/12 rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="w-full">
          <CreateCompanyForm />
        </div>
      </div>
    </main>
  );
}
