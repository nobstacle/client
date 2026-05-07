import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  getTemplateControllerGetImageTemplatesQueryKey,
  getTemplateControllerGetMapTemplatesQueryKey,
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  getTemplateControllerGetTextTemplatesQueryKey,
  getTemplateControllerGetVideoTemplatesQueryKey,
  getScrollControllerGetScrollsQueryKey,
  useTemplateControllerGetImageTemplates,
  useTemplateControllerGetMapTemplates,
  useTemplateControllerGetSlideshowTemplates,
  useTemplateControllerGetTextTemplates,
  useTemplateControllerGetVideoTemplates,
  useSurveyAnswerControllerGetSurveyAnswers,
  getSurveyAnswerControllerGetSurveyAnswersQueryKey,
  useTemplateControllerGetWebsiteTemplates,
  getTemplateControllerGetWebsiteTemplatesQueryKey,
  useTemplateControllerGetJotformTemplates,
  getTemplateControllerGetJotformTemplatesQueryKey,
  useTemplateControllerGetDocumenttemplates,
  getTemplateControllerGetDocumentTemplatesQueryKey,
  useScrollControllerGetScrolls,
} from "../lib/client/api";
import useTemplateStore from "../lib/zustand/store/templateStore";

export const useFetchTemplates = () => {
  const searchParams = useSearchParams();
  const currentLang = searchParams.get("lang") || undefined;
  const {
    setTexts,
    setSlideshows,
    setVideos,
    setImages,
    setMaps,
    setSurveyAnswers,
    setWebsites,
    setDocuments,
    setScrolls,
    setPublicScrolls,
  } = useTemplateStore();
  const textTemplates = useTemplateControllerGetTextTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetTextTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  const imageTemplates = useTemplateControllerGetImageTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetImageTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );
  const videoTemplates = useTemplateControllerGetVideoTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetVideoTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  const slideshowTemplates = useTemplateControllerGetSlideshowTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetSlideshowTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  const mapTemplates = useTemplateControllerGetMapTemplates({
    query: {
      staleTime: Infinity,
      retry: 0,
      queryKey: getTemplateControllerGetMapTemplatesQueryKey(),
      gcTime: Infinity,
    },
  });

  const surveyAnswers = useSurveyAnswerControllerGetSurveyAnswers({
    query: {
      staleTime: Infinity,
      retry: 0,
      queryKey: getSurveyAnswerControllerGetSurveyAnswersQueryKey(),
      gcTime: Infinity,
    },
  });

  const websiteTemplates = useTemplateControllerGetWebsiteTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetWebsiteTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  const jotformTemplates = useTemplateControllerGetJotformTemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetJotformTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );
  const documentTemplates = useTemplateControllerGetDocumenttemplates(
    {},
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getTemplateControllerGetDocumentTemplatesQueryKey(),
        gcTime: Infinity,
      },
    },
  );

  const scrollTemplates = useScrollControllerGetScrolls(
    { limit: 9999, langCode: currentLang, scope: "scroll" },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getScrollControllerGetScrollsQueryKey({ limit: 9999, langCode: currentLang, scope: "scroll" }),
        gcTime: Infinity,
      },
    },
  );

  const publicScrollTemplates = useScrollControllerGetScrolls(
    { limit: 9999, langCode: currentLang, scope: "public" },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getScrollControllerGetScrollsQueryKey({ limit: 9999, langCode: currentLang, scope: "public" }),
        gcTime: Infinity,
      },
    },
  );

  useEffect(() => {
    if (textTemplates.data) {
      setTexts(textTemplates.data);
    }
  }, [textTemplates.data, setTexts]);

  useEffect(() => {
    if (imageTemplates.data) {
      setImages(imageTemplates.data);
    }
  }, [imageTemplates.data, setImages]);

  useEffect(() => {
    if (videoTemplates.data) {
      setVideos(videoTemplates.data);
    }
  }, [videoTemplates.data, setVideos]);

  useEffect(() => {
    if (slideshowTemplates.data) {
      setSlideshows(slideshowTemplates.data);
    }
  }, [slideshowTemplates.data, setSlideshows]);

  useEffect(() => {
    if (mapTemplates.data) {
      setMaps(mapTemplates.data);
    }
  }, [mapTemplates.data, setMaps]);

  useEffect(() => {
    if (surveyAnswers.data) {
      setSurveyAnswers(surveyAnswers.data);
    }
  }, [surveyAnswers.data, setSurveyAnswers]);

  useEffect(() => {
    if (websiteTemplates.data) {
      setWebsites(websiteTemplates.data);
    }
  }, [websiteTemplates.data, setWebsites]);

  useEffect(() => {
    if (jotformTemplates.data) {
      setWebsites(jotformTemplates.data);
    }
  }, [jotformTemplates.data, setWebsites]);

  useEffect(() => {
    if (documentTemplates.data) {
      setDocuments(documentTemplates.data);
    }
  }, [documentTemplates.data, setDocuments]);

  useEffect(() => {
    if (scrollTemplates.data?.data) {
      setScrolls(scrollTemplates.data.data);
    }
  }, [scrollTemplates.data, setScrolls]);

  useEffect(() => {
    if (publicScrollTemplates.data?.data) {
      setPublicScrolls(publicScrollTemplates.data.data);
    }
  }, [publicScrollTemplates.data, setPublicScrolls]);

  return {
    isTextTemplatesLoading: textTemplates.isLoading,
    isImageTemplatesLoading: imageTemplates.isLoading,
    isVideoTemplatesLoading: videoTemplates.isLoading,
    isSlideshowTemplatesLoading: slideshowTemplates.isLoading,
    isDocumentsTemplatesLoading: documentTemplates.isLoading,
    isScrollTemplatesLoading: scrollTemplates.isLoading,
    refetchSlideshow: slideshowTemplates.refetch,
  };
};
