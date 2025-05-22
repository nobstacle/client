/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useMessageStore } from "../../../lib/zustand/store/messageStore";
import { ChatBox } from "../../ChatBox";
import { useSocketContext } from "../../../context/SocketContextProvider";
import { useSearchParams } from "next/navigation";
import { useHasHydrated } from "../../../hooks/useHydrated";
import {
  getContentControllerGetDefaultSlideshowContentQueryKey,
  useCompanyControllerGetCompany,
  useContentControllerGetDefaultSlideshowContent,
} from "../../../lib/client/api";
import Slideshow from "./Slideshow";
import React from "react";
import SimpleMap from "./Map";
import SurveyAnswer from "./SurveyAnswer";
import QRCode from 'qrcode';
import "../../../styles/base.css";
import { Modal } from "antd";
import "antd/dist/reset.css";

export const Content: React.FC = () => {
  const isFirstTimeOpen = useRef(true);
  const videoElement = React.useRef<HTMLVideoElement | null>(null);
  const company = useCompanyControllerGetCompany();
  const params = useSearchParams();
  const messageStore = useMessageStore();
  const hasHydrated = useHasHydrated();
  const [aspectRatio, setAspectRatio] = useState("16 / 9");
  const [objectFit, setObjectFit] = useState("cover");
  const [padding, setPadding] = useState("0");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const defaultSlideshowContent =
    useContentControllerGetDefaultSlideshowContent({
      query: {
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        queryKey: getContentControllerGetDefaultSlideshowContentQueryKey(),
      },
    });

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

  useEffect(() => {
    if (messageStore.receivedType && isFirstTimeOpen.current === true) {
      isFirstTimeOpen.current = false;
    }
  }, [messageStore.receivedType]);

  useEffect(() => {
    const updateVideoStyles = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if ((width < 768 && isPortrait) || (width < 950 && !isPortrait)) {
        setAspectRatio(isPortrait ? "9 / 16" : "16 / 9");
        setObjectFit(isPortrait ? "contain" : "cover");
        setPadding(isPortrait ? '0' : '3.2rem 0.2rem');
      } else if (width >= 768 && width <= 1200) {
        setAspectRatio(isPortrait ? "3 / 4" : "4 / 3");
        setObjectFit(isPortrait ? "contain" : "cover");
        setPadding(isPortrait ? '0' : '2.25rem 0.3rem');
      } else {
        setAspectRatio("16 / 9");
        setObjectFit("cover");
        setPadding('5.5rem 0.3rem');
      }
    };

    updateVideoStyles();
    window.addEventListener("resize", updateVideoStyles);
    window.addEventListener("orientationchange", updateVideoStyles);

    return () => {
      window.removeEventListener("resize", updateVideoStyles);
      window.removeEventListener("orientationchange", updateVideoStyles);
    };
  }, []);

  const { emitSendMessage } = useSocketContext();

  const sendMessage = (message: string) => {
    emitSendMessage({
      message: message,
      station: Number(params.get("station") ?? 1),
      refType: "ChatMessage",
      langCode: company.data?.defaultLangCode ?? "en",
    });
  };

  useEffect(() => {
    const generateQR = async () => {
      const content = messageStore.receivedContent?.content;
      if (content) {
        try {
          const url = await QRCode.toDataURL(content);
          setQrCodeUrl(url);
          const screenWidth = window.innerWidth;
          if (screenWidth > 650) {
            setTimeout(() => {
              setIsModalOpen(true);
            }, 1000);
          }
        } catch (err) {
          console.error("Failed to generate QR code", err);
        }
      }
    };

    generateQR();
  }, [messageStore.receivedContent?.content]);


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
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            overflow: 'hidden',
            zIndex: 9,
            pointerEvents: 'none',
            backgroundColor: 'black',
          }}
        >
          <video
            ref={videoElement}
            autoPlay
            muted
            loop
            playsInline
            key={messageStore.receivedContent?.content ?? ""}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              aspectRatio,
              objectFit,
              minWidth: '100%',
              minHeight: '100%',
              padding
            }}
          >
            <source
              src={messageStore.receivedContent?.content ?? ""}
              type="video/mp4"
            />
          </video>
        </div>
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
    messageStore.receivedType === ("JotFormMessage" as any)
  ) {

    return (
      <>
        <Modal
          title="Scan this QR Code to fill the form on your device!"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          centered
        >
          {qrCodeUrl && (
            <img
              src={qrCodeUrl}
              alt="QR Code"
              style={{ width: "100%", maxWidth: "300px", margin: "auto", display: "block" }}
            />
          )}
        </Modal>
        <iframe
          className="h-full w-full"
          src={messageStore.receivedContent?.content ?? ""}
        />
      </>
    );
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

  if (isFirstTimeOpen && defaultSlideshowContent.data)
    return (
      <Slideshow contents={defaultSlideshowContent.data?.contents ?? []} />
    );

  return <div></div>;
};
