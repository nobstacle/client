"use client";
import { createContext, useContext } from "react";
import { useFetchCompany } from "../hooks/useFetchCompany";
import { useFetchShortcut } from "../hooks/useFetchShortcut";

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
  children: React.ReactNode;
}) => {
  useFetchCompany();
  useFetchShortcut();

  return (
    <CompanyContext.Provider value={null}>{children}</CompanyContext.Provider>
  );
};
