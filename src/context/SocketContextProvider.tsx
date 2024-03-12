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
} from "../constant/types";
import { useMessageStore } from "../lib/zustand/store/messageStore";
import useTemplateStore from "../lib/zustand/store/templateStore";

export const SocketContext = createContext<{
  socket: undefined | Socket<any, any>;
  emitSendTemplate: (data: SendTemplatePayloadType) => void;
  emitSendMessage: (data: SendMessagePayloadType) => void;
  emitClearMessage: (data: CleanMessagesPayloadType) => void;
  emitLeaveChat: (data: CleanMessagesPayloadType) => void;
  emitSendSurveyAnswer: (data: SendSurveyMessagePayloadType) => void;
  emitSendSurvey: (data: SendSurveyPayloadType) => void;
  socketConnected: boolean;
} | null>(null);

export const useSocketContext = () => {
  const socketContext = useContext(SocketContext);

  if (!socketContext) {
    throw new Error(
      "useCurrentUser has to be used within <CurrentUserContext.Provider>",
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
  } = useMessageStore();

  const { addSurveyAnswer } = useTemplateStore();

  const session = useSession();
  const params = useSearchParams();

  useEffect(() => {
    if (session.data?.user.backendTokens.at) {
      const socketC = socket(
        session.data?.user.backendTokens.at ?? "",
      ).connect();
      setSocketClient(socketC);
    }
  }, [session.data?.user.backendTokens.at]);

  useEffect(() => {
    socketClient?.on("disconnect", onDisconnect);
    socketClient?.on("user-joined", onConnect);
    socketClient?.on("received-template", onReceivedTemplate);
    socketClient?.on("received-message", onReceivedMessage);
    socketClient?.on("received-clean-messages", onReceivedCleanMessages);
    socketClient?.on("received-survey", onReceivedSurvey);
    socketClient?.on("received-survey-answer", onReceivedSurveyAnswer);

    return () => {
      socketClient?.off("user-joined", onConnect);
      socketClient?.off("received-template", onReceivedTemplate);
      socketClient?.off("received-message", onReceivedMessage);
      socketClient?.off("received-clean-messages", onReceivedCleanMessages);
      socketClient?.off("received-survey", onReceivedSurvey);
      socketClient?.off("received-survey-answer", onReceivedSurveyAnswer);
    };
  }, [socketClient]);

  useEffect(() => {
    if (socketClient?.connected) {
      socketClient?.emit("join-chat", {
        station: Number(params.get("station") ?? 1),
      });
    }
  }, [socketClient, params.get("station")]);

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
    const parsedRes = JSON.parse(data);
    if (parsedRes.status === 400) return;
    const parsedData = parsedRes.data as ReceivedTemplateContent;
    setReceivedContent(parsedData);
  };

  const onReceivedMessage = (data: any) => {
    const parsedData = JSON.parse(data).data as ReceivedMessageContent;

    if (parsedData.role === "Admin" || parsedData.role === "Staff") {
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
        message: session.data?.user.Roles?.includes("User")
          ? parsedData.originalMessage
          : parsedData.message,
      });
    }
  };

  const onReceivedSurveyAnswer = (data: any) => {
    const parsedData = JSON.parse(data).data as {
      id: number;
      createdAt: string;
      updatedAt: string;
      stationNo: number;
      value: number;
      tag: string;
    };

    addSurveyAnswer(parsedData);
  };

  const onReceivedSurvey = (data: any) => {
    const parsedRes = JSON.parse(data);
    if (parsedRes.status === 400) return;
    const parsedData = parsedRes.data as {
      tag: string;
      station: number;
    };

    setReceivedSurvey(parsedData);
  };

  const onReceivedCleanMessages = (data: any) => {
    const parsedData = JSON.parse(data).data as {
      station: number;
      success: true;
    };

    clearReceivedMessage(parsedData.station);
  };

  const emitSendTemplate = (data: SendTemplatePayloadType) => {
    socketClient?.emit("send-template", data);
  };

  const emitSendMessage = (data: SendMessagePayloadType) => {
    socketClient?.emit("send-message", data);
  };

  const emitSendSurvey = (data: SendSurveyPayloadType) => {
    socketClient?.emit("send-survey", data);
  };

  const emitSendSurveyAnswer = (data: SendSurveyMessagePayloadType) => {
    socketClient?.emit("send-survey-answer", data);
  };

  const emitClearMessage = (data: CleanMessagesPayloadType) => {
    socketClient?.emit("clear-messages", data);
  };

  const emitLeaveChat = (data: CleanMessagesPayloadType) => {
    socketClient?.emit("leave-chat", data);
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketClient,
        emitSendTemplate,
        emitSendMessage,
        emitClearMessage,
        emitLeaveChat,
        emitSendSurveyAnswer,
        emitSendSurvey,
        socketConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
