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
import { DocumentViewer } from 'react-documents';

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
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);

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
    const userAgent = navigator.userAgent;

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
    const isAndroidDevice = /Android/i.test(userAgent);
    const isTabletDevice = /iPad|Android(?!.*Mobile)/i.test(userAgent);

    setIsMobile(isMobileDevice);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsTablet(isTabletDevice);
  }, []);

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
      if (!videoElement.current) return;

      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;
      const containerAspectRatio = containerWidth / containerHeight;

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

          if (height > containerHeight) {
            height = containerHeight;
            width = containerHeight * videoAspectRatio;
          }
        } else {
          height = containerHeight;
          width = containerHeight * videoAspectRatio;

          if (width > containerWidth) {
            width = containerWidth;
            height = containerWidth / videoAspectRatio;
          }
        }

        video.style.width = `${width}px`;
        video.style.height = `${height}px`;
        video.style.objectFit = 'contain';
      };

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

  // Set a timeout for loading state
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        setIsLoading(false);
      }, 8000);

      setLoadingTimeout(timeout);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [isLoading]);

  // Document viewer component
  const renderDocumentViewer = () => {
  const documentUrl = messageStore.receivedContent?.content ?? "";
  const fileType = messageStore.receivedContent?.extraContent?.toLowerCase() ?? "";

  const handleDocumentError = (error: any) => {
    console.error('Document load error:', error);
    // For Word files, try Google Docs viewer instead of showing error
    if (isWordFile(fileType)) {
      setUseGoogleViewer(true);
      setIsLoading(false);
      setLoadError(false);
    } else {
      setIsLoading(false);
      setLoadError(true);
    }
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
  };

  // Check if file is a Word document
  const isWordFile = (fileType: string) => {
    return fileType.includes('doc') || fileType.includes('docx') || 
           documentUrl.toLowerCase().includes('.doc') || 
           documentUrl.toLowerCase().includes('.docx');
  };

  // Check if file is supported by react-documents
  const isSupportedByReactDocuments = (fileType: string) => {
    const supported = ['pdf', 'txt', 'csv'];
    return supported.some(type => fileType.includes(type)) ||
           documentUrl.toLowerCase().includes('.pdf') ||
           documentUrl.toLowerCase().includes('.txt') ||
           documentUrl.toLowerCase().includes('.csv');
  };
    if (loadError) {
      return (
        <div className={`w-full ${isMobile ? 'p-2' : 'p-5'}`}>
          {renderErrorState()}
        </div>
      );
    }



  const renderErrorState = () => (
    <div className="w-full p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
      <div className="text-gray-500 mb-4">
        <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="mb-4">Unable to display document</p>
        <div className="space-y-2">
          <button
            onClick={() => setUseGoogleViewer(true)}
            className="block w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
          >
            Try Google Docs Viewer
          </button>
          <a
            href={documentUrl}
            download
            className="block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Download File
          </a>
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Open in new tab
          </a>
        </div>
      </div>
    </div>
  );

  const renderLoadingState = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600">Loading document...</p>
      </div>
    </div>
  );

  const renderGoogleDocsViewer = () => {
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(documentUrl)}&embedded=true`;
    
    return (
      <div className="w-full h-full relative">
        <iframe
          src={googleViewerUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          title="Document Viewer"
          onLoad={() => {
            setIsLoading(false);
            if (loadingTimeout) clearTimeout(loadingTimeout);
          }}
          onError={() => {
            setLoadError(true);
            setIsLoading(false);
          }}
        />
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={() => {
              setUseGoogleViewer(false);
              setLoadError(false);
              setIsLoading(true);
            }}
            className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Switch Viewer
          </button>
        </div>
      </div>
    );
  };

  if (loadError && !useGoogleViewer) {
    return (
      <div className={`w-full ${isMobile ? 'p-2' : 'p-5'}`}>
        {renderErrorState()}
      </div>
    );
  }

  console.info("documentUrl:", documentUrl);
  console.info("fileType:", fileType);
  console.info("useGoogleViewer:", useGoogleViewer);

    const handleDocumentLoad = () => {
    setIsLoading(false);
    setLoadError(false);
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
  };

return (
    <div className={`w-full ${isMobile ? 'p-2' : 'p-5'}`}>
      <div className="w-full h-screen border rounded-lg overflow-hidden relative">
        {isLoading && renderLoadingState()}
        
        {(useGoogleViewer || isWordFile(fileType)) && !loadError ? (
          renderGoogleDocsViewer()
        ) : 
        isSupportedByReactDocuments(fileType) ? (
          <DocumentViewer
            url={documentUrl}
            viewer="url"
            style={{
              width: '100%',
              height: '100%'
            }}
            config={{
              header: {
                disableHeader: isMobile,
                disableFileName: isMobile,
              },
              loadingRenderer: {
                showLoadingTimeout: false,
              },
            }}
            onLoadSuccess={handleDocumentLoad}
            onLoadError={handleDocumentError}
            className={`${isMobile ? 'mobile-viewer' : 'desktop-viewer'}`}
          />
        ) : 
        !isLoading && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-8">
              <p className="mb-4 text-gray-600">
                This file type cannot be previewed directly.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => setUseGoogleViewer(true)}
                  className="block w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition-colors"
                >
                  Try Google Docs Viewer
                </button>
                <a
                  href={documentUrl}
                  download
                  className="block px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  Download to View
                </a>
              </div>
            </div>
            </div>
          )}
      </div>
      </div>
  );
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
        <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
          <div className="w-full max-w-[100%] sm:max-w-[75%] md:max-w-[50%]">
            <ChatBox
              ref={chatBoxRef}
              messages={messageStore.receivedMessage}
              sendMessage={sendMessage}
            />
          </div>
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
          }}
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
      return renderDocumentViewer();
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