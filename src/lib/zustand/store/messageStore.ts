"use client";

import { create } from "zustand";
import {
  ReceivedMessageContent,
  ReceivedTemplateContent,
  ReceivedType,
  ReceivedResponseType
} from "../../../constant/types";

interface MessageState {
  activeStation: number;
  receivedType: ReceivedType | null;
  receivedContent: ReceivedTemplateContent | null;
  receivedContentByStation: Record<number, ReceivedTemplateContent | null>;
  receivedTypeByStation: Record<number, ReceivedType | null>;
  receivedMessage: ReceivedMessageContent[];
  receivedSurvey: {
    tag: string;
    station: number;
  } | null;
  receivedSurveyByStation: Record<number, { tag: string; station: number } | null>;
  receivedRecording: any;
  receivedRecordingByStation: Record<number, any>;
  receivedLangCode: string | null;
  receivedLangCodeByStation: Record<number, string | null>;
  receivedResponse: ReceivedResponseType | null;
  setReceivedContent: (content: ReceivedTemplateContent) => void;
  setReceivedMessage: (content: ReceivedMessageContent) => void;
  setReceivedSurvey: (survey: { tag: string; station: number }) => void;
  setReceivedRecording: (data: any) => void;
  setReceivedLangCode: (langCode: string, station?: number) => void;
  setReceivedResponse: (response: ReceivedResponseType) => void;
  clearReceivedMessage: (station: number) => void;
  clearReceivedContent: (station?: number) => void;
  clearReceivedResponse: () => void;
  clearReceivedRecording: (station?: number) => void;
  activateStation: (station: number) => void;
  reset: () => void;
}

// Cap the in-memory chat history. Without this the array grows on every
// incoming socket message for the lifetime of the tab, and because heavy
// components (ClientHeader, chatBot) filter this array on every render the
// whole UI gets progressively slower the longer a station stays open.
const MAX_RECEIVED_MESSAGES = 300;

const contentStation = (content: { station?: number } | null | undefined): number | null => {
  const n = Number(content?.station);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
};

export const useMessageStore = create<MessageState>((set, get) => ({
  activeStation: 1,
  receivedType: null,
  receivedContent: null,
  receivedContentByStation: {},
  receivedTypeByStation: {},
  receivedMessage: [],
  receivedSurvey: null,
  receivedSurveyByStation: {},
  receivedLangCode: null,
  receivedLangCodeByStation: {},
  receivedResponse: null,
  receivedRecording: null,
  receivedRecordingByStation: {},

  activateStation: (station: number) => {
    const n = Number(station);
    if (!Number.isFinite(n) || n < 1) return;
    const state = get();
    set({
      activeStation: n,
      receivedContent: state.receivedContentByStation[n] ?? null,
      receivedType: state.receivedTypeByStation[n] ?? null,
      receivedSurvey: state.receivedSurveyByStation[n] ?? null,
      receivedRecording: state.receivedRecordingByStation[n] ?? null,
      receivedLangCode: state.receivedLangCodeByStation[n] ?? state.receivedLangCode,
    });
  },

  setReceivedContent: (receivedContent) => {
    const station = contentStation(receivedContent) ?? get().activeStation;
    const nextType = receivedContent.type;
    const state = get();
    set({
      receivedContentByStation: {
        ...state.receivedContentByStation,
        [station]: receivedContent,
      },
      receivedTypeByStation: {
        ...state.receivedTypeByStation,
        [station]: nextType,
      },
      ...(station === state.activeStation
        ? { receivedContent, receivedType: nextType }
        : {}),
    });
  },

  setReceivedMessage: (receivedMessage) =>
    set(() => {
      const next = [...get().receivedMessage, receivedMessage];
      return {
        receivedMessage:
          next.length > MAX_RECEIVED_MESSAGES
            ? next.slice(next.length - MAX_RECEIVED_MESSAGES)
            : next,
        receivedType: receivedMessage.type,
      };
    }),

  setReceivedSurvey: (receivedSurvey) => {
    const station = contentStation(receivedSurvey) ?? get().activeStation;
    const state = get();
    set({
      receivedSurveyByStation: {
        ...state.receivedSurveyByStation,
        [station]: receivedSurvey,
      },
      ...(station === state.activeStation
        ? { receivedSurvey, receivedType: "Survey" as ReceivedType }
        : {}),
    });
  },

  setReceivedRecording: (receivedRecording) => {
    const station = contentStation(receivedRecording) ?? get().activeStation;
    const state = get();
    set({
      receivedRecordingByStation: {
        ...state.receivedRecordingByStation,
        [station]: receivedRecording,
      },
      ...(station === state.activeStation
        ? { receivedRecording, receivedType: "Recording" as ReceivedType }
        : {}),
    });
  },
    
  setReceivedLangCode: (langCode, station) => {
    const target = station ?? get().activeStation;
    const state = get();
    set({
      receivedLangCodeByStation: {
        ...state.receivedLangCodeByStation,
        [target]: langCode,
      },
      ...(target === state.activeStation ? { receivedLangCode: langCode } : {}),
    });
  },

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

  clearReceivedContent: (station?: number) => {
    const target = station ?? get().activeStation;
    const state = get();
    set({
      receivedContentByStation: {
        ...state.receivedContentByStation,
        [target]: null,
      },
      receivedTypeByStation: {
        ...state.receivedTypeByStation,
        [target]: null,
      },
      ...(target === state.activeStation
        ? { receivedContent: null, receivedType: null }
        : {}),
    });
  },

  clearReceivedResponse: () => {
    set({ receivedResponse: null });
  },

  clearReceivedRecording: (station?: number) => {
    const target = station ?? get().activeStation;
    const state = get();
    set({
      receivedRecordingByStation: {
        ...state.receivedRecordingByStation,
        [target]: null,
      },
      ...(target === state.activeStation ? { receivedRecording: null } : {}),
    });
  },

  reset: () =>
    set({
      receivedType: null,
      receivedContent: null,
      receivedContentByStation: {},
      receivedTypeByStation: {},
      receivedMessage: [],
      receivedSurvey: null,
      receivedSurveyByStation: {},
      receivedLangCode: null,
      receivedLangCodeByStation: {},
      receivedResponse: null,
      receivedRecording: null,
      receivedRecordingByStation: {},
    }),
}));
