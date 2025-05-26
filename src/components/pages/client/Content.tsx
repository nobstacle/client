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
  const [showQR, setShowQR] = useState(false);
  const iframeRef = useRef(null);
  const [timer, setTimer] = useState(20);

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

  useEffect(() => {
    const generateQR = async () => {
      const content = messageStore.receivedContent?.content;
      if (content) {
        try {
          const url = await QRCode.toDataURL(content);
          setQrCodeUrl(url);
          const wdthSize = window.innerWidth;
          if (wdthSize > 650) {
            setTimeout(() => {
              setShowQR(true);
            }, 3000);
          }
        } catch (err) {
          console.error("Failed to generate QR code", err);
        }
      }
    };

    generateQR();
  }, [messageStore.receivedContent?.content]);

  useEffect(() => {
    let countdown: NodeJS.Timeout;
    if (showQR) {
      setTimer(20);
      countdown = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setShowQR(false);
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [showQR]);
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

  if (messageStore.receivedType === ("JotFormMessage" as any)) {


    return (
      <div className="surveyWrapper w-screen h-screen flex flex-col bg-gray-100">
        {showQR && (
          <div
            className="relative bg-white shadow-md px-4 py-3 flex items-center justify-between animate-slide-down z-50"
            style={{ animation: 'slideDown 0.5s ease-out forwards' }}
          >
            <div className="flex items-center gap-4">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-28 h-28 object-contain"
                />
              )}
              <span className="text-gray-700 text-xl customScanCode">
                Kindly scan to fill the form on your own device.
              </span>
            </div>
            <div className="absolute bottom-2 right-4 text-sm text-gray-500">
              Hiding in {timer}s
            </div>
            <button
              onClick={() => setShowQR(false)}
              className="text-2xl text-gray-500 hover:text-gray-700 absolute top-2 right-4"
            >
              ×
            </button>
          </div>
        )}

        <div
          className="flex-1 overflow-auto"
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full"
            src={messageStore.receivedContent?.content ?? ""}
            style={{ border: "none" }}
          />
        </div>
      </div>
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
