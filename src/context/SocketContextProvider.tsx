"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
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
  const {
    setReceivedContent,
    setReceivedMessage,
    clearReceivedMessage,
    setReceivedSurvey,
    setReceivedLangCode,
    setReceivedRecording,
    setReceivedResponse,

  } = useMessageStore();

  const { addSurveyAnswer } = useTemplateStore();
  const { setCompany } = useCompanyStore();
  const queryClient = useQueryClient();

  const session = useSession();
  const params = useSearchParams();

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

  // Socket event handlers
  const onConnect = () => {
    socketClient?.emit("join-chat", {
      station: Number(params.get("station") ?? 1),
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
          if (informationData) {
            setReceivedContent(informationData as ReceivedInformationContent);
          }
          break;

        case 'updated':
          if (informationData) {
            setReceivedContent(informationData as ReceivedInformationContent);
          }
          break;

        case 'deleted':
          if (informationData) {
            setReceivedContent(informationData as ReceivedInformationContent);
          }
          break;

        default:
          // Fallback to original behavior
          if (informationData) {
            setReceivedContent(informationData as ReceivedInformationContent);
          }
      }

    } catch (error) {
      console.error("❌ Error parsing information update response:", error);
      console.error("❌ Raw data that caused error:", data);
    }
  };

  const onReceivedMessage = (data: any) => {
    try {
      const parsedData = JSON.parse(data).data as ReceivedMessageContent;

      let role = session.data.user.Roles[0];

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

      setReceivedLangCode(parsedData.langCode);
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

  // Join chat when socket connects or station changes
  useEffect(() => {
    if (socketClient?.connected) {
      socketClient?.emit("join-chat", {
        station: Number(params.get("station") ?? 1),
      });
    }
  }, [socketClient, params]);

  // Emit functions
  // In SocketContextProvider.tsx
  const emitSendTemplate = (data: SendTemplatePayloadType) => {

    if (!socketClient) {
      console.error("❌ Socket client not initialized!");
      return;
    }

    if (!socketClient.connected) {
      socketClient.connect();

      // Wait for connection before emitting
      socketClient.once("connect", () => {
        socketClient.emit("send-template", data);
      });
      return;
    }

    socketClient.emit("send-template", data);
  };

  const onReceivedPackages = (data: any) => {
    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ Package response has error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedPackageContent;
      setReceivedContent(parsedData);

    } catch (error) {
      console.error("❌ Error parsing package response:", error);
    }
  };

  const onRecievedUpsellPackage = (payload: any) => {
    try {
      if (Array.isArray(payload.data)) {
        setReceivedContent(payload.data);
      } else {
        console.warn("Expected array but received:", typeof payload.data);
        setReceivedContent([payload.data]);
      }

      // Show notification
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

  const emitSendDocument = (data: SendDocumentPayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    if (callback) {
      socketClient.emit("send-document", data, callback);
    } else {
      socketClient.emit("send-document", data);
    }
  };

  const emitSendTeamDocument = (data: SendDocumentPayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    if (callback) {
      socketClient.emit("send-team-document", data, callback);
    } else {
      socketClient.emit("send-team-document", data);
    }
  };

  const emitSendJotForm = (data: SendJotFormTemplate, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    socketClient.emit("send-jotForm", data, (response: any) => {
      if (callback) callback(response);
    });
  };

  const emitSendPackages = (
    data: SendPackagePayloadType,
    callback?: (response: any) => void
  ) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    if (callback) {
      socketClient.emit("send-packages", data, callback);
    } else {
      socketClient.emit("send-packages", data);
    }
  };


  const emitUpdateInformation = (data: SendInformationUpdatePayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    if (callback) {
      socketClient.emit("update-information", data, callback);
    } else {
      socketClient.emit("update-information", data);
    }
  };

  const emitSendMessage = (data: SendMessagePayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-message", data);
  };

  const emitSendSurvey = (data: SendSurveyPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-survey", data);
  };


  const emitSendRecording = (data: SendSurveyPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-recording", data);
  };

  const emitSendSurveyAnswer = (data: SendSurveyMessagePayloadType) => {

    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-survey-answer", data);
  };

  const emitSendLangCode = (data: SendLangCodeMessagePayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-lang-code", data);
  };

  const emitClearMessage = (data: CleanMessagesPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("clear-messages", data);
  };

  const emitLeaveChat = (data: CleanMessagesPayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("leave-chat", data);
  };

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
