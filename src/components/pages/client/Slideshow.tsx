/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo, useRef } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider, { Settings } from "react-slick";

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

const preloadMedia = (src: string, onSettled: () => void) => {
  if (isVideoSource(src)) {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadeddata = onSettled;
    video.onerror = onSettled;
    video.src = src;
    return;
  }

  const img = new Image();
  img.onload = onSettled;
  img.onerror = onSettled;
  img.src = src;
};

function usePreloadMedia(urls: string[], maxWaitMs = 10000) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (urls.length === 0) {
      setReady(true);
      setProgress(100);
      return;
    }

    setReady(false);
    setProgress(0);

    let settled = 0;
    let cancelled = false;

    const onSettled = () => {
      if (cancelled) return;
      settled += 1;
      setProgress(Math.round((settled / urls.length) * 100));
      if (settled >= urls.length) {
        clearTimeout(timeout);
        setReady(true);
      }
    };

    // Safety valve — never block longer than maxWaitMs
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, maxWaitMs);

    urls.forEach((src) => {
      if (!src) {
        onSettled();
        return;
      }
      preloadMedia(src, onSettled);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [urls.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, progress };
}

const isNotExpired = (expiresAt?: string): boolean => {
  if (!expiresAt) return true;
  const expiresAtMs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresAtMs)) return true;
  return expiresAtMs > Date.now();
};

// ─── Component ────────────────────────────────────────────────────────────────
export const Slideshow: React.FC<{
  contents: string[];
  metadata?: SlideshowMediaMetadata[];
}> = ({ contents, metadata = [] }) => {
  const sliderRef = useRef<Slider | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

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
  }, [contents, metadata]);

  const activeMediaItems = useMemo(
    () => mediaItems.filter((item) => isNotExpired(item.expiresAt)),
    [mediaItems],
  );

  const { ready, progress } = usePreloadMedia(
    activeMediaItems.map((item) => item.url),
    10000,
  );
  const activeMediaIsVideo = activeMediaItems[activeIndex]?.mediaType === "video";
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

  useEffect(() => {
    if (!ready || activeMediaItems.length === 0 || activeMediaDurationMs === null) return;

    const timer = window.setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
      sliderRef.current?.slickNext();
    }, activeMediaDurationMs);

    return () => window.clearTimeout(timer);
  }, [ready, activeMediaItems.length, activeMediaDurationMs, activeIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeMediaIsVideo) return;

    video.currentTime = 0;
    video.play().catch((err) => console.error("Video play failed:", err));

    return () => {
      video.pause();
    };
  }, [activeMediaIsVideo, activeIndex, activeMediaItems[activeIndex]?.url]);

  useEffect(() => {
    setActiveIndex(0);
    sliderRef.current?.slickGoTo(0, true);
  }, [activeMediaItems]);

  const settings: Settings = useMemo(
    () => ({
      dots: false,
      infinite: true,
      speed: 500,
      arrows: false,
      autoplay: false,
      lazyLoad: undefined,
      afterChange: (index: number) => setActiveIndex(index),
    }),
    [],
  );

  const handleVideoEnded = () => {
    if (activeMediaItems[activeIndex]?.mediaType !== "video") return;
    sliderRef.current?.slickNext();
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (activeMediaItems.length === 0) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center bg-black overflow-hidden">
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
      </div>
    );
  }

  if (!ready) {
    const firstImage = activeMediaItems.find((item) => item.mediaType === "image")?.url;
    return (
      <div className="relative flex h-screen w-full items-center justify-center bg-black overflow-hidden">
        {/* Blurred first image as background so it doesn't feel like a blank screen */}
        {firstImage && (
          <img
            src={firstImage}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(16px) brightness(0.4)",
              transform: "scale(1.05)", // hide blur edge artifacts
            }}
          />
        )}

        {/* Progress indicator */}
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
    );
  }

  // ── Slideshow (only mounts after all images are ready) ──────────────────────
  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <Slider ref={sliderRef} {...settings}>
        {activeMediaItems.map((item, index) => (
          <div
            id="content-container"
            className="!flex h-screen w-screen items-center justify-center overflow-hidden bg-black"
            key={`${item.url}-${index}`}
          >
            {item.mediaType === "video" ? (
              <video
                ref={activeIndex === index ? videoRef : null}
                key={`${item.url}-${index}-${activeIndex}`}
                src={item.url}
                muted
                autoPlay={activeIndex === index}
                playsInline
                preload="auto"
                onEnded={handleVideoEnded}
                onError={handleVideoEnded}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center center",
                  display: "block",
                }}
              />
            ) : (
              <img
                alt="template_image"
                src={item.url ?? ""}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center center",
                  display: "block",
                }}
              />
            )}
          </div>
        ))}
      </Slider>
    </div>
  );
};

export default Slideshow;
