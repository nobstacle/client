"use client";

import React from "react";
import { useSafeViewportRect } from "../../../hooks/useSafeViewportRect";
import { getSafeViewportStyle } from "../../../utils/contentFit";

type SafeContentFrameProps = {
  children: React.ReactNode;
  className?: string;
  allowScroll?: boolean;
  style?: React.CSSProperties;
};

export const SafeContentFrame = React.forwardRef<HTMLDivElement, SafeContentFrameProps>(({
  children,
  className,
  allowScroll = false,
  style,
}, ref) => {
  const rect = useSafeViewportRect();

  return (
    <div
      ref={ref}
      className={className}
      style={getSafeViewportStyle(rect, {
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
