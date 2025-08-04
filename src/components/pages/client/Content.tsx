/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
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
import SimpleMap from "./Map";
import SurveyAnswer from "./SurveyAnswer";
import QRCode from 'qrcode';
import "../../../styles/base.css";
import "antd/dist/reset.css";
import { useSession } from "next-auth/react";
import { Card, Button, Tag, Typography, Carousel, message, Spin } from "antd";
import { LeftOutlined, RightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const IframeWithPrefill = React.memo(({ src, prefillData }: { src: string, prefillData: Record<string, string> }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const prevSrcRef = useRef(src);
  const prevPrefillDataRef = useRef(JSON.stringify(prefillData));

  useEffect(() => {
    const currentPrefillStr = JSON.stringify(prefillData);
    const srcChanged = prevSrcRef.current !== src;
    const prefillChanged = prevPrefillDataRef.current !== currentPrefillStr;

    if (srcChanged || prefillChanged) {
      setIframeKey(prev => prev + 1);
      prevSrcRef.current = src;
      prevPrefillDataRef.current = currentPrefillStr;
    }
  }, [src, prefillData]);

  return (
    <iframe
      ref={iframeRef}
      key={iframeKey}
      src={src}
      width="100%"
      height="600"
      frameBorder="0"
      scrolling="auto"
      allow="geolocation; microphone; camera"
      style={{ border: "none" }}
      className="w-full h-full"
      title="JotForm"
    />
  );
});

const getLocalizedContent = (contentObj, fallback = '') => {
  if (!contentObj || typeof contentObj !== 'object') return fallback;

  // Get all available language keys
  const availableLanguages = Object.keys(contentObj);

  // If no languages available, return fallback
  if (availableLanguages.length === 0) return fallback;

  // Priority order: en (English) first, then any other available language
  const preferredLanguage = availableLanguages.includes('en') ? 'en' : availableLanguages[0];

  return contentObj[preferredLanguage] || fallback;
};

const PackageCard = ({ packageData, handleClick, loadingButton }) => {
  const carouselRef = useRef();

  const formatPrice = (price) => {
    return new Intl.NumberFormat().format(price / 100);
  };

  const formatCurrency = (price, currency = 'AED') => {
    return `${currency} ${price}`;
  };

  const handlePackageClick = (record) => {
    handleClick(record);
  };

  // Get localized content
  const packageName = getLocalizedContent(packageData.packageNames, 'Package');
  const packageDescription = getLocalizedContent(packageData.packageDescriptions, 'Package Description Text - Multilingual Depending on the selected language');
  const packageBenefits = getLocalizedContent(packageData.packageBenefits, []);
  const packageTags = getLocalizedContent(packageData.packageTags, []);
  const taxInformation = getLocalizedContent(packageData.taxInformation, '');
  const packageAlerts = getLocalizedContent(packageData.packageAlerts, '');
  const buttonText = getLocalizedContent(packageData.buttonTexts, 'Take this deal');
  const currency = getLocalizedContent(packageData.currencies, 'AED');

  // Get image array
  const imageArray = packageData.signedImageUrls || packageData.images || [];
  const hasMultipleImages = imageArray.length > 1;

  // Custom arrow components
  const CustomPrevArrow = ({ onClick }) => (
    <button
      onClick={onClick}
      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 z-10"
      aria-label="Previous image"
      type="button"
      style={{
        border: 'none',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <LeftOutlined style={{
        fontSize: '16px',
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0
      }} />
    </button>
  );

  const CustomNextArrow = ({ onClick }) => (
    <button
      onClick={onClick}
      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all duration-200 z-10"
      aria-label="Next image"
      type="button"
      style={{
        border: 'none',
        outline: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <RightOutlined style={{
        fontSize: '16px',
        color: 'white',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 0,
        padding: 0
      }} />
    </button>
  );

  return (
    <Card
      className="w-full max-w-7xl mx-auto shadow-lg rounded-lg overflow-hidden mb-6"
      bodyStyle={{ padding: 0 }}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Image Section */}
        <div className="relative md:w-[400px] lg:w-[375px] xl:w-[500px] h-56 sm:h-64 md:h-72 lg:h-auto flex-shrink-0" style={{ maxHeight: '40vh' }}>
          {imageArray.length > 0 ? (
            <div className="relative w-full h-full" style={{ padding: '1rem' }}>
              <Carousel
                ref={carouselRef}
                arrows={hasMultipleImages}
                prevArrow={<CustomPrevArrow />}
                nextArrow={<CustomNextArrow />}
                dots={false}
                infinite={true}
                style={{ height: '100%' }}
              >
                {imageArray.map((image, index) => (
                  <div key={index} className="w-full h-full" style={{ height: '100%' }}>
                    <img
                      src={image.signedUrl || image.url || image}
                      alt={image.alt || `Package Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      style={{ borderRadius: '8px', height: '100%', maxHeight: '35vh', minHeight: '35vh' }}
                      onError={(e) => {
                        console.error('Image failed to load:', image.signedUrl || image.url || image);
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', image.signedUrl || image.url || image);
                      }}
                    />
                  </div>
                ))}
              </Carousel>

              {/* Image counter - Only show if more than one image */}
              {hasMultipleImages && (
                <div className="absolute top-2 left-1 bg-black/50 text-white px-2 py-1 rounded text-xs z-10">
                  1 / {imageArray.length}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Text className="text-gray-500">No Image Available</Text>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 p-4 sm:p-6 flex flex-col" style={{ paddingLeft: '0.5rem' }}>
          {/* Top Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
            {/* Left side - Package info */}
            <div className="flex-1">
              <Title level={3} className="text-blue-600 mb-2 mt-0 text-lg sm:text-xl lg:text-2xl" style={{ color: '#006ce4' }}>
                {packageName}
              </Title>

              {/* Tags */}
              {packageTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {packageTags.map((tag, index) => (
                    <Tag key={index} className="px-2 sm:px-3 py-1 bg-green-800 text-white border-green-800 rounded text-xs sm:text-sm">
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
            </div>

            {/* Right side - Best seller and sold info */}
            <div className="text-left sm:text-right flex-shrink-0">
              <Text className="font-bold text-gray-600 mb-2 block text-sm sm:text-base">
                {packageData.numberOfPurchases > 1500 ? "Best Seller" : packageData.numberOfPurchases > 1000 && packageData.numberOfPurchases < 1500 ? "Top Seller" : packageData.numberOfPurchases > 500 && packageData.numberOfPurchases < 1000 ? "Popular Deal" : "Limited Offer"}
              </Text>
              <Text className="text-xs sm:text-sm text-gray-500">
                Sold {packageData.numberOfPurchases || 0} times
              </Text>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-col lg:flex-row gap-6 flex-1">
            {/* Description and Benefits */}
            <div className="flex-1">
              {/* Description */}
              <div className="mb-4">
                <Text className="text-gray-700 font-bold mb-3 block text-sm sm:text-base">
                  {packageDescription}
                </Text>

                {/* Benefits */}
                {packageBenefits.length > 0 && (
                  <div className="space-y-1">
                    {packageBenefits.map((benefit, index) => (
                      <div key={index} className="text-green-600 font-medium flex items-center text-sm sm:text-base">
                        <span className="mr-2">✓</span>
                        {benefit}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alert */}
              {packageAlerts && (
                <div className="mb-4">
                  <Text className="text-red-600 font-medium text-sm sm:text-base">
                    {packageAlerts}
                  </Text>
                </div>
              )}
            </div>

            {/* Price and Button Section */}
            <div className="lg:w-44 flex flex-col justify-end">
              <div className="text-left lg:text-right pb-2">
                {/* Posting Algorithm Label */}
                <Text className="text-xs sm:text-sm text-gray-500 mb-2 block">
                  {packageData?.priceAlgorithm}
                </Text>

                {/* Pricing Block */}
                <div className="mb-4">
                  <div className="flex items-center justify-start lg:justify-end gap-2 mb-1 flex-wrap">
                    <Text className="text-sm text-gray-400 line-through order-2 lg:order-1">
                      {formatCurrency(packageData.originalPrice, currency)}
                    </Text>
                    <Text className="text-xl sm:text-2xl font-bold order-1 lg:order-2">
                      {formatCurrency(packageData.discountedPrice, currency)}
                    </Text>
                  </div>
                  <Text className="text-xs sm:text-sm text-gray-500">
                    {taxInformation}
                  </Text>
                </div>

                {/* Button */}
                <Button
                  type="primary"
                  size="large"
                  className="bg-blue-600 hover:bg-blue-700 px-6 sm:px-8 py-2 h-10 sm:h-12 w-full lg:w-auto text-sm sm:text-base"
                  disabled={!packageData.active || loadingButton}
                  onClick={() => handlePackageClick(packageData)}
                >
                  {loadingButton ? 'Loading..' : buttonText}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const Content: React.FC = () => {
  const isFirstTimeOpen = useRef(true);
  const videoElement = React.useRef<HTMLVideoElement | null>(null);
  const company = useCompanyControllerGetCompany();
  const params = useSearchParams();
  const messageStore = useMessageStore();
  const hasHydrated = useHasHydrated();
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [timer, setTimer] = useState(20);
  const [isClosing, setIsClosing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isTablet, setIsTablet] = useState(false);
  const { data } = useSession();
  let baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const [jotFormUrl, setJotFormUrl] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<Record<string, string>>({});
  const [contentKey, setContentKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [packageImageIndexes, setPackageImageIndexes] = useState<Record<number, number>>({});
  let Url = process.env.NEXT_PUBLIC_BACKEND_URL;

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
            // Reset the timer states when new content arrives
            setIsClosing(false);
            setContentKey(prev => prev + 1); // Trigger timer reset
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

  const handleCloseQR = useCallback(() => {
    setIsClosing(true);
    setShowQR(false);
    setTimer(0);
  }, []);

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
  }, [showQR, isClosing, handleCloseQR, contentKey]);

  useEffect(() => {
    const loadFormData = async () => {
      if (messageStore.receivedType === "JotFormMessage" && messageStore.receivedContent?.content) {
        try {
          const result = await getFormData(messageStore.receivedContent.content);

          if (result) {
            setJotFormUrl(result.url);
            setPrefillData(result.prefillData);
          } else {
            setJotFormUrl(null);
            setPrefillData({});
          }
        } catch (error) {
          console.error("Failed to load form data:", error);
          setJotFormUrl(null);
          setPrefillData({});
        }
      }
    };

    loadFormData();
  }, [messageStore.receivedType, messageStore.receivedContent?.content, data?.user.backendTokens.at]);

  useEffect(() => {
    if (messageStore.receivedType === 'Packages') {
      let parseData;
      try {
        parseData = JSON.parse(messageStore.receivedContent?.extraContent ?? '[]');
      } catch (error) {
        console.error("Error parsing package data:", error);
        return;
      }

      const initialIndexes = {};
      parseData.forEach((pkg, index) => {
        initialIndexes[pkg.id] = 0;
      });
      setPackageImageIndexes(initialIndexes);
      const intervals = [];

      parseData.forEach((pkg) => {
        if (pkg.signedImageUrls && pkg.signedImageUrls.length > 1) {
          const interval = setInterval(() => {
            setPackageImageIndexes(prev => ({
              ...prev,
              [pkg.id]: (prev[pkg.id] + 1) % pkg.signedImageUrls.length
            }));
          }, 3000);
          intervals.push(interval);
        }
      });

      return () => {
        intervals.forEach(interval => clearInterval(interval));
      };
    }
  }, [messageStore.receivedType, messageStore.receivedContent?.extraContent]);

  const getFormData = async (url: string): Promise<{ url: string, prefillData: Record<string, string> } | null> => {
    try {
      const urlObj = new URL(url);
      const uuid = urlObj.searchParams.get("uuid");

      if (!uuid) {
        console.error("UUID not found in URL");
        return null;
      }

      // Extract prefill data from original URL
      const prefillData: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        if (key !== 'uuid') {
          prefillData[key] = value;
        }
      });

      const res = await fetch(`${baseUrl}/api/jotform/get-assigned-form-by-uuid?uuid=${uuid}`, {
        headers: {
          Authorization: `Bearer ${data?.user.backendTokens.at}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const text = await res.text();
      const result = JSON.parse(text);

      const newUrl = new URL(`https://form.jotform.com/${result.data.formId}`);

      // Add the UUID back to the new URL
      newUrl.searchParams.set('uuid', uuid);

      // Add all prefill parameters to the new URL
      Object.entries(prefillData).forEach(([key, value]) => {
        newUrl.searchParams.set(key, value);
      });

      return {
        url: newUrl.toString(),
        prefillData
      };

    } catch (error) {
      console.error("Error fetching data:", error);
      return null;
    }
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

  const createUpsellTransaction = async (formData: {
    packageId: number;
    confirmationNumber: string;
    arrivalDate?: Date;
    departureDate?: Date;
    numberOfAdults?: number;
    numberOfChildren?: number;
  }) => {
    try {
      const response = await fetch(Url + '/api/v1/uploads/create-upsell-transaction', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data?.user.backendTokens.at}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating upsell transaction:', error);
      throw error;
    }
  };

  const handlePackageClicked = async (packageData) => {
    setLoading(true);
    try {
      let sellingPerson = JSON.parse(messageStore.receivedContent && messageStore.receivedContent.sentBy);
      const confirmationNumber = `CONF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const dayAfterTomorrow = new Date(tomorrow);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

      const upsellData = {
        packageId: packageData.id,
        confirmationNumber: confirmationNumber,
        arrivalDate: tomorrow.toISOString(),
        departureDate: dayAfterTomorrow.toISOString(),
        numberOfAdults: 2,
        numberOfChildren: 0,
        soldBy: sellingPerson.id
      };

      const result = await createUpsellTransaction(upsellData);
      message.success(`Package "${packageData.packageNames?.en}" purchased successfully!\nConfirmation: ${confirmationNumber}`);
      setLoading(false);
      setTimeout(() => {
        messageStore.reset();
      }, 1000);
    } catch (error) {
      setLoading(false);
      console.error('Failed to create upsell transaction:', error);

      // Better error handling based on error response
      let errorMessage = 'Failed to purchase package. Please try again.';

      if (error.response) {
        switch (error.response.status) {
          case 400:
            errorMessage = error.response.data.message || 'Invalid request data.';
            break;
          case 401:
            errorMessage = 'Please log in to make a purchase.';
            break;
          case 404:
            errorMessage = 'Package not found.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
        }
      }

      alert(errorMessage);
    }
  };

  if (hasHydrated) {
    if (
      messageStore.receivedType === "TextTemplateMessage" ||
      messageStore.receivedType === "Text"
    ) {
      return (
        <div className="w-full p-5">
          <p className="text-center text-4xl" style={{ lineHeight: "3.5rem", whiteSpace: 'pre-wrap' }}>
            {messageStore.receivedContent?.content ?? ""}
          </p>
        </div>
      );
    }

    if (messageStore.receivedType === 'Packages') {
      let parseData;
      try {
        parseData = JSON.parse(messageStore.receivedContent?.extraContent ?? '[]');
      } catch (error) {
        console.error("Error parsing package data:", error);
        return (
          <div className="w-full p-5">
            <Text className="text-red-500">Error loading package data</Text>
          </div>
        );
      }

      const sortedPackages = parseData.sort((a, b) => {
        const purchasesA = a.numberOfPurchases || 0;
        const purchasesB = b.numberOfPurchases || 0;
        return purchasesB - purchasesA;
      });

      return (
        <div
          className="w-full space-y-6 relative"
          style={{ height: '100%', padding: '3rem 1rem', overflowY: 'scroll' }}
        >
          {sortedPackages.map((packageData) => (
            <PackageCard
              key={packageData.id}
              packageData={packageData}
              handleClick={(data) => handlePackageClicked(data)}
              loadingButton={loading}
            />
          ))}
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
          }} // optional
          src={messageStore.receivedContent?.content ?? ""}
        />
      );
    }

    if (messageStore.receivedType === "Document" ||
      messageStore.receivedType === "Documents" ||
      messageStore.receivedType === "PdfDocument" ||
      messageStore.receivedType === "WordDocument" ||
      messageStore.receivedType === "ExcelDocument" ||
      messageStore.receivedType === "PowerPointDocument" ||
      messageStore.receivedType === "CsvDocument") {

      const documentUrl = messageStore.receivedContent?.content ?? "";
      const fileType = messageStore.receivedContent?.extraContent?.toLowerCase() ?? "";

      const handleIframeError = () => {
        setLoadError(true);
        setIsLoading(false);
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      };

      const handleIframeLoad = () => {
        setIsLoading(false);
        setLoadError(false);
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      };

      const renderDocumentViewer = () => {
        if (loadError) {
          return (
            <div className="w-full p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <div className="text-gray-500 mb-4">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="mb-4">Unable to display document</p>
              </div>
            </div>
          );
        }

        switch (fileType) {
          case 'ppt':
          case 'pptx':
          case 'xls':
          case 'xlsx':
          case 'csv':
            return (
              <div className="w-full h-screen border rounded-lg overflow-hidden relative">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                  </div>
                )}
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`}
                  className="w-full h-full"
                  title="Office Document"
                  frameBorder="0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              </div>
            );

          case 'pdf':
            if (isMobile) {
              return (
                <div className="w-full h-screen flex flex-col overflow-hidden">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  )}

                  {isIOS ? (
                    <div className="flex-1 w-full relative">
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title="PDF Document"
                        style={{
                          width: '100%',
                          height: '100%',
                          border: 'none',
                          overflow: 'hidden'
                        }}
                        scrolling="no"
                        onLoad={handleIframeLoad}
                        onError={() => {
                          setLoadError(false);
                          const iframe = document.querySelector('iframe[title="PDF Document"]') as HTMLIFrameElement;
                          if (iframe) {
                            iframe.src = documentUrl + '#toolbar=0&navpanes=0&scrollbar=0';
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 w-full relative">
                      <object
                        data={documentUrl}
                        type="application/pdf"
                        className="w-full h-full"
                        style={{ width: '100%', height: '100%' }}
                        onLoad={() => {
                          setIsLoading(false);
                          setLoadError(false);
                        }}
                        onError={() => {
                          // Fallback 1: Try Google Docs viewer
                          const container = document.querySelector('.flex-1.w-full.relative');
                          if (container) {
                            container.innerHTML = `
                    <iframe
                      src="https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true"
                      style="width: 100%; height: 100%; border: none;"
                      title="PDF Document"
                    ></iframe>
                  `;
                          }
                          setTimeout(() => setIsLoading(false), 3000);
                        }}
                      >
                        {/* Fallback for object tag */}
                        <iframe
                          src={`https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(documentUrl)}`}
                          className="w-full h-full border-0"
                          title="PDF Document"
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          onLoad={() => {
                            setIsLoading(false);
                            setLoadError(false);
                          }}
                          onError={() => {
                            // Final fallback: Direct link in new tab
                            window.open(documentUrl, '_blank');
                            setIsLoading(false);
                          }}
                        />
                      </object>
                    </div>
                  )}

                </div>
              );
            } else if (isTablet) {
              const pdfViewerUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(documentUrl)}`;

              return (
                <div className="w-full h-screen flex flex-col overflow-hidden">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  )}

                  <div className="flex-1 w-full relative">
                    <iframe
                      src={pdfViewerUrl}
                      className="w-full h-full border-0"
                      title="PDF Document"
                      style={{ width: '100%', height: '100%', border: 'none', overflow: 'hidden' }}
                      onLoad={() => {
                        setIsLoading(false);
                        setLoadError(false);
                      }}
                      onError={() => {
                        setLoadError(true);
                        window.open(documentUrl, '_blank');
                      }}
                    />

                    {loadError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-4 space-y-2">
                        <p className="text-gray-700">Failed to load PDF viewer.</p>
                        <a
                          href={documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 bg-blue-500 text-white rounded"
                        >
                          Open directly
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
            else {
              // Desktop PDF viewer
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
            }

          case 'doc':
          case 'docx':
            if (isMobile || isTablet) {
              return (
                <div className="w-full h-screen flex flex-col overflow-hidden">
                  <div className="flex-1 relative">
                    {isLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                      </div>
                    )}

                    {isAndroid ? (
                      // Android: Try multiple viewers in order
                      <iframe
                        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`}
                        className="w-full h-full border-0"
                        title="Word Document"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        onLoad={() => {
                          setIsLoading(false);
                          setLoadError(false);
                        }}
                        onError={() => {
                          // Fallback: Google Docs viewer
                          const iframe = document.querySelector('iframe[title="Word Document"]') as HTMLIFrameElement;
                          if (iframe) {
                            iframe.src = `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
                          }
                          setTimeout(() => setIsLoading(false), 3000);
                        }}
                      />
                    ) : (
                      // iOS: Google Docs viewer
                      <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`}
                        className="w-full h-full border-0"
                        title="Word Document"
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        onLoad={() => {
                          setIsLoading(false);
                          setLoadError(false);
                        }}
                        onError={() => {
                          const iframe = document.querySelector('iframe[title="Word Document"]') as HTMLIFrameElement;
                          if (iframe) {
                            iframe.src = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`;
                          }
                          setTimeout(() => setIsLoading(false), 5000);
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            } else {
              // Desktop Word viewer
              return (
                <div className="w-full h-screen border rounded-lg overflow-hidden relative">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  <iframe
                    src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`}
                    className="w-full h-full"
                    title="Word Document"
                    frameBorder="0"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                  />
                </div>
              );
            }

          default:
            return (
              <div className="w-full p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mb-4">Preview not available for this file type</p>
                </div>
              </div>
            );
        }
      };

      return (
        <div className={`w-full ${isMobile ? 'p-2' : 'p-5'}`}>
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

        .android-warning {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .fallback-buttons {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .fallback-btn {
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fallback-btn:hover {
          background: rgba(255,255,255,0.3);
          transform: translateY(-1px);
        }

        .camera-indicator {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
        }
      `}</style>

        <div className="surveyWrapper w-screen h-screen flex flex-col bg-gray-100 relative">

          {showQR && (
            <div
              className={`relative bg-white shadow-md px-4 py-3 z-50 ${isClosing ? 'qr-modal-exit' : 'qr-modal-enter'}`}
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
            className="flex-1 overflow-auto iframe-container" >
            <IframeWithPrefill
              src={jotFormUrl}
              prefillData={prefillData}
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