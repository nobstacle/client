"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import React, {  createContext, useContext, useEffect, useState, useCallback, useRef  } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Socket } from "socket.io-client";
import socket from "../lib/socket/init";
import {
  CleanMessagesPayloadType,
  ReceivedMessageContent,
  ReceivedTemplateContent,
  SendMessagePayloadType,
  SendSurveyMessagePayloadType,
  SendSurveyPayloadType,
  SendRecordingPayloadType,
  SendTemplatePayloadType,
  SendLangCodeMessagePayloadType,
  SendJotFormTemplate,
  ReceivedResponseType,

} from "../constant/types";
import { useMessageStore } from "../lib/zustand/store/messageStore";
import useTemplateStore from "../lib/zustand/store/templateStore";
import { SendPackagePayloadType, ReceivedPackageContent, ReceivedUpsellPackageContent } from "../constant/types";
import { notification } from 'antd';
import useCompanyStore from "../lib/zustand/store/companyStore";
import { getCompanyControllerGetCompanyQueryKey } from "../lib/client/api";
import {
  persistActiveStation,
  resolveActiveStation,
  STATION_CHANGED_EVENT,
} from "../utils/station";

// Add document-related types
export interface SendDocumentPayloadType {
  refId: number;
  langCode: string;
  refType: string;
  station: number;
  contentExtra?: string;
  directContent?: string;
}

export interface ReceivedDocumentContent {
  id: number;
  tag: string;
  url: string;
  ext: string;
  langCode: string[];
  station: number;
  timestamp?: string;
}

// Add information update types
export interface SendInformationUpdatePayloadType {
  refId: number;
  langCode: string;
  refType: string;
  station: number;
  contentExtra?: string;
}

export interface ReceivedInformationContent {
  id: number;
  tag: string;
  url?: string;
  ext?: string;
  langCode: string[];
  station: number;
  timestamp?: string;
  content?: string;
  title?: string;
}

export const SocketContext = createContext<{
  socket: undefined | Socket<any, any>;
  emitSendTemplate: (data: SendTemplatePayloadType) => void;
  emitSendDocument: (data: SendDocumentPayloadType, callback?: (response: any) => void) => void;
  emitSendTeamDocument: (data: SendDocumentPayloadType, callback?: (response: any) => void) => void;
  emitSendJotForm: (data: SendJotFormTemplate, callback?: (response: any) => void) => void;
  emitSendMessage: (data: SendMessagePayloadType) => void;
  emitClearMessage: (data: CleanMessagesPayloadType) => void;
  emitLeaveChat: (data: CleanMessagesPayloadType) => void;
  emitSendSurveyAnswer: (data: SendSurveyMessagePayloadType) => void;
  emitSendSurvey: (data: SendSurveyPayloadType) => void;
  emitSendRecording: (data: SendRecordingPayloadType) => void;
  emitSendLangCode: (data: SendLangCodeMessagePayloadType) => void;
  emitUpdateInformation: (data: SendInformationUpdatePayloadType, callback?: (response: any) => void) => void;
  emitSendPackages: (data: SendPackagePayloadType, callback?: (response: any) => void) => void;
  socketConnected: boolean;
} | null>(null);

export const useSocketContext = () => {
  const socketContext = useContext(SocketContext);

  if (!socketContext) {
    throw new Error(
      "useSocketContext has to be used within <SocketContext.Provider>",
    );
  }

  return socketContext;
};

