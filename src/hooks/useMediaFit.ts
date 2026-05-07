import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

type MediaFit = "cover" | "contain";

const VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "avi", "m4v"];

const isVideoSource = (src: string) => {
  const normalized = src.split("?")[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((extension) => normalized.endsWith(`.${extension}`));
};

const getFitForDimensions = (width: number, height: number): MediaFit => {
  return width >= height ? "cover" : "contain";
};

export const useMediaFit = (
  src?: string | null,
  mediaType?: "image" | "video",
) => {
  const [fit, setFit] = useState<MediaFit>("contain");

  useEffect(() => {
    if (!src) {
      setFit("contain");
      return;
    }

    let cancelled = false;
    setFit("contain");

    const applyFit = (width: number, height: number) => {
      if (cancelled || width <= 0 || height <= 0) return;
      setFit(getFitForDimensions(width, height));
    };

    const shouldProbeVideo = mediaType === "video" || (mediaType !== "image" && isVideoSource(src));

    if (shouldProbeVideo) {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        applyFit(video.videoWidth, video.videoHeight);
      };
      video.onerror = () => {
        if (!cancelled) {
          setFit("contain");
        }
      };
      video.src = src;

      return () => {
        cancelled = true;
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
      };
    }

    const image = new Image();
    image.onload = () => {
      applyFit(image.naturalWidth, image.naturalHeight);
    };
    image.onerror = () => {
      if (!cancelled) {
        setFit("contain");
      }
    };
    image.src = src;

    return () => {
      cancelled = true;
      image.onload = null;
      image.onerror = null;
    };
  }, [mediaType, src]);

  return fit;
};

export const getFullscreenMediaStyle = (fit: MediaFit): CSSProperties => {
  return {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: fit,
    objectPosition: "center center",
    display: "block",
  };
};
