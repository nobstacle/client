"use client";
import { createContext, useContext, type ReactNode } from "react";
import { useFetchCompany } from "../hooks/useFetchCompany";
import { TemplateLoaderProvider } from "./TemplateLoaderProvider";

export const CompanyContext = createContext<null>(null);

export const useCompanyContext = () => {
  const socketContext = useContext(CompanyContext);

  if (!socketContext) {
    throw new Error(
      "useCurrentUser has to be used within <CurrentUserContext.Provider>",
    );
  }

  return socketContext;
};

export const CompanyContextProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  useFetchCompany();

  return (
    <TemplateLoaderProvider>
      <CompanyContext.Provider value={null}>{children}</CompanyContext.Provider>
    </TemplateLoaderProvider>
  );
};
