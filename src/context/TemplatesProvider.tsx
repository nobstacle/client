"use client";
import React, {  createContext, useContext, useEffect  } from "react";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";
import {
  GetSlideshowTemplateRes,
  HttpExceptionSchema,
} from "../lib/client/model";
import { ErrorType } from "../lib/custom-instance";
import {
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  useTemplateControllerGetSlideshowTemplates,
} from "../lib/client/api";
import useTemplateStore from "../lib/zustand/store/templateStore";

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
  const slideshow = useTemplateControllerGetSlideshowTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        gcTime: Infinity,
        queryKey: getTemplateControllerGetSlideshowTemplatesQueryKey(),
      },
    },
  );
  const setSlideshows = useTemplateStore((state) => state.setSlideshows);

  useEffect(() => {
    if (slideshow.data) setSlideshows(slideshow.data);
  }, [slideshow.data, setSlideshows]);

  const handleRefetch = async (options?: RefetchOptions) => {
    const result = await slideshow.refetch(options);
    if (result.data) {
      setSlideshows(result.data);
    }
    return result;
  };

  return (
    <TemplateContext.Provider value={{ refetchSlideshow: handleRefetch }}>
      {children}
    </TemplateContext.Provider>
  );
};
