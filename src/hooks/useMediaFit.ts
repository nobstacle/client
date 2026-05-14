import type { CSSProperties } from "react";

type MediaFit = "contain";

export const useMediaFit = (
  src?: string | null,
  mediaType?: "image" | "video",
): MediaFit => {
  void src;
  void mediaType;
  return "contain";
};

export const getFullscreenMediaStyle = (fit: MediaFit = "contain"): CSSProperties => {
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
