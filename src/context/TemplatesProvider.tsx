"use client";
import { createContext, useContext } from "react";
import { useFetchTemplates } from "../hooks/useFetchTemplates";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import {
  GetSlideshowTemplateRes,
  HttpExceptionSchema,
} from "../lib/client/model";
import { ErrorType } from "../lib/custom-instance";

export const TemplateContext = createContext<{
  refetchSlideshow: (
    options?: RefetchOptions | undefined,
  ) => Promise<
    QueryObserverResult<
      GetSlideshowTemplateRes[],
      ErrorType<HttpExceptionSchema>
    >
  >;
} | null>(null);

export const useTemplateContext = () => {
  const socketContext = useContext(TemplateContext);

  if (!socketContext) {
    throw new Error(
      "useCurrentUser has to be used within <CurrentUserContext.Provider>",
    );
  }

  return socketContext;
};

export const TemplateContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { refetchSlideshow } = useFetchTemplates();
  return (
    <TemplateContext.Provider value={{ refetchSlideshow }}>
      {children}
    </TemplateContext.Provider>
  );
};
