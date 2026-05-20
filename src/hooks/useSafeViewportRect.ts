import { useEffect, useMemo, useState } from "react";
import {
  calculateSafeViewportRect,
  type SafeViewportOptions,
} from "../utils/contentFit";

export const useSafeViewportRect = (options: SafeViewportOptions = {}) => {
  const [rect, setRect] = useState(() => calculateSafeViewportRect(options));

  const optionKey = useMemo(
    () =>
      JSON.stringify({
        topMenuBarHeight: options.topMenuBarHeight,
        bottomMenuBarHeight: options.bottomMenuBarHeight,
        leftPadding: options.leftPadding,
        rightPadding: options.rightPadding,
        viewportTopOffset: options.viewportTopOffset,
        viewportLeftOffset: options.viewportLeftOffset,
        safeAreaInsets: options.safeAreaInsets,
      }),
    [
      options.topMenuBarHeight,
      options.bottomMenuBarHeight,
      options.leftPadding,
      options.rightPadding,
      options.viewportTopOffset,
      options.viewportLeftOffset,
      options.safeAreaInsets,
    ],
  );

  useEffect(() => {
    const updateRect = () => {
      setRect(calculateSafeViewportRect(options));
    };

    updateRect();

    window.addEventListener("resize", updateRect);
    window.addEventListener("orientationchange", updateRect);
    window.addEventListener("fullscreenchange", updateRect);
    window.visualViewport?.addEventListener("resize", updateRect);
    window.visualViewport?.addEventListener("scroll", updateRect);

    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("orientationchange", updateRect);
      window.removeEventListener("fullscreenchange", updateRect);
      window.visualViewport?.removeEventListener("resize", updateRect);
      window.visualViewport?.removeEventListener("scroll", updateRect);
    };
  }, [optionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return rect;
};
