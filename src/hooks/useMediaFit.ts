import { useState, useEffect, type CSSProperties } from "react";

type MediaFit = "cover" | "contain";

export const useMediaFit = (
  src?: string | null,
  mediaType?: "image" | "video",
): MediaFit => {
  const [fit, setFit] = useState<MediaFit>("contain");

  useEffect(() => {
    if (!src) return;

    if (mediaType === "video") {
      const video = document.createElement("video");
      video.onloadedmetadata = () => {
        const isLandscape = video.videoWidth > video.videoHeight;
        setFit(isLandscape ? "cover" : "contain");
      };
      video.src = src;
    } else {
      const img = new Image();
      img.onload = () => {
        const isLandscape = img.width > img.height;
        setFit(isLandscape ? "cover" : "contain");
      };
      img.src = src;
    }
  }, [src, mediaType]);

  return fit;
};

export const getFullscreenMediaStyle = (fit: MediaFit = "cover"): CSSProperties => {
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
