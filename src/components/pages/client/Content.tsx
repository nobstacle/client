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
import { Card, Button, Tag, Typography, Carousel, message, Modal, Image } from "antd";
import { LeftOutlined, RightOutlined, ExpandAltOutlined } from '@ant-design/icons';

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

const getLocalizedContent = (contentObj, langCode = 'en', fallback = '') => {
  // If contentObj is null or undefined, return fallback
  if (contentObj == null) return fallback;

  // If contentObj is a string, try to parse it as JSON (handle nested stringified JSON)
  if (typeof contentObj === 'string') {
    // If it's an empty string, return fallback
    if (contentObj.trim() === '') return fallback;

    // Try to parse as JSON if it looks like JSON
    if (contentObj.startsWith('{') || contentObj.startsWith('[')) {
      try {
        let parsed = contentObj;
        // Keep parsing until we get a non-string result or can't parse anymore
        while (typeof parsed === 'string' && (parsed.startsWith('{') || parsed.startsWith('['))) {
          try {
            const newParsed = JSON.parse(parsed);
            if (newParsed === parsed) break; // Avoid infinite loop
            parsed = newParsed;
          } catch {
            break;
          }
        }

        // If we end up with an object, process it for localization
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          const availableLanguages = Object.keys(parsed);
          if (availableLanguages.length === 0) return fallback;

          let preferredLanguage;
          if (availableLanguages.includes(langCode)) {
            preferredLanguage = langCode;
          } else if (availableLanguages.includes('en')) {
            preferredLanguage = 'en';
          } else {
            preferredLanguage = availableLanguages[0];
          }

          let result = parsed[preferredLanguage];
          if (typeof result === 'string' && (result.startsWith('{') || result.startsWith('['))) {
            return getLocalizedContent(result, langCode, fallback);
          }

          return result || fallback;
        }

        // If we end up with a string after parsing, return it
        if (typeof parsed === 'string') {
          return parsed;
        }

        // If we end up with an array, return it
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // If parsing fails, return the original string
        return contentObj;
      }
    }

    // If it doesn't look like JSON, return the string as-is
    return contentObj;
  }

  // If contentObj is an array, return it directly
  if (Array.isArray(contentObj)) {
    return contentObj;
  }

  // Handle localized object (with language keys)
  if (typeof contentObj === 'object') {
    const availableLanguages = Object.keys(contentObj);

    // If no languages available, return fallback
    if (availableLanguages.length === 0) return fallback;

    // Priority order: requested langCode first, then 'en' (English), then any other available language
    let preferredLanguage;
    if (availableLanguages.includes(langCode)) {
      preferredLanguage = langCode;
    } else if (availableLanguages.includes('en')) {
      preferredLanguage = 'en';
    } else {
      preferredLanguage = availableLanguages[0];
    }

    return contentObj[preferredLanguage] || fallback;
  }

  return fallback;
};

