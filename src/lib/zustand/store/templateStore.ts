"use client";

import { create } from "zustand";
import {
  GetImageTemplateRes,
  GetMapTemplateRes,
  GetSlideshowTemplateRes,
  GetSurveyAnswerTemplateRes,
  GetTextTemplateRes,
  GetVideoTemplateRes,
  GetWebsiteTemplateRes,
  GetDocumentTemplateRes
} from "../../client/model";
import { persist } from "zustand/middleware";

interface BearState {
  searchTexts: GetTextTemplateRes[];
  setSearchTexts: (text: GetTextTemplateRes[]) => void;
  searchImages: GetImageTemplateRes[];
  setSearchImages: (images: GetImageTemplateRes[]) => void;
  searchVideos: GetVideoTemplateRes[];
  setSearchVideos: (videos: GetVideoTemplateRes[]) => void;
  searchSlideshows: GetSlideshowTemplateRes[];
  setSearchSlideshows: (slideshows: GetSlideshowTemplateRes[]) => void;
  searchMaps: GetMapTemplateRes[];
  setSearchMaps: (maps: GetMapTemplateRes[]) => void;
  searchSurveysAnswers: GetSurveyAnswerTemplateRes[];
  setSearchSurveysAnswers: (
    surveysAnswers: GetSurveyAnswerTemplateRes[],
  ) => void;
  texts: GetTextTemplateRes[];
  setTexts: (text: GetTextTemplateRes[]) => void;
  images: GetImageTemplateRes[];
  setImages: (image: GetImageTemplateRes[]) => void;
  videos: GetVideoTemplateRes[];
  setVideos: (video: GetVideoTemplateRes[]) => void;
  slideshows: GetSlideshowTemplateRes[];
  setSlideshows: (slideshows: GetSlideshowTemplateRes[]) => void;
  maps: GetMapTemplateRes[];
  setMaps: (maps: GetMapTemplateRes[]) => void;
  websites: GetWebsiteTemplateRes[];
  setWebsites: (websites: GetWebsiteTemplateRes[]) => void;
  searchWebsites: GetWebsiteTemplateRes[];
  setSearchWebsites: (Website: GetWebsiteTemplateRes[]) => void;
  setSurveyAnswers: (surveys: GetSurveyAnswerTemplateRes[]) => void;
  surveysAnswer: GetSurveyAnswerTemplateRes[];
  addSurveyAnswer: (survey: GetSurveyAnswerTemplateRes) => void;
  documents: GetDocumentTemplateRes[];
  setDocuments: (documents: any[]) => void;
  searchDocuments: any[];
  setSearchDocuments: (documents: any[]) => void;
  // Add package-related state
  packages: any[];
  setPackages: (packages: any[]) => void;
  searchPackages: any[];
  setSearchPackages: (packages: any[]) => void;
}

const useTemplateStore = create<BearState>()(
  persist(
    (set, get) => ({
      searchTexts: [],
      setSearchTexts: (searchTexts) => set(() => ({ searchTexts })),
      searchImages: [],
      setSearchImages: (searchImages) => set(() => ({ searchImages })),
      searchVideos: [],
      setSearchVideos: (searchVideos) => set(() => ({ searchVideos })),
      searchSlideshows: [],
      setSearchSlideshows: (searchSlideshows) =>
        set(() => ({ searchSlideshows })),
      searchMaps: [],
      setSearchMaps: (searchMaps) => set(() => ({ searchMaps })),
      searchSurveysAnswers: [],
      setSearchSurveysAnswers: (searchSurveysAnswers) =>
        set(() => ({ searchSurveysAnswers })),
      texts: [],
      setTexts: (texts) => set(() => ({ texts })),
      images: [],
      setImages: (images) => set(() => ({ images })),
      videos: [],
      setVideos: (videos) => set(() => ({ videos })),
      slideshows: [],
      setSlideshows: (slideshows) => set(() => ({ slideshows })),
      maps: [],
      setMaps: (maps) => set(() => ({ maps })),
      surveysAnswer: [],
      setSurveyAnswers: (surveysAnswer) => set(() => ({ surveysAnswer })),
      addSurveyAnswer: (surveyAnswer) =>
        set((store) => ({
          surveysAnswer: [surveyAnswer, ...store.surveysAnswer],
        })),
      websites: [],
      setWebsites: (websites) => set(() => ({ websites })),
      searchWebsites: [],
      setSearchWebsites: (searchWebsites) => set(() => ({ searchWebsites })),
      documents: [],
      setDocuments: (documents) => set(() => ({ documents })),
      searchDocuments: [],
      setSearchDocuments: (searchDocuments) => set(() => ({ searchDocuments })),
      // Add package-related implementations
      packages: [],
      setPackages: (packages) => set(() => ({ packages })),
      searchPackages: [],
      setSearchPackages: (searchPackages) => set(() => ({ searchPackages })),
    }),
    {
      name: "templates-storage", // name of the item in the storage (must be unique)
    },
  ),
);

export default useTemplateStore;