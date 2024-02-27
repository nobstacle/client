import { useEffect, useRef } from "react";
import {
  getTemplateControllerGetImageTemplatesQueryKey,
  getTemplateControllerGetMapTemplatesQueryKey,
  getTemplateControllerGetSlideshowTemplatesQueryKey,
  getTemplateControllerGetTextTemplatesQueryKey,
  getTemplateControllerGetVideoTemplatesQueryKey,
  useTemplateControllerGetImageTemplates,
  useTemplateControllerGetMapTemplates,
  useTemplateControllerGetSlideshowTemplates,
  useTemplateControllerGetTextTemplates,
  useTemplateControllerGetVideoTemplates,
  useSurveyAnswerControllerGetSurveyAnswers,
  getSurveyAnswerControllerGetSurveyAnswersQueryKey,
  useTemplateControllerGetWebsiteTemplates,
  getTemplateControllerGetWebsiteTemplatesQueryKey,
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

  return {
    isTextTemplatesLoading: textTemplates.isLoading,
    isImageTemplatesLoading: imageTemplates.isLoading,
    isVideoTemplatesLoading: videoTemplates.isLoading,
    isSlideshowTemplatesLoading: slideshowTemplates.isLoading,
    refetchSlideshow: slideshowTemplates.refetch,
  };
};
