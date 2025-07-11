"use client";

import { create } from "zustand";
import { GetCompanyRes, GetUserRes } from "../../client/model";
import { persist } from "zustand/middleware";

interface CompanyState {
  company: GetCompanyRes | null;
  companyUsers: GetUserRes[];
  setCompany: (company: GetCompanyRes) => void;
  setCompanyUsers: (companyUsers: GetUserRes[]) => void;
}

const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      company: null,
      setCompany: (company) => set(() => ({ company })),
      companyUsers: [],
      setCompanyUsers: (companyUsers) => set(() => ({ companyUsers })),
    }),
    {
      name: "company-storage", 
    },
  ),
);

export default useCompanyStore;
