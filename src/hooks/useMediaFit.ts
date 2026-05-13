import type { CSSProperties } from "react";

type MediaFit = "contain";

export const useMediaFit = (
  _src?: string | null,
  _mediaType?: "image" | "video",
): MediaFit => "contain";

export const getFullscreenMediaStyle = (_fit?: MediaFit): CSSProperties => {
  return {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    objectPosition: "center center",
    display: "block",
  };
};
