/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo, useRef } from "react";
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

const preloadMedia = (src: string, onSettled: () => void) => {
  let settled = false;
  const settleOnce = () => {
    if (settled) return;
    settled = true;
    onSettled();
  };

  if (isVideoSource(src)) {
    const video = document.createElement("video");
    const timeout = window.setTimeout(settleOnce, 3000);

    const settleVideo = () => {
      window.clearTimeout(timeout);
      settleOnce();
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.onloadedmetadata = settleVideo;
    video.onloadeddata = settleVideo;
    video.oncanplay = settleVideo;
    video.onerror = settleVideo;
    video.src = src;
    video.load();

    return () => {
      window.clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onloadeddata = null;
      video.oncanplay = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
    };
  }

  const img = new Image();
  img.onload = settleOnce;
  img.onerror = settleOnce;
  img.src = src;

  return () => {
    img.onload = null;
    img.onerror = null;
  };
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

    const cleanups = urls.map((src) => {
      if (!src) {
        onSettled();
        return undefined;
      }
      return preloadMedia(src, onSettled);
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cleanups.forEach((cleanup) => cleanup?.());
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

const FullscreenMediaLayer: React.FC<{
  item: ResolvedSlideshowMediaItem;
  index: number;
  isActive: boolean;
  onEnded: () => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}> = ({ item, index, isActive, onEnded, videoRef }) => {
  return (
    <div
      className={`absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-black transition-opacity duration-500 ${
        isActive ? "opacity-100 z-10" : "pointer-events-none opacity-0 z-0"
      }`}
      aria-hidden={!isActive}
    >
      {item.mediaType === "video" ? (
        <video
          ref={isActive ? videoRef : null}
          key={`${item.url}-${index}`}
          src={item.url}
          muted
          autoPlay={isActive}
          playsInline
          preload="auto"
          onEnded={onEnded}
          onError={onEnded}
          style={getContainMediaStyle()}
        />
      ) : (
        <img
          alt="template_image"
          src={item.url ?? ""}
          style={getContainMediaStyle()}
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

  useEffect(() => {
    if (!ready || activeMediaItems.length === 0 || activeMediaDurationMs === null) return;

    const timer = window.setTimeout(() => {
      const video = videoRef.current;
      if (video) {
        video.pause();
      }
      setActiveIndex((current) => (current + 1) % activeMediaItems.length);
    }, activeMediaDurationMs);

    return () => window.clearTimeout(timer);
  }, [ready, activeMediaItems.length, activeMediaDurationMs, activeIndex]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeMediaIsVideo) return;

    video.muted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.currentTime = 0;
    video.play().catch((err) => console.error("Video play failed:", err));

    return () => {
      video.pause();
    };
  }, [activeMediaIsVideo, activeIndex, activeMediaUrl]);

  useEffect(() => {
    setActiveIndex(0);
  }, [activeMediaItems]);

  const handleVideoEnded = () => {
    if (activeMediaItems[activeIndex]?.mediaType !== "video") return;
    setActiveIndex((current) => (current + 1) % activeMediaItems.length);
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
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

  if (!ready) {
    const firstImage = activeMediaItems.find((item) => item.mediaType === "image")?.url;
    return (
      <SafeContentFrame isMedia className="relative flex items-center justify-center bg-black">
        {/* First image preview stays contained so loading never crops branded artwork. */}
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
              objectFit: "contain",
              filter: "blur(16px) brightness(0.4)",
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
      </SafeContentFrame>
    );
  }

  // ── Slideshow (only mounts after all images are ready) ──────────────────────
  return (
    <SafeContentFrame isMedia className="overflow-hidden bg-black">
      <div className="relative h-full w-full overflow-hidden bg-black">
        {activeMediaItems.map((item, index) => (
          <FullscreenMediaLayer
            key={`${item.url}-${index}`}
            item={item}
            index={index}
            isActive={index === activeIndex}
            onEnded={handleVideoEnded}
            videoRef={videoRef}
          />
        ))}
      </div>
    </SafeContentFrame>
  );
};

export default Slideshow;
