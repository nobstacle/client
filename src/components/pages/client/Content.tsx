/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useMessageStore } from "../../../lib/zustand/store/messageStore";
import { ChatBox } from "../../ChatBox";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useHasHydrated } from "../../../hooks/useHydrated";
import { useCompanyControllerGetCompany } from "../../../lib/client/api";
import Slideshow from "./Slideshow";

import React from "react";
import SimpleMap from "./Map";
import SurveyAnswer from "./SurveyAnswer";

export const Content: React.FC = () => {
  const videoElement = React.useRef<HTMLVideoElement | null>(null);
  const company = useCompanyControllerGetCompany();
  const params = useSearchParams();
  const messageStore = useMessageStore();
  const hasHydrated = useHasHydrated();

  const chatBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!messageStore.receivedType) {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    } else if (messageStore.receivedType === "ChatMessage") {
      if (chatBoxRef.current) {
        chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      }
    }
  }, [messageStore.receivedMessage.length, chatBoxRef.current]);

  const { emitSendMessage } = useSocketContext();

  const sendMessage = (message: string) => {
    emitSendMessage({
      message: message,
      station: Number(params.get("station") ?? 1),
      refType: "ChatMessage",
      langCode: company.data?.defaultLangCode ?? "en",
    });
  };

  if (hasHydrated) {
    if (
      messageStore.receivedType === "TextTemplateMessage" ||
      messageStore.receivedType === "Text"
    ) {
      return (
        <div className="w-full p-5">
          <p className="text-center text-4xl" style={{ lineHeight: "3.5rem" }}>
            {messageStore.receivedContent?.content ?? ""}
          </p>
        </div>
      );
    }

    if (messageStore.receivedType === "ChatMessage") {
      return (
        <div className="w-6/12 ">
          <ChatBox
            ref={chatBoxRef}
            messages={messageStore.receivedMessage}
            sendMessage={sendMessage}
          />
        </div>
      );
    }

    if (messageStore.receivedType === "Image") {
      return (
        <img
          key={messageStore.receivedContent?.id ?? ""}
          alt="template_image"
          style={{
            height: "auto",
            maxHeight: "100%",
            maxWidth: "100%",
            objectFit: "cover",
            display: "block",
          }} // optional
          src={messageStore.receivedContent?.content ?? ""}
        />
      );
    }

    if (messageStore.receivedType === "Video") {
      return (
        <>
          <video
            ref={videoElement}
            autoPlay
            muted
            loop
            key={messageStore.receivedContent?.content ?? ""}
            playsInline
            style={{
              height: "100%",
              maxWidth: "100%",
              width: "100%",
              objectFit: "cover",
              display: "block",
            }} // optional
          >
            <source
              src={messageStore.receivedContent?.content ?? ""}
              type="video/mp4"
            />
          </video>
        </>
      );
    }
    if (messageStore.receivedType === "Slideshow") {
      return (
        <Slideshow contents={messageStore.receivedContent?.contents ?? []} />
      );
    }

    if (
      messageStore.receivedType === "Map" ||
      messageStore.receivedType === "MapTemplateMessage"
    ) {
      return (
        <SimpleMap
          destination={messageStore.receivedContent?.extraContent ?? ""}
          origin={messageStore.receivedContent?.content ?? ""}
          languageCode={messageStore.receivedContent?.langCode ?? "en"}
        />
      );
    }
  }

  if (messageStore.receivedType === "Survey" && messageStore.receivedSurvey) {
    return <SurveyAnswer tag={messageStore.receivedSurvey.tag} />;
  }

  if (
    messageStore.receivedType === "Website" ||
    messageStore.receivedType === "WebsiteTemplateMessage"
  ) {
    return (
      <iframe
        className="h-full w-full"
        src={messageStore.receivedContent?.content ?? ""}
      />
    );
  }

  return <div></div>;
};
