/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo, useRef } from "react";
import NextImage from "next/image";
import SafeContentFrame from "./SafeContentFrame";
import { getContainMediaStyle } from "../../../utils/contentFit";

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "m4v"];

interface SlideshowMediaMetadata {
  mediaType?: "image" | "video";
  expiresAt?: string;
  durationSeconds?: number;
}

interface ResolvedSlideshowMediaItem {
  url: string;
  mediaType: "image" | "video";
  expiresAt?: string;
  durationSeconds?: number;
}

const isVideoSource = (src: string): boolean => {
  if (!src) return false;
  const normalized = src.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => normalized.endsWith(`.${ext}`));
};

const preloadMediaWithRetry = (
  src: string,
  onProgress: (success: boolean) => void,
  maxRetries = 3,
  retryDelayMs = 1000
): (() => void) => {
  let cancelled = false;
  let attempt = 0;
  let cleanupFunc: (() => void) | null = null;

  const startPreload = () => {
    if (cancelled) return;
    attempt++;

    let settled = false;
    const handleSuccess = () => {
      if (settled || cancelled) return;
      settled = true;
      onProgress(true);
    };

    const handleFailure = () => {
      if (settled || cancelled) return;
      settled = true;
      if (attempt < maxRetries) {
        const backoffDelay = retryDelayMs * attempt;
        setTimeout(startPreload, backoffDelay);
      } else {
        // All retries failed
        onProgress(false);
      }
    };

    if (isVideoSource(src)) {
      const video = document.createElement("video");
      // Safety timeout of 8 seconds per video preloading attempt under slow network
      const timeout = window.setTimeout(handleFailure, 8000);

      const settleVideo = () => {
        window.clearTimeout(timeout);
        handleSuccess();
      };

      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.onloadedmetadata = settleVideo;
      video.onloadeddata = settleVideo;
      video.oncanplay = settleVideo;
      video.oncanplaythrough = settleVideo;
      video.onerror = handleFailure;
      video.src = src;
      video.load();

      cleanupFunc = () => {
        window.clearTimeout(timeout);
        video.onloadedmetadata = null;
        video.onloadeddata = null;
        video.oncanplay = null;
        video.oncanplaythrough = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
      };
    } else {
      // Must use the browser HTMLImageElement — importing `Image` from
      // "next/image" shadows the global and makes `new Image()` throw
      // "is not a constructor" (prod crash on /client slideshows).
      const img = new window.Image();
      img.onload = handleSuccess;
      img.onerror = handleFailure;
      img.src = src;

      cleanupFunc = () => {
        img.onload = null;
        img.onerror = null;
      };
    }
  };

  startPreload();

  return () => {
    cancelled = true;
    if (cleanupFunc) cleanupFunc();
  };
};

function usePreloadMedia(urls: string[], slideshowKey: string, maxWaitMs = 20000) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [successfulUrls, setSuccessfulUrls] = useState<string[]>([]);
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [prevKey, setPrevKey] = useState(slideshowKey);

  if (slideshowKey !== prevKey) {
    setPrevKey(slideshowKey);
    setReady(false);
    setProgress(0);
    setSuccessfulUrls([]);
    setFailedUrls([]);
  }

  useEffect(() => {
    if (urls.length === 0) {
      setReady(true);
      setProgress(100);
      return;
    }

    let settledCount = 0;
    let cancelled = false;
    const totalCount = urls.length;
    const successList: string[] = [];
    const failureList: string[] = [];

    // Safety valve — never block longer than maxWaitMs
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, maxWaitMs);

    const cleanups = urls.map((src) => {
      if (!src) {
        settledCount++;
        setProgress(Math.round((settledCount / totalCount) * 100));
        if (settledCount >= totalCount) {
          clearTimeout(timeout);
          setReady(true);
        }
        return undefined;
      }
      return preloadMediaWithRetry(src, (success) => {
        if (cancelled) return;
        settledCount++;
        if (success) {
          successList.push(src);
        } else {
          failureList.push(src);
        }

        setProgress(Math.round((settledCount / totalCount) * 100));
        if (settledCount >= totalCount) {
          clearTimeout(timeout);
          setSuccessfulUrls([...successList]);
          setFailedUrls([...failureList]);
          setReady(true);
        }
      });
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }, [slideshowKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, progress, successfulUrls, failedUrls };
}

const isNotExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return true;
  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return true;
  return expiresAtMs > Date.now();
};

