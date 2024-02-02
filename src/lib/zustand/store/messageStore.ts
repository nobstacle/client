"use client";

import { create } from "zustand";
import {
  ReceivedMessageContent,
  ReceivedTemplateContent,
  ReceivedType,
} from "../../../constant/types";

interface MessageState {
  receivedType: ReceivedType | null;
  receivedContent: ReceivedTemplateContent | null;
  receivedMessage: ReceivedMessageContent[];
  receivedSurvey: {
    tag: string;
    station: number;
  } | null;
  setReceivedContent: (content: ReceivedTemplateContent) => void;
  setReceivedMessage: (content: ReceivedMessageContent) => void;
  setReceivedSurvey: ({
    tag,
    station,
  }: {
    tag: string;
    station: number;
  }) => void;
  clearReceivedMessage: (id: number) => void;
  clearReceivedContent: () => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  receivedType: null,
  receivedContent: null,
  receivedSurvey: null,
  setReceivedContent: (receivedContent) =>
    set({ receivedContent, receivedType: receivedContent.type }),
  receivedMessage: [],
  setReceivedMessage: (receivedMessage) =>
    set({
      receivedMessage: [...get().receivedMessage, receivedMessage],
      receivedType: receivedMessage.type,
    }),
  setReceivedSurvey: (receivedSurvey) =>
    set({
      receivedSurvey: receivedSurvey,
      receivedType: "Survey",
    }),
  clearReceivedMessage: (station: number) => {
    set({
      receivedMessage: get().receivedMessage.filter(
        (id) => id.station !== station,
      ),
    });
  },
  clearReceivedContent: () => {
    set({ receivedContent: null });
  },
}));
