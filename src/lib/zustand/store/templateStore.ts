"use client";

import { create } from "zustand";
import {
  GetImageTemplateRes,
  GetMapTemplateRes,
  GetSlideshowTemplateRes,
  GetSurveyAnswerTemplateRes,
  GetTextTemplateRes,
  GetVideoTemplateRes,
} from "../../client/model";
import { persist } from "zustand/middleware";
import { GetSurveyTemplateRes } from "../../client/model/getSurveyTemplateRes";

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
  setSurveyAnswers: (surveys: GetSurveyAnswerTemplateRes[]) => void;
  surveysAnswer: GetSurveyAnswerTemplateRes[];
  addSurveyAnswer: (survey: GetSurveyAnswerTemplateRes) => void;
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
    }),
    {
      name: "templates-storage", // name of the item in the storage (must be unique)
    },
  ),
);

export default useTemplateStore;
