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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const iframeRef = useRef(null);
  const [timer, setTimer] = useState(20);
  const [isClosing, setIsClosing] = useState(false);
  const [viewMode, setViewMode] = useState('embedded'); // 'embedded' or 'download'
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  console.info("messageStore.receivedType", messageStore.receivedType);

  useEffect(() => {
    const updateVideoStyles = () => {
      if (!videoElement.current) return;

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const containerAspectRatio = containerWidth / containerHeight;

      // Get video dimensions when metadata is loaded
      const video = videoElement.current;

      const handleLoadedMetadata = () => {
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const videoAspectRatio = videoWidth / videoHeight;

        let width: any;
        let height: any;

        if (videoAspectRatio > containerAspectRatio) {
          width = containerWidth;
          height = containerWidth / videoAspectRatio;

          // If height exceeds container, fit to height instead
          if (height > containerHeight) {
            height = containerHeight;
            width = containerHeight * videoAspectRatio;
          }
        } else {
          // Video is taller than container - fit to height
          height = containerHeight;
          width = containerHeight * videoAspectRatio;

          // If width exceeds container, fit to width instead
          if (width > containerWidth) {
            width = containerWidth;
            height = containerWidth / videoAspectRatio;
          }
        }

        // Apply calculated dimensions
        video.style.width = `${width}px`;
        video.style.height = `${height}px`;
        video.style.objectFit = 'contain';
      };

      // If metadata is already loaded
      if (video.readyState >= 1) {
        handleLoadedMetadata();
      } else {
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
      }

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    };

    const handleResize = () => {
      // Small delay to ensure orientation change is complete
      setTimeout(updateVideoStyles, 100);
    };

    updateVideoStyles();

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [messageStore.receivedContent?.content]);

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
    if (showQR && !isClosing) {
      setTimer(20);
      countdown = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            handleCloseQR();
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdown);
  }, [showQR, isClosing]);

  const handleCloseQR = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowQR(false);
      setIsClosing(false);
    }, 500);
  };

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
    if (messageStore.receivedType === "Document" ||
      messageStore.receivedType === "PdfDocument" ||
      messageStore.receivedType === "WordDocument" ||
      messageStore.receivedType === "ExcelDocument" ||
      messageStore.receivedType === "PowerPointDocument" ||
      messageStore.receivedType === "CsvDocument") {

      const documentUrl = messageStore.receivedContent?.content ?? "";
      const fileType = messageStore.receivedContent?.extraContent?.toLowerCase() ?? "";
      const fileName = `document.${fileType}`;

      const handleIframeError = () => {
        setLoadError(true);
        setIsLoading(false);
      };

      const handleIframeLoad = () => {
        setIsLoading(false);
      };


      const renderDocumentViewer = () => {
        if (loadError) {
          return;
        }

        switch (fileType) {
          case 'pdf':
            return (
              <div className="w-full h-screen border rounded-lg overflow-hidden relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <iframe
                  src={documentUrl}
                  className="w-full h-full"
                  title="PDF Document"
                  frameBorder="0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            );

          case 'doc':
          case 'docx':
            return (
              <div className="w-full h-screen border rounded-lg overflow-hidden relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                  className="w-full h-full"
                  title="Word Document"
                  frameBorder="0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            );

          case 'xls':
          case 'xlsx':
            return (
              <div className="w-full h-screen border rounded-lg overflow-hidden relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                  className="w-full h-full"
                  title="Excel Document"
                  frameBorder="0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            );

          case 'ppt':
          case 'pptx':
            return (
              <div className="w-full h-screen border rounded-lg overflow-hidden relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <iframe
                  src={`https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                  className="w-full h-full"
                  title="PowerPoint Document"
                  frameBorder="0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            );

          case 'csv':
            return (
              <div className="w-full h-96 border rounded-lg overflow-auto bg-gray-50 p-4 relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <iframe
                  src={documentUrl}
                  className="w-full h-full"
                  title="CSV Document"
                  frameBorder="0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            );

          default:
            return (
              <div className="w-full p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>Preview not available for this file type</p>
                  <p className="text-sm">Use the download button below to view the document</p>
                </div>
              </div>
            );
        }
      };

      return (
        <div className="w-full p-5">
          {/* Document Viewer */}
          {renderDocumentViewer()}

        </div>
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
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
              maxWidth: '100%',
              maxHeight: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block',
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
      <>
        <style jsx>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }

        @keyframes iframeSlideUp {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-20vh);
          }
        }

        @keyframes iframeSlideDown {
          from {
            transform: translateY(-20vh);
          }
          to {
            transform: translateY(0);
          }
        }

        .qr-modal-enter {
          animation: slideDown 0.5s ease-out forwards;
        }

        .qr-modal-exit {
          animation: slideUp 0.5s ease-out forwards;
        }

        .iframe-slide-up {
          animation: iframeSlideUp 0.5s ease-out forwards;
        }

        .iframe-slide-down {
          animation: iframeSlideDown 0.5s ease-out forwards;
        }

        .iframe-container {
          transition: transform 0.5s ease-out;
        }
      `}</style>
        <div className="surveyWrapper w-screen h-screen flex flex-col bg-gray-100">
          {showQR && (
            <div
              className={`relative bg-white shadow-md px-4 py-3 z-50 ${isClosing ? 'qr-modal-exit' : 'qr-modal-enter'
                }`}
            >
              {qrCodeUrl && (
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code"
                    className="w-28 h-28 object-contain"
                  />
                </div>
              )}
              <div className="flex justify-center items-center w-full h-full min-h-[7rem]">
                <span className="text-gray-700 text-xl customScanCode text-center">
                  Kindly scan to fill the form on your own device.
                </span>
              </div>

              <div className="absolute bottom-2 right-4 text-sm text-gray-500">
                {timer}s
              </div>

              <button
                onClick={handleCloseQR}
                className="text-2xl text-gray-500 hover:text-gray-700 absolute top-2 right-4 transition-colors duration-200"
              >
                ×
              </button>
            </div>
          )}

          <div
            className={`flex-1 overflow-auto iframe-container ${showQR && !isClosing
              ? 'iframe-slide-down'
              : isClosing
                ? 'iframe-slide-up'
                : ''
              }`}
          >
            <iframe
              ref={iframeRef}
              className="w-full h-full"
              src={messageStore.receivedContent?.content ?? ""}
              style={{ border: "none" }}
            />
          </div>
        </div>
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