const FullscreenMediaLayer: React.FC<{
  item: ResolvedSlideshowMediaItem;
  index: number;
  isActive: boolean;
  onEnded: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onMediaLoaded?: () => void;
}> = ({ item, index, isActive, onEnded, videoRef, onMediaLoaded }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // Safeguard: Check if the media has already loaded or is cached when component mounts/updates
  useEffect(() => {
    if (!onMediaLoaded) return;

    if (item.mediaType === "image" && imgRef.current) {
      if (imgRef.current.complete) {
        onMediaLoaded();
      }
    } else if (item.mediaType === "video" && localVideoRef.current) {
      if (localVideoRef.current.readyState >= 3) {
        onMediaLoaded();
      }
    }
  }, [item.mediaType, onMediaLoaded]);

  // Synchronize active video ref to the parent ref
  useEffect(() => {
    if (isActive && localVideoRef.current && videoRef) {
      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = localVideoRef.current;
    }
  }, [isActive, videoRef]);

  return (
    <div
      className={`absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ${
        isActive ? "opacity-100 z-10" : "pointer-events-none opacity-0 z-0"
      }`}
      aria-hidden={!isActive}
    >
      {item.mediaType === "video" ? (
        <video
          ref={(el) => {
            localVideoRef.current = el;
            if (isActive && videoRef) {
              (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
            }
          }}
          key={`${item.url}-${index}`}
          src={item.url}
          muted
          autoPlay={isActive}
          playsInline
          preload="auto"
          onEnded={onEnded}
          onError={() => {
            onEnded();
            if (onMediaLoaded) onMediaLoaded();
          }}
          onLoadedData={onMediaLoaded}
          onCanPlay={onMediaLoaded}
          style={getContainMediaStyle()}
        />
      ) : (
        <NextImage
          ref={imgRef as any}
          alt="template_image"
          src={item.url ?? ""}
          onLoad={onMediaLoaded}
          onError={() => { if (onMediaLoaded) onMediaLoaded() }}
          style={getContainMediaStyle()}
          fill
        />
      )}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Slideshow: React.FC<{
  contents: string[];
  metadata?: SlideshowMediaMetadata[];
}> = ({ contents, metadata = [] }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [firstSlideMediaLoaded, setFirstSlideMediaLoaded] = useState(false);
  const [isFullyReady, setIsFullyReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);

  // Generate a stable key to represent the actual slideshow data to avoid reference-comparison updates
  const slideshowKey = useMemo(() => {
    return JSON.stringify({ contents, metadata });
  }, [contents, metadata]);

  // Synchronous State Resetting during render phase when slideshow content changes.
  // This prevents any race conditions or intermediate flickering renders.
  const [prevKey, setPrevKey] = useState(slideshowKey);
  if (slideshowKey !== prevKey) {
    setPrevKey(slideshowKey);
    setFirstSlideMediaLoaded(false);
    setIsFullyReady(false);
    setShowLoader(true);
    setActiveIndex(0);
  }

  const mediaItems = useMemo<ResolvedSlideshowMediaItem[]>(() => {
    return contents.map((url, index) => {
      const itemMetadata = metadata[index];
      const mediaType =
        itemMetadata?.mediaType ||
        (isVideoSource(url) ? "video" : "image");

      return {
        url,
        mediaType,
        expiresAt: itemMetadata?.expiresAt,
        durationSeconds:
          mediaType === "image" ? itemMetadata?.durationSeconds : undefined,
      };
    });
  }, [slideshowKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const preloadedMediaItems = useMemo(
    () => mediaItems.filter((item) => isNotExpired(item.expiresAt)),
    [mediaItems],
  );

  const { ready, progress, successfulUrls, failedUrls } = usePreloadMedia(
    preloadedMediaItems.map((item) => item.url),
    slideshowKey,
    20000,
  );

  // Filter out any failed media items so only working/loaded assets are rendered and played
  const activeMediaItems = useMemo(() => {
    if (!ready) {
      return preloadedMediaItems;
    }
    return preloadedMediaItems.filter((item) => !failedUrls.includes(item.url));
  }, [preloadedMediaItems, ready, failedUrls]);

  const activeMediaIsVideo = activeMediaItems[activeIndex]?.mediaType === "video";
  const activeMediaUrl = activeMediaItems[activeIndex]?.url ?? "";
  const activeMediaDurationMs = useMemo(() => {
    const current = activeMediaItems[activeIndex];
    if (!current) return null;

    if (current.mediaType === "video") {
      return null;
    }

    const parsed = Number(current.durationSeconds);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed * 1000);
    }

    return 6000;
  }, [activeMediaItems, activeIndex]);

  // Synchronize loading, preloading, and initialization states.
  // The slideshow is only "fully ready" when the preloading is done AND the active first slide is mounted & loaded in DOM.
  useEffect(() => {
    if (ready && firstSlideMediaLoaded) {
      setIsFullyReady(true);
      // Wait for the fade-out CSS opacity transition to complete before unmounting loader overlay completely
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setIsFullyReady(false);
      setShowLoader(true);
    }
  }, [ready, firstSlideMediaLoaded]);

  // Never leave the display stuck on a black loader if the first slide load event is missed.
  useEffect(() => {
    if (!ready || firstSlideMediaLoaded || activeMediaItems.length === 0) return;

    const forceReadyTimer = window.setTimeout(() => {
      setFirstSlideMediaLoaded(true);
    }, 8000);

    return () => window.clearTimeout(forceReadyTimer);
  }, [ready, firstSlideMediaLoaded, slideshowKey, activeMediaItems.length]);

  // Handle slide transitions / autoplay timer (disabled until fully ready)
  useEffect(() => {
    if (!isFullyReady || activeMediaItems.length === 0 || activeMediaDurationMs === null) return;

    const timer = window.setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
      setActiveIndex((current) => (current + 1) % activeMediaItems.length);
    }, activeMediaDurationMs);

    return () => window.clearTimeout(timer);
  }, [isFullyReady, activeMediaItems.length, activeMediaDurationMs, activeIndex]);

  // Handle active video playback (disabled until fully ready)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeMediaIsVideo || !isFullyReady) return;

    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.currentTime = 0;
    video.play().catch((err) => console.error("Video play failed:", err));

    return () => {
      video.pause();
    };
  }, [activeMediaIsVideo, activeIndex, activeMediaUrl, isFullyReady]);

  const handleVideoEnded = () => {
    if (activeMediaItems[activeIndex]?.mediaType !== "video") return;
    setActiveIndex((current) => (current + 1) % activeMediaItems.length);
  };

  // Immediate empty state
  if (activeMediaItems.length === 0) {
    return (
      <SafeContentFrame isMedia className="relative flex items-center justify-center bg-black">
        <p
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 16,
            letterSpacing: "0.02em",
            margin: 0,
          }}
        >
          No active slideshow media
        </p>
      </SafeContentFrame>
    );
  }

  const firstImage = activeMediaItems.find((item) => item.mediaType === "image")?.url;

  return (
    <SafeContentFrame isMedia className="relative overflow-hidden bg-black h-full w-full">
      {/* Slideshow Content: Rendered concurrently in the background so layout and rendering are prepared */}
      <div 
        className="relative h-full w-full overflow-hidden bg-black"
        style={{
          opacity: isFullyReady ? 1 : 0,
          pointerEvents: isFullyReady ? "auto" : "none",
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        {activeMediaItems.map((item, index) => (
          <FullscreenMediaLayer
            key={`${item.url}-${index}`}
            item={item}
            index={index}
            isActive={index === activeIndex}
            onEnded={handleVideoEnded}
            videoRef={videoRef}
            onMediaLoaded={index === 0 ? () => setFirstSlideMediaLoaded(true) : undefined}
          />
        ))}
      </div>

      {/* Loader Overlay: Fades out smoothly once preloading is done and the first slide is ready */}
      {showLoader && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#000",
            opacity: isFullyReady ? 0 : 1,
            pointerEvents: isFullyReady ? "none" : "auto",
            transition: "opacity 0.5s ease-out",
          }}
        >
          {/* First image preview: cross-fades into view once preloaded */}
          {ready && firstImage && (
            <NextImage
              src={firstImage}
              alt=""
              aria-hidden="true"
              style={{
                objectFit: "contain",
                filter: "blur(16px) brightness(0.4)",
              }}
              fill
            />
          )}

          {/* Progress Indicator overlay */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            {/* Circular progress ring */}
            <div style={{ position: "relative", width: 80, height: 80 }}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 80 80"
                style={{ transform: "rotate(-90deg)" }}
              >
                {/* Track */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="6"
                />
                {/* Progress */}
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="white"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.3s ease" }}
                />
              </svg>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {progress}%
              </span>
            </div>

            <p
              style={{
                color: "rgba(255,255,255,0.75)",
                fontSize: 14,
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Loading slideshow…
            </p>
          </div>
        </div>
      )}
    </SafeContentFrame>
  );
};

export default Slideshow;
