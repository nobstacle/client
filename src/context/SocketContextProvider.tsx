"use client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import socket from "../lib/socket/init";
import {
  CleanMessagesPayloadType,
  ReceivedMessageContent,
  ReceivedTemplateContent,
  SendMessagePayloadType,
  SendSurveyMessagePayloadType,
  SendSurveyPayloadType,
  SendTemplatePayloadType,
  SendLangCodeMessagePayloadType,
  SendJotFormTemplate,
  ReceivedResponseType
} from "../constant/types";
import { useMessageStore } from "../lib/zustand/store/messageStore";
import useTemplateStore from "../lib/zustand/store/templateStore";

// Add document-related types
export interface SendDocumentPayloadType {
  refId: number;
  langCode: string;
  refType: string; 
  station: number;
  contentExtra?: string;
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

export const SocketContext = createContext<{
  socket: undefined | Socket<any, any>;
  emitSendTemplate: (data: SendTemplatePayloadType) => void;
  emitSendDocument: (data: SendDocumentPayloadType, callback?: (response: any) => void) => void;
  emitSendJotForm: (data: SendJotFormTemplate, callback?: (response: any) => void) => void;
  emitSendMessage: (data: SendMessagePayloadType) => void;
  emitClearMessage: (data: CleanMessagesPayloadType) => void;
  emitLeaveChat: (data: CleanMessagesPayloadType) => void;
  emitSendSurveyAnswer: (data: SendSurveyMessagePayloadType) => void;
  emitSendSurvey: (data: SendSurveyPayloadType) => void;
  emitSendLangCode: (data: SendLangCodeMessagePayloadType) => void;
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
    setReceivedResponse
  } = useMessageStore();

  const { addSurveyAnswer } = useTemplateStore();

  const session = useSession();
  const params = useSearchParams();

  // Initialize socket connection
  useEffect(() => {
    if (session.data?.user.backendTokens.at) {
      const socketC = socket(
        session.data?.user.backendTokens.at ?? "",
      ).connect();
      setSocketClient(socketC);
    }
  }, [session.data?.user.backendTokens.at]);

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

  const onDocumentSentSuccessfully = (data: any) => {
    console.log("📄 Document sent successfully:", data);

    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ Document send response has error:", parsedRes);
        return;
      }

      console.log("✅ Document sent successfully:", parsedRes);
      
      // If you need to trigger a template emission after document is sent, do it here
      if (parsedRes.data) {
        // Emit send-template instead of received-template
        emitSendTemplate({
          refId: parsedRes.data.id,
          refType: 'Document',
          station: parsedRes.data.station,
          langCode: parsedRes.data.langCode || 'en'
        });
      }

    } catch (error) {
      console.error("❌ Error parsing document send response:", error);
    }
  };

  const onReceivedMessage = (data: any) => {
    try {
      const parsedData = JSON.parse(data).data as ReceivedMessageContent;

      let role = session.data.user.Roles[0];

      if (role === "Admin" || role === "Staff") {
        setReceivedMessage({
          ...parsedData,
          message:
            session.data?.user.Roles?.includes("Admin") ||
              session.data?.user.Roles?.includes("Staff")
              ? parsedData.originalMessage
              : parsedData.message,
        });
      } else {
        setReceivedMessage({
          ...parsedData,
          message: parsedData.message,
        });
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
    console.info("📩 Received JotForm Submission:", data);

    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ JotForm response has error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedTemplateContent;
      console.log("✅ Parsed JotForm Data:", parsedData);

      setReceivedContent(parsedData);

    } catch (error) {
      console.error("❌ Error parsing JotForm response:", error);
    }
  };

  const onDataSubmitted = (data: any) => {
    console.info("📩 Received JotForm data:", data);

    try {
      const parsedRes = JSON.parse(data);
      if (parsedRes.status === 400) {
        console.warn("⚠️ JotForm data error:", parsedRes);
        return;
      }

      const parsedData = parsedRes.data as ReceivedResponseType;
      setReceivedResponse(parsedData);

    } catch (error) {
      console.error("❌ Failed to parse JotForm data:", error);
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
    socketClient.on("jotForm-sent-successfully", onReceivedJotForm);
    socketClient.on("dataSaved", onDataSubmitted);
    socketClient.on("document-sent-successfully", onReceivedDocument);

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
  const emitSendTemplate = (data: SendTemplatePayloadType) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }
    socketClient.emit("send-template", data);
  };

  const emitSendDocument = (data: SendDocumentPayloadType, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    console.log("🚀 Emitting send-document with data:", data);
    
    if (callback) {
         console.log("🚀 Call back case", data);
      socketClient.emit("send-document", data, callback);
    } else {
         console.log("🚀 Without Call back case:", data);
      socketClient.emit("send-document", data);
    }
  };

  const emitSendJotForm = (data: SendJotFormTemplate, callback?: (response: any) => void) => {
    if (!socketClient || !socketClient.connected) {
      console.error("❌ Socket is not connected!");
      return;
    }

    console.log("Emitting send-jotForm event with data:", data);
    socketClient.emit("send-jotForm", data, (response: any) => {
      console.log("Received response from server for send-jotForm:", response);
      if (callback) callback(response);
    });
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
        emitSendLangCode,
        socketConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};