import { useEffect, useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const computeScale = (width: number, height: number) => {
  if (width <= 0 || height <= 0) {
    return 1;
  }

  const landscapeBase = Math.min(width / 1366, height / 768);
  const portraitBase = Math.min(width / 768, height / 1366);
  const raw = width >= height ? landscapeBase : portraitBase;

  return clamp(raw, 0.8, 1.4);
};

export const useViewportScale = () => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === "undefined" ? 0 : window.innerWidth,
    height: typeof window === "undefined" ? 0 : window.innerHeight,
  }));

  useEffect(() => {
    const updateViewport = () => {
      const visualViewport = window.visualViewport;
      setViewport({
        width: Math.round(visualViewport?.width || window.innerWidth),
        height: Math.round(visualViewport?.height || window.innerHeight),
      });
    };

    updateViewport();

    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    window.visualViewport?.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
      window.visualViewport?.removeEventListener("resize", updateViewport);
    };
  }, []);

  return {
    width: viewport.width,
    height: viewport.height,
    scale: computeScale(viewport.width, viewport.height),
  };
};
