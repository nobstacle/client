import { useEffect, useRef } from "react";
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
    { limit: 9999 },
    {
      query: {
        staleTime: Infinity,
        retry: 0,
        queryKey: getScrollControllerGetScrollsQueryKey({ limit: 9999 }),
        gcTime: Infinity,
      },
    },
  );

  useEffect(() => {
    if (textTemplates.isSuccess) {
      setTexts(textTemplates.data);
    }
  }, [textTemplates.isSuccess]);

  useEffect(() => {
    if (imageTemplates.isSuccess) {
      setImages(imageTemplates.data);
    }
  }, [imageTemplates.isSuccess]);

  useEffect(() => {
    if (videoTemplates.isSuccess) {
      setVideos(videoTemplates.data);
    }
  }, [videoTemplates.isSuccess]);

  useEffect(() => {
    if (slideshowTemplates.isSuccess || slideshowTemplates.isRefetching) {
      if (slideshowTemplates.data) {
        setSlideshows(slideshowTemplates.data);
      }
    }
  }, [slideshowTemplates.isSuccess, slideshowTemplates.isRefetching]);

  useEffect(() => {
    if (mapTemplates.isSuccess || mapTemplates.isRefetching) {
      if (mapTemplates.data) {
        setMaps(mapTemplates.data);
      }
    }
  }, [mapTemplates.isSuccess, mapTemplates.isRefetching]);

  useEffect(() => {
    if (mapTemplates.isSuccess || mapTemplates.isRefetching) {
      if (mapTemplates.data) {
        setMaps(mapTemplates.data);
      }
    }
  }, [mapTemplates.isSuccess, mapTemplates.isRefetching]);

  useEffect(() => {
    if (surveyAnswers.isSuccess || surveyAnswers.isRefetching) {
      if (surveyAnswers.data) {
        setSurveyAnswers(surveyAnswers.data);
      }
    }
  }, [surveyAnswers.isSuccess, surveyAnswers.isRefetching]);

  useEffect(() => {
    if (websiteTemplates.isSuccess) {
      setWebsites(websiteTemplates.data);
    }
  }, [websiteTemplates.isSuccess]);

  useEffect(() => {
    if (jotformTemplates.isSuccess) {
      setWebsites(jotformTemplates.data);
    }
  }, [jotformTemplates.isSuccess]);

  useEffect(() => {
    if (documentTemplates.isSuccess) {
      setDocuments(documentTemplates.data);
    }
  }, [documentTemplates.isSuccess]);

  useEffect(() => {
    if (scrollTemplates.isSuccess) {
      if (scrollTemplates.data?.data) {
        setScrolls(scrollTemplates.data.data);
      }
    }
  }, [scrollTemplates.isSuccess]);

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
