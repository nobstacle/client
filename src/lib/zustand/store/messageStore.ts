"use client";

import { create } from "zustand";
import {
  ReceivedMessageContent,
  ReceivedTemplateContent,
  ReceivedType,
  ReceivedResponseType
} from "../../../constant/types";

interface MessageState {
  receivedType: ReceivedType | null;
  receivedContent: ReceivedTemplateContent | null;
  receivedMessage: ReceivedMessageContent[];
  receivedSurvey: {
    tag: string;
    station: number;
  } | null;
  receivedLangCode: string | null;
  receivedResponse: ReceivedResponseType | null;
  setReceivedContent: (content: ReceivedTemplateContent) => void;
  setReceivedMessage: (content: ReceivedMessageContent) => void;
  setReceivedSurvey: (survey: { tag: string; station: number }) => void;
  setReceivedLangCode: (langCode: string) => void;
  setReceivedResponse: (response: ReceivedResponseType) => void;
  clearReceivedMessage: (station: number) => void;
  clearReceivedContent: () => void;
  clearReceivedResponse: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  receivedType: null,
  receivedContent: null,
  receivedMessage: [],
  receivedSurvey: null,
  receivedLangCode: null,
  receivedResponse: null,

  setReceivedContent: (receivedContent) =>
    set({ receivedContent, receivedType: receivedContent.type }),

  setReceivedMessage: (receivedMessage) =>
    set({
      receivedMessage: [...get().receivedMessage, receivedMessage],
      receivedType: receivedMessage.type,
    }),

  setReceivedSurvey: (receivedSurvey) =>
    set({
      receivedSurvey,
      receivedType: "Survey",
    }),

  setReceivedLangCode: (langCode) =>
    set({
      receivedLangCode: langCode,
    }),

  setReceivedResponse: (receivedResponse) =>
    set({
      receivedResponse,
    }),

  clearReceivedMessage: (station: number) => {
    set({
      receivedMessage: get().receivedMessage.filter(
        (msg) => msg.station !== station
      ),
    });
  },

  clearReceivedContent: () => {
    set({ receivedContent: null });
  },

  clearReceivedResponse: () => {
    set({ receivedResponse: null });
  },

  reset: () =>
    set({
      receivedType: null,
      receivedContent: null,
      receivedMessage: [],
      receivedSurvey: null,
      receivedLangCode: null,
      receivedResponse: null,
    }),
}));
