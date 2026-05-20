"use client";

import React from "react";
import { useSafeViewportRect } from "../../../hooks/useSafeViewportRect";
import { getSafeViewportStyle } from "../../../utils/contentFit";

type SafeContentFrameProps = {
  children: React.ReactNode;
  className?: string;
  allowScroll?: boolean;
  style?: React.CSSProperties;
  isMedia?: boolean;
};

export const SafeContentFrame = React.forwardRef<HTMLDivElement, SafeContentFrameProps>(({
  children,
  className,
  allowScroll = false,
  style,
  isMedia = false,
}, ref) => {
  const rect = useSafeViewportRect();
  
  const finalRect = isMedia ? {
    ...rect,
    topOffset: 0,
    bottomOffset: 0,
    leftOffset: 0,
    rightOffset: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : rect.width,
    height: typeof window !== 'undefined' ? window.innerHeight : rect.height,
  } : rect;

  return (
    <div
      ref={ref}
      className={className}
      style={getSafeViewportStyle(finalRect, {
        // The safe frame subtracts device notches and configured kiosk bars.
        // Template media is positioned inside this box, never against the raw screen.
        overflowX: "hidden",
        overflowY: allowScroll ? "auto" : "hidden",
        ...style,
      })}
    >
      {children}
    </div>
  );
});

SafeContentFrame.displayName = "SafeContentFrame";

export default SafeContentFrame;