export const SocketContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [socketClient, setSocketClient] = useState<Socket<any, any>>();
  const [socketConnected, setSocketConnected] = useState(false);
  const setReceivedContent = useMessageStore((s) => s.setReceivedContent);
  const setReceivedMessage = useMessageStore((s) => s.setReceivedMessage);
  const clearReceivedMessage = useMessageStore((s) => s.clearReceivedMessage);
  const setReceivedSurvey = useMessageStore((s) => s.setReceivedSurvey);
  const setReceivedLangCode = useMessageStore((s) => s.setReceivedLangCode);
  const setReceivedRecording = useMessageStore((s) => s.setReceivedRecording);
  const setReceivedResponse = useMessageStore((s) => s.setReceivedResponse);

  const { addSurveyAnswer } = useTemplateStore();
  const { setCompany } = useCompanyStore();
  const queryClient = useQueryClient();

  const session = useSession();
  const params = useSearchParams();
  const activateStation = useMessageStore((s) => s.activateStation);
  const activeStationRef = useRef<number>(1);
  const lastJoinedStationRef = useRef<number | null>(null);

  // Initialize the socket once a token is available, and clean it up when the token goes away (logout)
  useEffect(() => {
    if (!session.data?.user.backendTokens.at) {
      setSocketClient(undefined);
      setSocketConnected(false);
      return;
    }

    const socketC = socket(session.data?.user.backendTokens.at);
    setSocketClient(socketC);
    socketC.connect();

    socketC.on("connect", () => {
      setSocketConnected(true);
      const station = resolveActiveStation({
        searchParams: params,
        sessionStation: session.data?.user?.stationNo,
      });
      activeStationRef.current = station;
      persistActiveStation(station);
      socketC.emit("join-chat", { station });
      lastJoinedStationRef.current = station;
      activateStation(station);
    });

    socketC.on("disconnect", (reason) => {
      setSocketConnected(false);
      // Auto reconnect unless server explicitly closed it
      if (reason === "io server disconnect") {
        socketC.connect();
      }
    });

    return () => {
      socketC.removeAllListeners();
      socketC.disconnect();
    };
  }, [!!session.data?.user.backendTokens.at]);

  // Keep token up-to-date and reconnect if token changes/refreshes
  useEffect(() => {
    const token = session.data?.user.backendTokens.at;
    if (socketClient && token) {
      socketClient.auth = { token };
      if (!socketClient.connected) {
        console.log("🔌 Reconnecting socket with updated token...");
        socketClient.connect();
      }
    }
  }, [session.data?.user.backendTokens.at, socketClient]);

  // Handle visibility and focus changes (e.g. tablet waking up from sleep)
  useEffect(() => {
    if (!socketClient) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !socketClient.connected) {
        console.log("🔌 Visibility change to visible, reconnecting socket...");
        socketClient.connect();
      }
    };

    const handleFocus = () => {
      if (!socketClient.connected) {
        console.log("🔌 Window focused, reconnecting socket...");
        socketClient.connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [socketClient]);

  const getActiveStation = useCallback((): number => {
    return resolveActiveStation({
      searchParams: params,
      sessionStation: session.data?.user?.stationNo,
    });
  }, [params, session.data?.user?.stationNo]);

  const isTargetStation = useCallback((targetStation?: number | string | null): boolean => {
    // Content without a station is not applied to a display — otherwise
    // station 2/3 would show station 1 leftovers or unscoped payloads.
    if (targetStation === undefined || targetStation === null || targetStation === "") {
      return false;
    }
    const parsed = Number(targetStation);
    if (!Number.isFinite(parsed) || parsed < 1) return false;
    return parsed === activeStationRef.current;
  }, []);

  const stampStation = useCallback(<T extends { station?: number }>(data: T): T => {
    return {
      ...data,
      station: activeStationRef.current,
    };
  }, []);

  // Socket event handlers
  const onConnect = () => {
    socketClient?.emit("join-chat", {
      station: getActiveStation(),
    });
    setSocketConnected(true);
  };

  const onDisconnect = () => {
    setSocketConnected(false);
  };

  const onReceivedTemplate = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) return;
      const parsedData = parsedRes.data as ReceivedTemplateContent;
      if (!isTargetStation(parsedData?.station)) return;
      setReceivedContent(parsedData);
    } catch (error) {
      console.error("❌ Error parsing template response:", error);
    }
  };

  const onReceivedDocument = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ Document response has error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedDocumentContent;
      if (!isTargetStation(parsedData?.station)) return;
      setReceivedContent(parsedData);

    } catch (error) {
      console.error("❌ Error parsing document response:", error);
    }
  };

  const onReceivedTeamDocument = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ Team document response has error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedDocumentContent;
      if (!isTargetStation(parsedData?.station)) return;
      setReceivedContent(parsedData);

    } catch (error) {
      console.error("❌ Error parsing team document response:", error);
    }
  };

  const onInformationUpdated = (data: any) => {
    try {
      let parsedData;

      if (typeof data === 'string') {
        parsedData = JSON.parse(data);
      } else {
        parsedData = data; // Already an object
      }

      if (parsedData.status === 400) {
        console.warn("⚠️ Information update response has error:", parsedData);
        return;
      }

      // Handle the new structure from backend
      const { action, data: informationData, timestamp, deletedId } = parsedData;

      // Update your state based on the action
      switch (action) {
        case 'created':
        case 'updated':
        case 'deleted':
        default:
          if (informationData) {
            const info = informationData as ReceivedInformationContent;
            if (info.station != null && !isTargetStation(info.station)) return;
            setReceivedContent(info);
          }
          break;
      }

    } catch (error) {
      console.error("❌ Error parsing information update response:", error);
      console.error("❌ Raw data that caused error:", data);
    }
  };

  const onReceivedMessage = (data: any) => {
    try {
      const parsedData = JSON.parse(data).data as ReceivedMessageContent;
      if (!isTargetStation(parsedData?.station)) return;

      let role = session.data?.user?.Roles?.[0];

      if (role === "Admin" || role === "Staff") {
        setReceivedMessage(parsedData);
      } else {
        setReceivedMessage(parsedData);
      }
    } catch (error) {
      console.error("❌ Error parsing message response:", error);
    }
  };

  const onReceivedSurveyAnswer = (data: any) => {

    try {
      const parsedData = JSON.parse(data).data as {
        id: number;
        createdAt: string;
        updatedAt: string;
        stationNo: number;
        value: number;
        tag: string;
        userId: number;
        User: {
          id: number;
          firstName: string | null;
          lastName: string | null;
          email: string;
        } | null;
      };

      if (!isTargetStation(parsedData?.stationNo)) return;

      addSurveyAnswer(parsedData);
    } catch (error) {
      console.error("❌ Error parsing survey answer response:", error);
    }
  };

  const onReceivedSurvey = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) return;
      const parsedData = parsedRes.data as {
        tag: string;
        station: number;
      };
      if (!isTargetStation(parsedData?.station)) return;

      setReceivedSurvey(parsedData);
    } catch (error) {
      console.error("❌ Error parsing survey response:", error);
    }
  };

  const onReceivedLangCode = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) return;
      const parsedData = parsedRes.data as {
        station: number;
        langCode: string;
      };
      if (!isTargetStation(parsedData?.station)) return;

      setReceivedLangCode(parsedData.langCode, parsedData.station);
      localStorage.setItem("lang-code", parsedData.langCode);
    } catch (error) {
      console.error("❌ Error parsing lang code response:", error);
    }
  };

  const onReceivedCleanMessages = (data: any) => {
    try {
      const parsedData = JSON.parse(data).data as {
        station: number;
        success: true;
      };
      if (!isTargetStation(parsedData?.station)) return;

      clearReceivedMessage(parsedData.station);
    } catch (error) {
      console.error("❌ Error parsing clean messages response:", error);
    }
  };

  const onReceivedJotForm = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ JotForm response has error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedTemplateContent;
      if (!isTargetStation(parsedData?.station)) return;

      setReceivedContent(parsedData);

    } catch (error) {
      console.error("❌ Error parsing JotForm response:", error);
    }
  };

  const onReceivedRecording = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) return;
      const parsedData = parsedRes.data as SendRecordingPayloadType;
      if (!isTargetStation(parsedData?.station)) return;
      setReceivedRecording(parsedData);
    } catch (error) {
      console.error("❌ Error parsing template response:", error);
    }
  }

  const onCompanyFeatureFlagsUpdated = (payload: any) => {
    try {
      const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
      const company = parsedPayload?.company ?? parsedPayload;

      if (!company) {
        return;
      }

      setCompany(company);
      queryClient.setQueryData(getCompanyControllerGetCompanyQueryKey(), company);
    } catch (error) {
      console.error("❌ Error parsing company update response:", error);
    }
  };

