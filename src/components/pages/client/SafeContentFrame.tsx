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
  
  if (isMedia) {
    return (
      <div
        ref={ref}
        className={className}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          // Extend beyond the safe viewport so the black background fills behind
          // the iOS home indicator bar on newer iPads in PWA / standalone mode.
          // env(safe-area-inset-*) resolves to 0px on non-notched devices.
          width: "100dvw",
          // Layer the height declarations: plain dvh → dvh+safe-area (the winning one
          // on supporting browsers). Using multiple properties lets CSS cascade pick
          // the last supported value, so older browsers fall back gracefully.
          height: "100dvh",
          // @ts-ignore — CSS custom properties work fine at runtime
          ["--sai-bottom" as string]: "env(safe-area-inset-bottom, 0px)",
          maxWidth: "100dvw",
          maxHeight: "100dvh",
          // Extend the background behind the home indicator
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          boxSizing: "border-box" as const,
          overflowX: "hidden",
          overflowY: allowScroll ? "auto" : "hidden",
          backgroundColor: "transparent",
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

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