const PackageCard = ({ packageData, handleClick, loadingButton, langCode = 'en' }) => {
  const carouselRef = useRef();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isModalOpen, setisIsModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false); 
  const [selectedVideo, setSelectedVideo] = useState(null); 

  const formatCurrency = (price, currency = 'AED') => {
    return `${currency} ${price}`;
  };

  const handlePackageClick = (record) => {
    handleClick(record);
  };

  const openVideoModal = (videoUrl) => {
    setSelectedVideo(videoUrl);
    setIsVideoModalOpen(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalOpen(false);
    setSelectedVideo(null);
  };

  // Get localized content using the langCode - now this will work properly
  const packageName = getLocalizedContent(packageData.packageNames, langCode, 'Package');
  const packageDescription = getLocalizedContent(packageData.packageDescriptions, langCode, 'Package Description');
  const packageBenefits = getLocalizedContent(packageData.packageBenefits, langCode, []);
  const packageTags = getLocalizedContent(packageData.packageTags, langCode, []);
  const taxInformation = getLocalizedContent(packageData.taxInformation, langCode, '');
  const packageAlerts = getLocalizedContent(packageData.packageAlerts, langCode, '');
  const buttonText = getLocalizedContent(packageData.buttonTexts, langCode, 'Take this deal');
  const soldOutText = getLocalizedContent(packageData.soldOutTexts, langCode, 'Sold Out');
  const purchaseText = getLocalizedContent(packageData.purchaseText, langCode, 'Purchase Text');
  const popularityTexts = getLocalizedContent(packageData.popularityTexts, langCode, '');
  const currency = getLocalizedContent(packageData.currencies, langCode, 'AED');
  const priceAlgorithm = getLocalizedContent(packageData.priceAlgorithms, langCode, 'Price per unit');

  const closeModal = () => {
    setisIsModalOpen(false);
  }

  // Check if package is sold out
  const isSoldOut = packageData.toCategory?.soldOut === true;

  // Get image array and deduplicate
  // const rawImageArray = packageData.signedImageUrls || packageData.images || [];

  const imageArray = [
    ...(packageData.signedImageUrls?.length
      ? packageData.signedImageUrls
      : packageData.images || []
    ).map((img) => ({
      type: "image",
      url: img.signedUrl || img.url || img,
      alt: img.alt || "Package Image",
      order: img.order || 0,
    }))
  ].sort((a, b) => (a.order || 0) - (b.order || 0));

  const videoArray = (packageData.videos || []).map((vid, idx) => ({
    type: "video",
    url: vid.url,
    alt: vid.tag || "Package Video",
    order: vid.order || idx + 1,
  })).sort((a, b) => (a.order || 0) - (b.order || 0));

  const hasMultipleImages = imageArray.length > 1;
  const hasVideos = videoArray.length > 0;

  useEffect(() => {
    setCurrentSlide(0);
  }, [imageArray.length]);

  // Carousel change handler
  const handleSlideChange = (currentSlideIndex) => {
    setCurrentSlide(currentSlideIndex);
  };

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
  const charLimit = 120;
  let displayText = packageDescription;
  if (!expanded && packageDescription?.length > charLimit) {
    displayText = (
      <>
        {packageDescription.slice(0, charLimit)}...{" "}
        <button
          onClick={() => setExpanded(true)}
          className="text-blue-500 font-medium hover:underline"
        >
          Show More
        </button>
      </>
    );
  } else if (expanded) {
    displayText = (
      <>
        {packageDescription}{" "}
        <button
          onClick={() => setExpanded(false)}
          className="ml-2 text-blue-500 font-medium hover:underline"
        >
          Show Less
        </button>
      </>
    );
  }

  const openBigModal = () => {
    setisIsModalOpen(true);
  }


  return (
    <>

      <Card
        className=" w-full max-w-7xl mx-auto shadow-lg rounded-lg overflow-hidden mb-6"
        bodyStyle={{ padding: 0 }}
      >
        <div className="flex flex-col md:flex-row lg:flex-row ">
          {/* Image Section */}
          <div className="relative w-full md:w-[300px] lg:w-[375px] xl:w-[500px] flex-shrink-0 flex items-center justify-center min-h-[35vh]">
            {imageArray.length > 0 ? (
              <div className="relative w-full " style={{ padding: '1rem' }} >
                <Carousel
                  ref={carouselRef}
                  arrows={hasMultipleImages}
                  prevArrow={<CustomPrevArrow />}
                  nextArrow={<CustomNextArrow />}
                  dots={false}
                  infinite={hasMultipleImages}
                  style={{ height: '100%' }}
                  afterChange={handleSlideChange}
                  beforeChange={(from, to) => setCurrentSlide(to)}
                >
                  {imageArray.map((item, index) => (
                    <div
                      key={`${packageData.id}-${index}`}
                      className="w-full h-full flex items-center justify-center relative"
                    >
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="w-full h-full object-cover object-center"
                        style={{
                          borderRadius: '8px',
                          height: '100%',
                          maxHeight: '35vh',
                          minHeight: '35vh',
                          filter: isSoldOut ? 'grayscale(100%) brightness(0.7)' : 'none'
                        }}
                      />

                      {/* Expand Icon Top Right */}
                      <div
                        className="absolute top-2 right-2 bg-black/50 p-2 rounded-full cursor-pointer hover:bg-black/70 transition"
                        onClick={openBigModal}
                        style={{ height: "36px", width: "35px", textAlign: "center" }}
                      >
                        <ExpandAltOutlined style={{ color: "white", fontSize: "16px" }} />
                      </div>
                    </div>
                  ))}
                </Carousel>

                {hasVideos && !isSoldOut && (
                  <div
                    className="absolute bottom-2 right-2 bg-blue-600/90 hover:bg-blue-700 p-3 rounded-full cursor-pointer transition z-10 flex items-center justify-center"
                    onClick={() => openVideoModal(videoArray[0].url)}
                    style={{ height: "48px", width: "48px" }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="white"
                      viewBox="0 0 24 24"
                      style={{ width: "24px", height: "24px" }}
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}

                {/* Image counter - Only show if more than one image */}
                {hasMultipleImages && (
                  <div className="absolute top-2 left-1 bg-black/50 text-white px-2 py-1 rounded text-xs z-10">
                    {currentSlide + 1} / {imageArray.length}
                  </div>
                )}

                {/* Sold Out Overlay */}
                {isSoldOut && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                      {soldOutText}
                    </div>
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
          <div className="flex-1 p-4 sm:p-6 flex sm:flex-col  mt-4 md:mt-0" >
            {/* Top Section */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
              {/* Left side - Package info */}
              <div className="flex-1">
                <Title level={3} className={`mb-2 mt-0 text-lg sm:text-xl lg:text-2xl ${isSoldOut ? 'text-gray-500' : 'text-blue-600'}`} style={{ color: isSoldOut ? '#9ca3af' : '#006ce4' }}>
                  {packageName}
                </Title>

                {/* Tags */}
                {packageTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Array.isArray(packageTags) && packageTags.map((tag, index) => (
                      <Tag key={index} className={`px-2 sm:px-3 py-1 border-green-800 rounded text-xs sm:text-sm ${isSoldOut ? 'bg-gray-400 text-gray-600 border-gray-400' : 'bg-green-800 text-white'}`}>
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </div>

              {/* Right side - Best seller/sold out and sold info */}
              <div className="text-left sm:text-right flex-shrink-0">
                <Text className={`font-bold mb-2 block text-sm sm:text-base ${isSoldOut ? 'text-red-600' : 'text-gray-600'}`}>
                  {popularityTexts}
                </Text>
                <Text className="text-xs sm:text-sm text-gray-500">
                  {packageData.totalPackagesSold || 0} {purchaseText}
                </Text>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col sm:flex-row lg:flex-row gap-6 flex-1">
              {/* Description and Benefits */}
              <div className="flex-1">
                {/* Description */}
                <div className="mb-4">
                  <Text className="font-bold mb-3 block text-sm sm:text-base text-gray-700">
                    {displayText}
                  </Text>
                  {/* Benefits */}
                  {packageBenefits.length > 0 && (
                    <div className="space-y-1">
                      {Array.isArray(packageBenefits) && packageBenefits.map((benefit, index) => (
                        <div key={index} className={`font-medium flex items-center text-sm sm:text-base ${isSoldOut ? 'text-gray-400' : 'text-green-600'}`}>
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
                    <Text className={`font-medium text-sm sm:text-base ${isSoldOut ? 'text-gray-400' : 'text-red-600'}`}>
                      {packageAlerts}
                    </Text>
                  </div>
                )}
              </div>

              {/* Price and Button Section */}
              <div className="lg:w-44 flex flex-col justify-end">
                <div className="text-left lg:text-right pb-2">
                  {/* Price Algorithm Label */}
                  <Text className={`text-xs sm:text-sm mb-2 block ${isSoldOut ? 'text-gray-400' : 'text-gray-500'}`}>
                    {priceAlgorithm}
                  </Text>

                  {/* Pricing Block */}
                  <div className="mb-4">
                    <div className="flex items-center justify-start lg:justify-end gap-2 mb-1 flex-wrap">
                      <Text className={`text-sm line-through order-2 lg:order-1 ${isSoldOut ? 'text-gray-300' : 'text-gray-400'}`}>
                        {formatCurrency(packageData.originalPrice, currency)}
                      </Text>
                      <Text className={`text-xl sm:text-2xl font-bold order-1 lg:order-2 ${isSoldOut ? 'text-gray-400' : 'text-black'}`}>
                        {formatCurrency(packageData.discountedPrice, currency)}
                      </Text>
                    </div>
                    <Text className={`text-xs sm:text-sm ${isSoldOut ? 'text-gray-400' : 'text-gray-500'}`}>
                      {taxInformation}
                    </Text>
                  </div>

                  {/* Button */}
                  <Button
                    type="primary"
                    size="large"
                    className={`!px-6 !sm:!px-8 py-2 h-10 sm:h-12 min-w-[150px] w-full  text-sm sm:text-base flex justify-center items-center ${isSoldOut
                      ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    disabled={!packageData.active || loadingButton || isSoldOut}
                    onClick={() => !isSoldOut && handlePackageClick(packageData)}
                  >
                    {loadingButton ? 'Loading..' : (isSoldOut ? soldOutText : buttonText)}
                  </Button>

                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={isModalOpen}
        onCancel={closeModal}
        footer={false}
        width="90%"
        bodyStyle={{ height: '80vh', padding: '1rem' }}
        style={{ top: 20 }}
      >
        <>
          {imageArray.length > 0 ? (
            <div
              className="relative w-full h-full"
              style={{ height: '100%', width: '100%' }}
            >
              <Carousel
                ref={carouselRef}
                arrows={hasMultipleImages}
                prevArrow={<CustomPrevArrow />}
                nextArrow={<CustomNextArrow />}
                dots={false}
                infinite={hasMultipleImages}
                style={{ height: '100%', width: '100%' }}
                afterChange={handleSlideChange}
                beforeChange={(from, to) => setCurrentSlide(to)}
                className="package-modal-carousel"
              >
                {imageArray.map((item, index) => (
                  <div key={`modal-image-${index}`} className="w-full h-full flex items-center justify-center">
                    <Image
                      preview={false}
                      src={item.url}
                      alt={item.alt || `Package Image ${index + 1}`}
                      className="object-contain w-full h-full"
                      style={{
                        width: "100%",
                        height: "100%",
                        maxHeight: "75vh",
                        borderRadius: "8px",
                        filter: isSoldOut ? "grayscale(100%) brightness(0.7)" : "none",
                      }}
                    />
                  </div>
                ))}
              </Carousel>

              {hasMultipleImages && (
                <div className="absolute top-2 left-1 bg-black/50 text-white px-2 py-1 rounded text-xs z-10">
                  {currentSlide + 1} / {imageArray.length}
                </div>
              )}

              {isSoldOut && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                    {soldOutText}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <Text className="text-gray-500">No Media Available</Text>
            </div>
          )}
        </>
      </Modal>
      <Modal
        open={isVideoModalOpen}
        onCancel={closeVideoModal}
        footer={false}
        width="90%"
        bodyStyle={{ height: '80vh', padding: '1rem', backgroundColor: 'black' }}
        style={{ top: 20 }}
      >
        <div className="w-full h-full flex items-center justify-center">
          {selectedVideo && (
            <video
              autoPlay
              controls
              loop
              playsInline
              src={selectedVideo}
              className="w-full h-full object-contain"
              style={{
                maxHeight: "75vh",
                borderRadius: "8px",
              }}
            />
          )}
        </div>
      </Modal>
    </>
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
  const [isMuted, setIsMuted] = useState(true);
  const [showUnmutePrompt, setShowUnmutePrompt] = useState(true);
  const [contentToDisplay, setContentToDisplay] = useState(null);
  const [pdfKey, setPdfKey] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const pdfLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isIPad, setIsIPad] = useState(false);

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
    if (contentToDisplay?.type?.includes("Document") ||
      contentToDisplay?.type?.includes("Pdf")) {
      setIsLoading(true);
      setLoadError(false);
      setPdfKey(prev => prev + 1);
      setRetryCount(0);

      if (pdfLoadTimeoutRef.current) {
        clearTimeout(pdfLoadTimeoutRef.current);
      }

      // Longer timeout for mobile and tablet devices
      const timeout = isMobile ? 15000 : (isTablet || isIPad) ? 18000 : 10000;
      pdfLoadTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        // Don't auto-set error, let iframe handle it
      }, timeout);
    }

    return () => {
      if (pdfLoadTimeoutRef.current) {
        clearTimeout(pdfLoadTimeoutRef.current);
      }
    };
  }, [messageStore.receivedContent?.content, contentToDisplay?.type, isMobile, isTablet, isIPad]);
  useEffect(() => {
    const userAgent = navigator.userAgent;

    // More accurate iPad detection including newer iPads that identify as MacOS
    const isIPadDevice = /iPad/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const isIPhoneDevice = /iPhone|iPod/.test(userAgent);
    const isIOSDevice = isIPadDevice || isIPhoneDevice;
    const isAndroidDevice = /Android/i.test(userAgent);

    // Only Android tablets, NOT iPad
    const isAndroidTablet = /Android(?!.*Mobile)/i.test(userAgent);

    // For mobile, exclude iPad
    const isMobileDevice = (isIPhoneDevice || (isAndroidDevice && !isAndroidTablet));

    setIsMobile(isMobileDevice);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsTablet(isAndroidTablet); // This will be false for iPad
    setIsIPad(isIPadDevice); // Add new state for iPad
  }, []);

  useEffect(() => {
    if (contentToDisplay === null && defaultSlideshowContent.data) {
      setContentToDisplay({
        type: "Slideshow",
        content: defaultSlideshowContent.data,
      });
    }
  }, [defaultSlideshowContent.data, contentToDisplay]);

  useEffect(() => {
    if (messageStore.receivedType === "Recording") {
      const lastContent = localStorage.getItem('lastDisplayedContent');
      if (lastContent) {
        try {
          const parsed = JSON.parse(lastContent);
          setContentToDisplay(parsed);
          message.info("This conversation is recorded for quality and training purposes");
        } catch (error) {
          console.error("Failed to parse last content:", error);
          setContentToDisplay(null);
        }
      }
    } else if (messageStore.receivedType) {
      setContentToDisplay({
        type: messageStore.receivedType,
        content: messageStore.receivedContent,
        survey: messageStore.receivedSurvey,
        messages: messageStore.receivedMessage
      });
    } else {
      setContentToDisplay(null);
    }
  }, [messageStore.receivedType, messageStore.receivedContent, messageStore.receivedSurvey, messageStore.receivedMessage]);

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

      const video = videoElement.current;

      const handleLoadedMetadata = () => {
        // Force video to cover the entire viewport
        video.style.width = '100vw';
        video.style.height = '100vh';
        video.style.objectFit = 'contain';
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
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
      if (videoElement.current) {
        videoElement.current.style.width = '100vw';
        videoElement.current.style.height = '100vh';
        videoElement.current.style.objectFit = 'contain';
      }
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
      let content = '';
      // Handle different message types
      if (messageStore.receivedType === "MapTemplateQr") {
        const origin = messageStore.receivedContent?.content;
        const destination = messageStore.receivedContent?.extraContent;

        if (origin && destination) {
          // Create Google Maps directions URL for QR code
          const googleMapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}`;
          content = googleMapsUrl;

        } else if (origin) {
          content = origin;
        } else if (destination) {
          content = destination;
        }
      } else if (messageStore.receivedContent?.directContent === 'QR') {
        // For Image with QR, decode the URL properly
        const rawContent = messageStore.receivedContent?.content;

        // If the URL is already a valid signed URL, use it directly
        // Otherwise, try to extract the clean URL
        try {
          const urlObj = new URL(rawContent);

          // Check if it's a Google Cloud Storage URL
          if (urlObj.hostname.includes('storage.googleapis.com')) {
            content = rawContent; // Use the full signed URL as-is
          } else {
            content = rawContent;
          }
        } catch (error) {
          console.error("Invalid URL format:", error);
          content = rawContent; // Fallback to raw content
        }
      } else {
        // For other types, use the existing logic
        content = messageStore.receivedContent?.content;
      }

      if (content) {
        try {
          const url = await QRCode.toDataURL(content);
          setQrCodeUrl(url);
          const wdthSize = window.innerWidth;
          if (wdthSize > 650) {
            setIsClosing(false);
            setContentKey(prev => prev + 1);
            setTimeout(() => {
              setShowQR(true);
            }, 3000);
          }
        } catch (err) {
          console.error("Failed to generate QR code", err);
        }
      }
    };

    if (
      messageStore.receivedType === ("JotFormMessage" as any) ||
      messageStore.receivedType === 'WebsiteTemplateQr' ||
      messageStore.receivedType === 'MapTemplateQr' ||
      messageStore.receivedContent?.directContent === 'QR'
    ) {
      generateQR();
    }

  }, [messageStore.receivedContent?.content, messageStore.receivedContent?.extraContent, messageStore.receivedContent?.directContent]);

  useEffect(() => {
    if (messageStore.receivedType && messageStore.receivedType !== "Recording") {
      const contentToStore = {
        type: messageStore.receivedType,
        content: messageStore.receivedContent,
        survey: messageStore.receivedSurvey,
        messages: messageStore.receivedMessage,
        timestamp: Date.now()
      };
      localStorage.setItem('lastDisplayedContent', JSON.stringify(contentToStore));
    }
  }, [messageStore.receivedType, messageStore.receivedContent, messageStore.receivedSurvey, messageStore.receivedMessage]);

  useEffect(() => {
    if (messageStore.receivedType === "Recording") {
      const lastContent = localStorage.getItem('lastDisplayedContent');
      if (lastContent) {
        try {
          const parsed = JSON.parse(lastContent);
          setContentToDisplay(parsed);
          message.info("This conversation is recorded for quality and training purposes");
        } catch (error) {
          console.error("Failed to parse last content:", error);
          setContentToDisplay(null);
        }
      }
    } else if (messageStore.receivedType) {
      setContentToDisplay({
        type: messageStore.receivedType,
        content: messageStore.receivedContent,
        survey: messageStore.receivedSurvey,
        messages: messageStore.receivedMessage
      });
    }
  }, [messageStore.receivedType, messageStore.receivedContent, messageStore.receivedSurvey, messageStore.receivedMessage]);

  useEffect(() => {
    localStorage?.removeItem("lastDisplayedContent");
  }, []);

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
      parseData.forEach((pkg) => {
        initialIndexes[pkg.id] = 0;
      });
      setPackageImageIndexes(initialIndexes);
      const intervals = [];

      parseData.forEach((pkg) => {
        // Only auto-rotate images, not videos
        const images = pkg.signedImageUrls || pkg.images || [];
        if (images.length > 1) {
          const interval = setInterval(() => {
            setPackageImageIndexes(prev => ({
              ...prev,
              [pkg.id]: (prev[pkg.id] + 1) % images.length
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

  const renderMobilePDF = (documentUrl: string) => {
    const handleRetry = () => {
      setRetryCount(prev => prev + 1);
      setPdfKey(prev => prev + 1);
      setIsLoading(true);
      setLoadError(false);
    };

    const handleLoadSuccess = () => {
      setIsLoading(false);
      setLoadError(false);
      if (pdfLoadTimeoutRef.current) {
        clearTimeout(pdfLoadTimeoutRef.current);
      }
    };

    const handleLoadFailure = () => {
      setIsLoading(false);
      setLoadError(true);
      if (pdfLoadTimeoutRef.current) {
        clearTimeout(pdfLoadTimeoutRef.current);
      }
    };

    // Strategy selection based on retry count and device type
    const getViewerStrategy = () => {
      if (isIOS) {
        // iOS strategies in order of preference
        switch (retryCount % 3) {
          case 0:
            return `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
          case 1:
            return documentUrl + '#toolbar=0&navpanes=0&scrollbar=0';
          case 2:
            return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(documentUrl)}`;
          default:
            return documentUrl;
        }
      } else {
        // Android strategies
        switch (retryCount % 3) {
          case 0:
            return documentUrl;
          case 1:
            return `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
          case 2:
            return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(documentUrl)}`;
          default:
            return documentUrl;
        }
      }
    };

    const viewerUrl = getViewerStrategy();

    return (
      <div className="w-full h-screen flex flex-col overflow-hidden" key={pdfKey}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600 text-sm">Loading PDF...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-4 space-y-4 z-20">
            <svg className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-700 text-center font-medium">Unable to load PDF</p>
            <div className="flex flex-col space-y-2 w-full max-w-xs">
              <button
                onClick={handleRetry}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Try Again {retryCount > 0 ? `(Attempt ${retryCount + 1})` : ''}
              </button>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-center"
              >
                Open in New Tab
              </a>
            </div>
          </div>
        )}

        <div className="flex-1 w-full relative">
          {isAndroid && retryCount === 0 ? (
            // Android: Try native object tag first
            <object
              key={`pdf-object-${pdfKey}`}
              data={documentUrl}
              type="application/pdf"
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
              onLoad={handleLoadSuccess}
            >
              <iframe
                key={`pdf-fallback-iframe-${pdfKey}`}
                src={viewerUrl}
                className="w-full h-full border-0"
                title="PDF Document"
                style={{ width: '100%', height: '100%', border: 'none' }}
                onLoad={handleLoadSuccess}
                onError={handleLoadFailure}
              />
            </object>
          ) : (
            // iOS and Android fallbacks: Use iframe
            <iframe
              key={`pdf-iframe-${pdfKey}-${retryCount}`}
              src={viewerUrl}
              className="w-full h-full border-0"
              title="PDF Document"
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              onLoad={handleLoadSuccess}
              onError={handleLoadFailure}
            />
          )}
        </div>

        {/* Helper text at bottom */}
        {!isLoading && !loadError && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            Swipe to scroll PDF
          </div>
        )}
      </div>
    );
  };


const renderIPadPDF = (documentUrl: string) => {
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setPdfKey(prev => prev + 1);
    setIsLoading(true);
    setLoadError(false);
  };

  const handleLoadSuccess = () => {
    setIsLoading(false);
    setLoadError(false);
    if (pdfLoadTimeoutRef.current) {
      clearTimeout(pdfLoadTimeoutRef.current);
    }
  };

  const handleLoadFailure = () => {
    setIsLoading(false);
    setLoadError(true);
    if (pdfLoadTimeoutRef.current) {
      clearTimeout(pdfLoadTimeoutRef.current);
    }
  };

  // Simple strategy - same as mobile iOS
  const getViewerStrategy = () => {
    switch (retryCount % 3) {
      case 0:
        // Google Docs viewer first - works great on iPad
        return `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
      case 1:
        // Native Safari viewer
        return documentUrl;
      case 2:
        // Office viewer as last resort
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`;
      default:
        return documentUrl;
    }
  };

  const viewerUrl = getViewerStrategy();

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden" key={`ipad-pdf-${pdfKey}`}>
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600 text-sm">Loading PDF...</p>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-4 space-y-4 z-20">
          <svg className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-gray-700 text-center font-medium">Unable to load PDF</p>
          <div className="flex flex-col space-y-2 w-full max-w-xs">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              Try Again {retryCount > 0 ? `(Attempt ${retryCount + 1}/3)` : ''}
            </button>
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition text-center"
            >
              Open in Safari
            </a>
            <a
              href={documentUrl}
              download
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-center"
            >
              Download PDF
            </a>
          </div>
        </div>
      )}

      <div className="flex-1 w-full relative">
        <iframe
          key={`ipad-iframe-${pdfKey}-${retryCount}`}
          src={viewerUrl}
          className="w-full h-full border-0"
          title="PDF Document"
          style={{ width: '100%', height: '100%', border: 'none' }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={handleLoadSuccess}
          onError={handleLoadFailure}
        />
      </div>

      {/* Helper text at bottom */}
      {!isLoading && !loadError && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
          Swipe to scroll PDF
        </div>
      )}
    </div>
  );
};

  // 4. Keep your renderTabletPDF for Android tablets ONLY
  const renderAndroidTabletPDF = (documentUrl: string) => {
    const handleRetry = () => {
      setRetryCount(prev => prev + 1);
      setPdfKey(prev => prev + 1);
      setIsLoading(true);
      setLoadError(false);
    };

    const handleLoadSuccess = () => {
      setIsLoading(false);
      setLoadError(false);
      if (pdfLoadTimeoutRef.current) {
        clearTimeout(pdfLoadTimeoutRef.current);
      }
    };

    const handleLoadFailure = () => {
      setTimeout(() => {
        setIsLoading(false);
        setLoadError(true);
      }, 1000);
    };

    // Android tablet viewer strategy
    const getAndroidTabletViewerUrl = () => {
      switch (retryCount % 3) {
        case 0:
          return `https://docs.google.com/viewer?url=${encodeURIComponent(documentUrl)}&embedded=true`;
        case 1:
          return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(documentUrl)}`;
        case 2:
          return documentUrl;
        default:
          return documentUrl;
      }
    };

    const viewerUrl = getAndroidTabletViewerUrl();

    return (
      <div className="w-full h-screen flex flex-col overflow-hidden bg-gray-50" key={`android-tablet-${pdfKey}`}>
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mb-4"></div>
            <p className="text-gray-700 text-lg font-medium">Loading PDF...</p>
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white p-6 space-y-4 z-20">
            <svg className="h-20 w-20 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-gray-800 text-center font-semibold text-lg">Failed to load PDF</p>
            <div className="flex flex-col space-y-3 w-full max-w-md">
              <button
                onClick={handleRetry}
                className="px-8 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-lg"
              >
                Try Again {retryCount > 0 ? `(${retryCount + 1}/3)` : ''}
              </button>
              <a
                href={documentUrl}
                download
                className="px-8 py-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition text-center text-lg"
              >
                Download PDF
              </a>
              <a
                href={documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-center text-lg"
              >
                Open in Browser
              </a>
            </div>
          </div>
        )}

        <div className="flex-1 w-full relative">
          <iframe
            key={`android-tablet-iframe-${pdfKey}-${retryCount}`}
            src={viewerUrl}
            className="w-full h-full border-0"
            title="PDF Document"
            style={{ width: '100%', height: '100%', border: 'none' }}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            onLoad={handleLoadSuccess}
            onError={handleLoadFailure}
          />
        </div>
      </div>
    );
  };

  const getFormData = async (url: string): Promise<{ url: string, prefillData: Record<string, string> } | null> => {
    try {
      // Parse the URL to extract UUID and prefill data
      let uuid: string | null = null;
      const prefillData: Record<string, string> = {};

      // Try to extract UUID from path (format: /forms/{uuid})
      const pathMatch = url.match(/\/forms\/([^/?]+)/);
      if (pathMatch) {
        uuid = pathMatch[1];
      }

      // Parse URL parameters for both UUID and prefill data
      try {
        const urlObj = new URL(url);

        // If UUID wasn't found in path, check query params
        if (!uuid) {
          uuid = urlObj.searchParams.get("uuid");
        }

        // Extract all query parameters as prefill data
        urlObj.searchParams.forEach((value, key) => {
          if (key !== 'uuid') {
            prefillData[key] = value;
          }
        });
      } catch (urlError) {
        // If URL parsing fails, try to extract from query string manually
        const queryMatch = url.match(/[?&]uuid=([^&]+)/);
        if (queryMatch && !uuid) {
          uuid = queryMatch[1];
        }

        // Extract other parameters
        const paramMatches = url.matchAll(/[?&]([^=]+)=([^&]+)/g);
        for (const match of paramMatches) {
          const [, key, value] = match;
          if (key !== 'uuid') {
            prefillData[key] = decodeURIComponent(value);
          }
        }
      }

      if (!uuid) {
        console.error("UUID not found in URL");
        return null;
      }

      // Fetch the form data from backend
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

      // Build new URL with form ID
      const newUrl = new URL(`https://form.jotform.com/${result.data.formId}`);

      // Add the UUID to the new URL
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
    station?: number
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
        soldBy: sellingPerson.id,
        station: parseInt(params.get("station"))
      };

      await createUpsellTransaction(upsellData);
      message.success(`Package "${packageData?.packageNames?.en || ''}" purchased!\nConfirmation: ${confirmationNumber}`);
      setLoading(false);
      messageStore.reset();
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

  useEffect(() => {
    if (messageStore.receivedType === "Video") {
      setIsMuted(true);
      setShowUnmutePrompt(true);

      const timer = setTimeout(() => {
        setShowUnmutePrompt(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [messageStore.receivedContent?.content, messageStore.receivedType]);

  const handleUnmute = () => {
    if (videoElement.current) {
      videoElement.current.muted = false;
      setIsMuted(false);
      setShowUnmutePrompt(false);
    }
  };

  const toggleMute = () => {
    if (videoElement.current) {
      const newMutedState = !isMuted;
      videoElement.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  if (hasHydrated) {
    return (
      <>
        {(contentToDisplay?.type === "TextTemplateMessage" ||
          contentToDisplay?.type === "Text") && (
            <div className="w-full p-5">
              <p className="text-center text-4xl" style={{ lineHeight: "3.5rem", whiteSpace: 'pre-wrap' }}>
                {messageStore.receivedContent?.content ?? ""}
              </p>
            </div>
          )}

        {contentToDisplay?.type === 'Packages' && (() => {
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

          const currentLangCode = messageStore.receivedContent?.langCode || 'en';

          // Helper function to merge category images with package images
          const mergeImages = (packageImages, toCategory) => {
            let combinedImages = [...(packageImages || [])];

            if (toCategory && toCategory.signedImages && Array.isArray(toCategory.signedImages)) {
              const categoryImages = toCategory.signedImages.map((img, index) => ({
                alt: `Category image ${index + 1}`,
                url: img.url,
                order: (packageImages?.length || 0) + index + 1,
                signedUrl: img.signedUrl
              }));

              combinedImages = [...combinedImages, ...categoryImages];
            }

            return combinedImages;
          };

          const processedPackages = parseData.map(pkg => ({
            ...pkg,
            signedImageUrls: pkg.to_category_id ?
              mergeImages(pkg.signedImageUrls, pkg.toCategory) :
              pkg.signedImageUrls
          }));

          const sortedPackages = processedPackages.sort((a, b) => {
            const purchasesA = a.totalPackagesSold || 0;
            const purchasesB = b.totalPackagesSold || 0;
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
                  langCode={currentLangCode}
                  handleClick={(data) => handlePackageClicked(data)}
                  loadingButton={loading}
                />
              ))}
            </div>
          );
        })()}

        {contentToDisplay?.type === "ChatMessage" && (
          <div className="flex w-full flex-col items-center justify-center gap-2 p-4">
            <div className="w-full max-w-[100%] sm:max-w-[75%] md:max-w-[50%]">
              <ChatBox
                ref={chatBoxRef}
                messages={messageStore.receivedMessage}
                sendMessage={sendMessage}
              />
            </div>
          </div>
        )}

        {contentToDisplay?.type === "Image" && (
          <>
            {messageStore.receivedContent?.directContent === 'QR' ? (
              <Card>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-96 h-96 object-cover"
                />
              </Card>
            ) : (
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
            )}
          </>
        )}


        {(contentToDisplay?.type === "Document" ||
          contentToDisplay?.type === "Documents" ||
          contentToDisplay?.type === "PdfDocument" ||
          contentToDisplay?.type === "WordDocument" ||
          contentToDisplay?.type === "ExcelDocument" ||
          contentToDisplay?.type === "PowerPointDocument" ||
          contentToDisplay?.type === "CsvDocument") && (() => {

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
                  if (isIPad) {
                    // iPad - use iPad-specific renderer
                    return renderIPadPDF(documentUrl);
                  } else if (isMobile) {
                    // iPhone or Android phone
                    return renderMobilePDF(documentUrl);
                  } else if (isTablet) {
                    // Android tablet only (iPad is handled above)
                    return renderAndroidTabletPDF(documentUrl);
                  } else {
                    // Desktop - keep existing code
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
                          onLoad={() => {
                            setIsLoading(false);
                            setLoadError(false);
                          }}
                          onError={() => {
                            setIsLoading(false);
                            setLoadError(true);
                          }}
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
              <>
                {messageStore.receivedContent?.directContent === 'QR' ? (
                  <Card>
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-96 h-96 object-cover"
                    />
                  </Card>
                ) : (
                  <div className={`w-full ${isMobile ? 'p-2' : 'p-5'}`}>
                    {renderDocumentViewer()}
                  </div>
                )}
              </>
            );
          })()}

        {contentToDisplay?.type === "Video" && (
          messageStore.receivedContent?.directContent === 'QR' ? (
            <Card>
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-96 h-96 object-cover"
              />
            </Card>
          ) : (
            <>
              <style jsx>{`
        @keyframes fadeOut {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }

        .fade-out-prompt {
          animation: fadeOut 3s forwards;
        }

        .video-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          z-index: 9;
          background-color: black;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fullscreen-video {
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          object-fit: contain !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          display: block !important;
        }
      `}</style>

              <div className="video-container">
                <video
                  ref={videoElement}
                  autoPlay
                  muted={isMuted}
                  loop
                  playsInline
                  preload="auto"
                  className="fullscreen-video"
                  key={messageStore.receivedContent?.content ?? ""}
                  onLoadedData={() => {
                    if (videoElement.current) {
                      videoElement.current.muted = isMuted;
                      videoElement.current.play().catch(err => {
                        console.error("Video play failed:", err);
                      });
                    }
                  }}
                >
                  <source
                    src={messageStore.receivedContent?.content ?? ""}
                    type="video/mp4"
                  />
                </video>

                {/* Tap-to-unmute overlay */}
                {showUnmutePrompt && (
                  <div
                    onClick={handleUnmute}
                    className="fade-out-prompt"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      zIndex: 10,
                    }}
                  >
                    <div
                      style={{
                        padding: '16px 32px',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        borderRadius: '50px',
                        color: 'white',
                        fontSize: '18px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>🔇</span>
                      Tap for sound
                    </div>
                  </div>
                )}

                {/* Mute/Unmute toggle button */}
                {!showUnmutePrompt && (
                  <button
                    onClick={toggleMute}
                    style={{
                      position: 'absolute',
                      bottom: '20px',
                      right: '20px',
                      pointerEvents: 'auto',
                      width: '48px',
                      height: '48px',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(5px)',
                      transition: 'all 0.2s ease',
                      zIndex: 11,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {isMuted ? '🔇' : '🔊'}
                  </button>
                )}
              </div>
            </>
          )
        )}

        {contentToDisplay?.type === "Slideshow" && (
          messageStore.receivedContent?.directContent === 'QR' ? (
            <Card>
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-96 h-96 object-cover"
              />
            </Card>
          ) : (
            <>
              <Slideshow contents={messageStore.receivedContent?.contents ?? contentToDisplay?.contents ?? defaultSlideshowContent.data?.contents ?? []} />
            </>
          )
        )}

        {(contentToDisplay?.type === "Map" ||
          contentToDisplay?.type?.includes("Map") ||
          contentToDisplay?.content?.type === "Map" ||
          messageStore.receivedType?.includes("Map")
        ) && (
            <div className="w-full h-full">
              {/* QR version */}
              {["MapTemplateQr", "WebsiteTemplateQr"].includes(contentToDisplay?.type) ? (
                <div className="flex justify-center items-center h-screen bg-gray-50">
                  <Card>
                    <img src={qrCodeUrl} alt="QR Code" className="w-96 h-96" />
                  </Card>
                </div>
              ) : (
                /* Normal interactive map */
                <SimpleMap
                  destination={messageStore.receivedContent?.extraContent ??
                    contentToDisplay?.content?.extraContent ?? ""}
                  origin={messageStore.receivedContent?.content ??
                    contentToDisplay?.content?.content ?? ""}
                  languageCode={messageStore.receivedContent?.langCode ?? "en"}
                />
              )}
            </div>
          )}

        {contentToDisplay?.type === "Survey" && messageStore.receivedSurvey && (
          <SurveyAnswer
            tag={messageStore.receivedSurvey.tag}
            survey={messageStore.receivedSurvey}
            handleComplete={() => messageStore.reset()}
            data={data?.user}
          />
        )}

        {(contentToDisplay?.type === ("JotFormMessage" as any)) && (
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
        )}

        {(
          contentToDisplay?.type === "Website" ||
          contentToDisplay?.type === "WebsiteTemplateQr" ||
          contentToDisplay?.type === "WebsiteTemplateMessage"
        ) && (
            contentToDisplay?.type === 'WebsiteTemplateQr' || messageStore.receivedContent?.directContent === 'QR' ? (
              <Card>
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-96 h-96 object-cover"
                />
              </Card>
            ) : (
              <iframe
                className="h-full w-full"
                src={messageStore.receivedContent?.content ?? ""}
              />
            )
          )}

      </>
    );
  }

  if (isFirstTimeOpen && defaultSlideshowContent.data)
    return (
      <>
        <Slideshow contents={defaultSlideshowContent.data?.contents ?? contentToDisplay?.contents ?? []} />
      </>
    );

  return <div></div>;
};