import { useEffect, useMemo } from "react";
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
  useTemplateControllerGetDocumenttemplates,
  getTemplateControllerGetDocumentTemplatesQueryKey,
  useScrollControllerGetScrolls,
} from "../lib/client/api";
import useTemplateStore from "../lib/zustand/store/templateStore";
import {
  HEADER_CATALOG_KINDS,
  isHeaderCatalogKind,
  type TemplateKind,
} from "./templateKinds";

const templateQueryDefaults = {
  staleTime: Infinity,
  retry: 0,
  gcTime: Infinity,
} as const;

export const useFetchTemplates = (enabledKinds: Set<TemplateKind>) => {
  const searchParams = useSearchParams();
  const currentLang = searchParams.get("lang") || undefined;
  const isEnabled = (kind: TemplateKind) => enabledKinds.has(kind);

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
        ...templateQueryDefaults,
        enabled: isEnabled("text"),
        queryKey: getTemplateControllerGetTextTemplatesQueryKey(),
      },
    },
  );

  const imageTemplates = useTemplateControllerGetImageTemplates(
    {},
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("image"),
        queryKey: getTemplateControllerGetImageTemplatesQueryKey(),
      },
    },
  );

  const videoTemplates = useTemplateControllerGetVideoTemplates(
    {},
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("video"),
        queryKey: getTemplateControllerGetVideoTemplatesQueryKey(),
      },
    },
  );

  const slideshowTemplates = useTemplateControllerGetSlideshowTemplates(
    {},
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("slideshow"),
        queryKey: getTemplateControllerGetSlideshowTemplatesQueryKey(),
      },
    },
  );

  const mapTemplates = useTemplateControllerGetMapTemplates({
    query: {
      ...templateQueryDefaults,
      enabled: isEnabled("map"),
      queryKey: getTemplateControllerGetMapTemplatesQueryKey(),
    },
  });

  const surveyAnswers = useSurveyAnswerControllerGetSurveyAnswers({
    query: {
      ...templateQueryDefaults,
      enabled: isEnabled("survey"),
      queryKey: getSurveyAnswerControllerGetSurveyAnswersQueryKey(),
    },
  });

  const websiteTemplates = useTemplateControllerGetWebsiteTemplates(
    {},
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("website"),
        queryKey: getTemplateControllerGetWebsiteTemplatesQueryKey(),
      },
    },
  );

  const documentTemplates = useTemplateControllerGetDocumenttemplates(
    {},
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("document"),
        queryKey: getTemplateControllerGetDocumentTemplatesQueryKey(),
      },
    },
  );

  const scrollTemplates = useScrollControllerGetScrolls(
    { limit: 9999, langCode: currentLang, scope: "scroll" },
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("scroll"),
        queryKey: getScrollControllerGetScrollsQueryKey({
          limit: 9999,
          langCode: currentLang,
          scope: "scroll",
        }),
      },
    },
  );

  const publicScrollTemplates = useScrollControllerGetScrolls(
    { limit: 9999, langCode: currentLang, scope: "public" },
    {
      query: {
        ...templateQueryDefaults,
        enabled: isEnabled("publicScroll"),
        queryKey: getScrollControllerGetScrollsQueryKey({
          limit: 9999,
          langCode: currentLang,
          scope: "public",
        }),
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

  const queriesByKind = useMemo(
    (): Record<TemplateKind, { isLoading: boolean; isFetched: boolean }> => ({
      text: textTemplates,
      image: imageTemplates,
      video: videoTemplates,
      slideshow: slideshowTemplates,
      map: mapTemplates,
      website: websiteTemplates,
      document: documentTemplates,
      scroll: scrollTemplates,
      publicScroll: publicScrollTemplates,
      survey: surveyAnswers,
    }),
    [
      textTemplates,
      imageTemplates,
      videoTemplates,
      slideshowTemplates,
      mapTemplates,
      websiteTemplates,
      documentTemplates,
      scrollTemplates,
      publicScrollTemplates,
      surveyAnswers,
    ],
  );

  const activeHeaderKinds = useMemo(
    () => HEADER_CATALOG_KINDS.filter((kind) => enabledKinds.has(kind)),
    [enabledKinds],
  );

  const isHeaderCatalogLoading =
    activeHeaderKinds.length > 0 &&
    activeHeaderKinds.some((kind) => queriesByKind[kind].isLoading);

  const isHeaderCatalogReady =
    activeHeaderKinds.length === 0 ||
    activeHeaderKinds.every((kind) => queriesByKind[kind].isFetched);

  return {
    isTextTemplatesLoading: textTemplates.isLoading,
    isImageTemplatesLoading: imageTemplates.isLoading,
    isVideoTemplatesLoading: videoTemplates.isLoading,
    isSlideshowTemplatesLoading: slideshowTemplates.isLoading,
    isDocumentsTemplatesLoading: documentTemplates.isLoading,
    isScrollTemplatesLoading: scrollTemplates.isLoading,
    isHeaderCatalogLoading,
    isHeaderCatalogReady,
    refetchSlideshow: slideshowTemplates.refetch,
  };
};

export { isHeaderCatalogKind, HEADER_CATALOG_KINDS };
