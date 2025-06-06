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

// React PDF imports
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// React Doc Viewer import
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';

// Set up PDF.js worker with proper error handling
if (typeof window !== 'undefined') {
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
  } catch (error) {
    console.warn('PDF.js worker setup failed:', error);
  }
}

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

  // PDF viewer states
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);

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

  // Device detection with error handling
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    
    try {
      const userAgent = navigator.userAgent || '';
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent);
      const isAndroidDevice = /Android/i.test(userAgent);

      setIsMobile(isMobileDevice);
      setIsIOS(isIOSDevice);
      setIsAndroid(isAndroidDevice);
    } catch (error) {
      console.warn('Device detection failed:', error);
    }
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
  }, [messageStore.receivedMessage.length, messageStore.receivedType]);

  useEffect(() => {
    if (messageStore.receivedType && isFirstTimeOpen.current === true) {
      isFirstTimeOpen.current = false;
    }
  }, [messageStore.receivedType]);

  // Video resize effect with better error handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateVideoStyles = () => {
      if (!videoElement.current) return;

      try {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        const video = videoElement.current;

        const handleLoadedMetadata = () => {
          try {
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;
            const videoAspectRatio = videoWidth / videoHeight;

            let width: number;
            let height: number;

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
          } catch (error) {
            console.warn('Video sizing failed:', error);
          }
        };

        if (video.readyState >= 1) {
          handleLoadedMetadata();
        } else {
          video.addEventListener('loadedmetadata', handleLoadedMetadata);
        }

        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };
      } catch (error) {
        console.warn('Video update failed:', error);
      }
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

  // QR Code generation with error handling
  useEffect(() => {
    const generateQR = async () => {
      const content = messageStore.receivedContent?.content;
      if (!content || typeof content !== 'string') return;
      
      try {
        const url = await QRCode.toDataURL(content);
        setQrCodeUrl(url);
        
        if (typeof window !== 'undefined') {
          const windowWidth = window.innerWidth;
          if (windowWidth > 650) {
            setTimeout(() => {
              setShowQR(true);
            }, 3000);
          }
        }
      } catch (err) {
        console.error("Failed to generate QR code", err);
      }
    };

    generateQR();
  }, [messageStore.receivedContent?.content]);

  // QR Timer effect
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
    return () => {
      if (countdown) clearInterval(countdown);
    };
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
    if (!message || !params) return;
    
    try {
      emitSendMessage({
        message: message,
        station: Number(params.get("station") ?? 1),
        refType: "ChatMessage",
        langCode: company.data?.defaultLangCode ?? "en",
      });
    } catch (error) {
      console.error('Send message failed:', error);
    }
  };

  // Loading timeout effect
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

  // PDF Document handlers
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
    setPdfError(false);
  };

  const onDocumentLoadError = (error: any) => {
    console.error('PDF load error:', error);
    setPdfError(true);
    setPdfLoading(false);
  };

  const goToPrevPage = () => setPageNumber(page => Math.max(page - 1, 1));
  const goToNextPage = () => setPageNumber(page => Math.min(page + 1, numPages || 1));

  const EnhancedDocumentViewer = React.memo(() => {
    const documentUrl = messageStore.receivedContent?.content ?? "";
    const fileType = messageStore.receivedContent?.extraContent?.toLowerCase() ?? "";

    console.info("documentUrl", documentUrl);
    console.info("fileType", fileType);

    // Reset PDF state when URL changes
    useEffect(() => {
      setPdfError(false);
      setPdfLoading(true);
      setPageNumber(1);
      setNumPages(null);
    }, [documentUrl]);

    if (fileType === 'pdf') {
      return (
        <div className="w-full h-screen bg-gray-100">
          {pdfLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}

          {pdfError && (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="text-center bg-white p-6 rounded-lg shadow-md max-w-md">
                <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">PDF Load Failed</h3>
                <p className="text-gray-600 mb-4 text-sm">Unable to load PDF with react-pdf. Trying fallback viewer...</p>
                
                <iframe
                  src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(documentUrl)}`}
                  className="w-full h-96 mb-4"
                  style={{ border: '1px solid #e5e7eb' }}
                  title="PDF Document Fallback"
                  onError={() => {
                    console.error('PDF fallback iframe failed');
                  }}
                />

                <a 
                  href={documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition-colors"
                >
                  Open PDF in New Tab
                </a>
              </div>
            </div>
          )}

          {/* React PDF Document */}
          {!pdfError && (
            <div className="flex flex-col h-full">
              {/* PDF Navigation Controls */}
              {numPages && numPages > 1 && (
                <div className="bg-white shadow-sm border-b px-4 py-2 flex items-center justify-between">
                  <button
                    onClick={goToPrevPage}
                    disabled={pageNumber <= 1}
                    className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-600">
                    Page {pageNumber} of {numPages}
                  </span>
                  
                  <button
                    onClick={goToNextPage}
                    disabled={pageNumber >= numPages}
                    className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* PDF Document Container */}
              <div className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
                {typeof window !== 'undefined' && (
                  <Document
                    file={documentUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={null}
                    className="shadow-lg"
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={Math.min(window.innerWidth - 32, 800)}
                      className="bg-white"
                      renderTextLayer={true}
                      renderAnnotationLayer={true}
                    />
                  </Document>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // For Word documents and other supported formats
    if (fileType === 'doc' || fileType === 'docx' || fileType === 'xlsx' || fileType === 'pptx') {
      const docs = [
        {
          uri: documentUrl,
          fileName: `document.${fileType}`,
          fileType: fileType,
        },
      ];

      return (
        <div className="w-full h-screen">
          <DocViewer
            documents={docs}
            pluginRenderers={DocViewerRenderers}
            config={{
              header: {
                disableHeader: false,
                disableFileName: false,
                retainURLParams: false,
              },
              csvDelimiter: ",",
              pdfZoom: {
                defaultZoom: 1.1,
                zoomJump: 0.2,
              },
            }}
            style={{ height: '100vh' }}
            onError={(error) => {
              console.error('DocViewer error:', error);
            }}
          />
        </div>
      );
    }

    // For unsupported file types
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center bg-white p-6 rounded-lg shadow-md max-w-md">
          <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">File Type Not Supported</h3>
          <p className="text-gray-500 mb-4 text-sm">This file type ({fileType}) cannot be previewed in the browser.</p>
          <a 
            href={documentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Download File
          </a>
        </div>
      </div>
    );
  });

  EnhancedDocumentViewer.displayName = 'EnhancedDocumentViewer';

  // Wait for hydration before rendering
  if (!hasHydrated) {
    return <div></div>;
  }

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
        }}
        src={messageStore.receivedContent?.content ?? ""}
      />
    );
  }

  // Enhanced Document Viewer Section
  if (messageStore.receivedType === "Document" ||
      messageStore.receivedType === "PdfDocument" ||
      messageStore.receivedType === "WordDocument") {
    return (
      <div className="w-full">
        <EnhancedDocumentViewer />
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

  if (isFirstTimeOpen.current && defaultSlideshowContent.data) {
    return (
      <Slideshow contents={defaultSlideshowContent.data?.contents ?? []} />
    );
  }

  return <div></div>;
};