const onDataSubmitted = (data: any) => {
    try {
        // Handle both string and object
        const parsedRes = typeof data === 'string' ? JSON.parse(data) : data;
        
        if (parsedRes?.status === 400) {
            console.warn("⚠️ JotForm data error:", parsedRes);
            return;
        }


        const formId = parsedRes?.formId || parsedRes?.data?.formId;
        const responseData = parsedRes?.data || parsedRes;

        setReceivedResponse({ 
            ...responseData,
            formId  
        } as ReceivedResponseType);

        // notification.success({
        //     message: 'Form Submitted',
        //     description: 'A guest has submitted a form.',
        //     placement: 'topRight',
        //     duration: 3,
        // });

    } catch (error) {
        console.error("❌ Failed to handle dataSaved event:", error);
    }
};

  const onSubmittedRecordings = (data: any) => {
    try {

      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

      setReceivedRecording(parsedData);
    } catch (error) {
      console.error("❌ Failed to parse recording data:", error);
    }
  };

  // Setup socket event listeners
  useEffect(() => {
    if (!socketClient) return;

    socketClient.on("disconnect", onDisconnect);
    socketClient.on("user-joined", onConnect);
    socketClient.on("received-template", onReceivedTemplate);
    socketClient.on("received-document", onReceivedDocument);
    socketClient.on("received-message", onReceivedMessage);
    socketClient.on("received-clean-messages", onReceivedCleanMessages);
    socketClient.on("received-survey", onReceivedSurvey);
    socketClient.on("received-survey-answer", onReceivedSurveyAnswer);
    socketClient.on("received-lang-code", onReceivedLangCode);
    socketClient.on("received-recording", onReceivedRecording);
    socketClient.on("jotForm-sent-successfully", onReceivedJotForm);
    socketClient.on("dataSaved", onDataSubmitted);
    socketClient.on("document-sent-successfully", onReceivedDocument);
    socketClient.on("team-document-sent-successfully", onReceivedTeamDocument);
    socketClient.on("information-updated", onInformationUpdated);
    socketClient.on("company-feature-flags-updated", onCompanyFeatureFlagsUpdated);
    socketClient.on("received-packages", onReceivedPackages);
    socketClient.on("received-upsell-transaction", onRecievedUpsellPackage);
    socketClient.on("recordingSaved", onSubmittedRecordings);

    return () => {
      socketClient.off("disconnect", onDisconnect);
      socketClient.off("user-joined", onConnect);
      socketClient.off("received-template", onReceivedTemplate);
      socketClient.off("received-document", onReceivedDocument);
      socketClient.off("received-message", onReceivedMessage);
      socketClient.off("received-clean-messages", onReceivedCleanMessages);
      socketClient.off("received-survey", onReceivedSurvey);
      socketClient.off("received-survey-answer", onReceivedSurveyAnswer);
      socketClient.off("received-lang-code", onReceivedLangCode);
      socketClient.off("jotForm-sent-successfully", onReceivedJotForm);
      socketClient.off("dataSaved", onDataSubmitted);
      socketClient.off("document-sent-successfully", onReceivedDocument);
      socketClient.off("team-document-sent-successfully", onReceivedTeamDocument);
      socketClient.off("information-updated", onInformationUpdated);
      socketClient.off("company-feature-flags-updated", onCompanyFeatureFlagsUpdated);
      socketClient.off("received-packages", onReceivedPackages);
      socketClient.off("received-upsell-transaction", onRecievedUpsellPackage);
      socketClient.off("received-recording", onReceivedRecording);
      socketClient.off("recordingSaved", onSubmittedRecordings);
    };
  }, [socketClient]);

  const joinActiveStation = useCallback(() => {
    const current = getActiveStation();
    activeStationRef.current = current;
    persistActiveStation(current);
    activateStation(current);

    if (!socketClient?.connected) return;

    if (lastJoinedStationRef.current !== null && lastJoinedStationRef.current !== current) {
      socketClient.emit("leave-chat", {
        station: lastJoinedStationRef.current,
      });
    }
    socketClient.emit("join-chat", {
      station: current,
    });
    lastJoinedStationRef.current = current;
  }, [socketClient, getActiveStation, activateStation]);

  useEffect(() => {
    activeStationRef.current = getActiveStation();
    persistActiveStation(activeStationRef.current);
    activateStation(activeStationRef.current);
  }, [getActiveStation, activateStation]);

  useEffect(() => {
    joinActiveStation();
  }, [joinActiveStation]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStationChanged = (event: Event) => {
      const detailStation = Number((event as CustomEvent)?.detail?.station);
      if (Number.isFinite(detailStation) && detailStation > 0) {
        activeStationRef.current = detailStation;
      }
      joinActiveStation();
    };

    const onPopState = () => {
      joinActiveStation();
    };

    window.addEventListener(STATION_CHANGED_EVENT, onStationChanged as EventListener);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener(STATION_CHANGED_EVENT, onStationChanged as EventListener);
      window.removeEventListener("popstate", onPopState);
    };
  }, [joinActiveStation]);

  // Emit functions
  const emitSendTemplate = useCallback((data: SendTemplatePayloadType) => {
    if (!socketClient) {
      console.error("❌ Socket client not initialized!");
      return;
    }

    if (!socketClient.connected) {
      socketClient.connect();

      socketClient.once("connect", () => {
        socketClient.emit("send-template", stampStation(data));
      });
      return;
    }

    socketClient.emit("send-template", stampStation(data));
  }, [socketClient, stampStation]);

  const onReceivedPackages = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ Package response has error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedPackageContent;
      if (!isTargetStation(parsedData?.station)) return;
      setReceivedContent(parsedData);

    } catch (error) {
      console.error("❌ Error parsing package response:", error);
    }
  };

  const onRecievedUpsellPackage = (payload: any) => {
    try {
      const items = Array.isArray(payload.data) ? payload.data : [payload.data];
      const forStation = items.filter((item: any) =>
        item?.station == null || isTargetStation(item.station),
      );
      if (forStation.length === 0) return;

      setReceivedContent(forStation.length === 1 ? forStation[0] : forStation);

      notification.info({
        message: 'Upsell Package Selected',
        description: 'A guest has interacted with an upsell package.',
        placement: 'topRight',
        duration: 3,
      });

    } catch (error) {
      console.error("❌ Error parsing package response:", error);
    }
  };

  const emitSendDocument = useCallback((data: SendDocumentPayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    const payload = stampStation(data);
    if (callback) {
      socketClient.emit("send-document", payload, callback);
    } else {
      socketClient.emit("send-document", payload);
    }
  }, [socketClient, stampStation]);

  const emitSendTeamDocument = useCallback((data: SendDocumentPayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    const payload = stampStation(data);
    if (callback) {
      socketClient.emit("send-team-document", payload, callback);
    } else {
      socketClient.emit("send-team-document", payload);
    }
  }, [socketClient, stampStation]);

  const emitSendJotForm = useCallback((data: SendJotFormTemplate, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    socketClient.emit("send-jotForm", stampStation(data), (response: any) => {
      if (callback) callback(response);
    });
  }, [socketClient, stampStation]);

  const emitSendPackages = useCallback((
    data: SendPackagePayloadType,
    callback?: (response: any) => void
  ) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    const payload = stampStation(data);
    if (callback) {
      socketClient.emit("send-packages", payload, callback);
    } else {
      socketClient.emit("send-packages", payload);
    }
  }, [socketClient, stampStation]);


  const emitUpdateInformation = useCallback((data: SendInformationUpdatePayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    const payload = stampStation(data);
    if (callback) {
      socketClient.emit("update-information", payload, callback);
    } else {
      socketClient.emit("update-information", payload);
    }
  }, [socketClient, stampStation]);

  const emitSendMessage = useCallback((data: SendMessagePayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-message", stampStation(data));
  }, [socketClient, stampStation]);

  const emitSendSurvey = useCallback((data: SendSurveyPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-survey", stampStation(data));
  }, [socketClient, stampStation]);


  const emitSendRecording = useCallback((data: SendSurveyPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-recording", stampStation(data));
  }, [socketClient, stampStation]);

  const emitSendSurveyAnswer = useCallback((data: SendSurveyMessagePayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-survey-answer", stampStation(data));
  }, [socketClient, stampStation]);

  const emitSendLangCode = useCallback((data: SendLangCodeMessagePayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-lang-code", stampStation(data));
  }, [socketClient, stampStation]);

  const emitClearMessage = useCallback((data: CleanMessagesPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("clear-messages", stampStation(data));
  }, [socketClient, stampStation]);

  const emitLeaveChat = useCallback((data: CleanMessagesPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("leave-chat", stampStation(data));
  }, [socketClient, stampStation]);

  return (
    <SocketContext.Provider
      value={{
        socket: socketClient,
        emitSendTemplate,
        emitSendDocument,
        emitSendJotForm,
        emitSendMessage,
        emitClearMessage,
        emitLeaveChat,
        emitSendSurveyAnswer,
        emitSendSurvey,
        emitSendRecording,
        emitSendLangCode,
        emitUpdateInformation,
        socketConnected,
        emitSendTeamDocument,
        emitSendPackages
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
