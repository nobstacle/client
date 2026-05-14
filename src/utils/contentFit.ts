/// <reference lib="dom" />

import type { CSSProperties } from "react";

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type SafeViewportRect = {
  width: number;
  height: number;
  topOffset: number;
  bottomOffset: number;
  leftOffset: number;
  rightOffset: number;
};

export type SafeViewportOptions = {
  viewportWidth?: number;
  viewportHeight?: number;
  topMenuBarHeight?: number;
  bottomMenuBarHeight?: number;
  leftPadding?: number;
  rightPadding?: number;
  safeAreaInsets?: Partial<SafeAreaInsets>;
};

export type ContainDimensions = {
  finalWidth: number;
  finalHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
};

const clampNonNegative = (value: number) =>
  Number.isFinite(value) ? Math.max(0, value) : 0;

const readCssPx = (propertyName: string): number => {
  if (typeof window === "undefined") return 0;

  const rawValue = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(propertyName)
    .trim();
  const parsed = Number.parseFloat(rawValue);

  return Number.isFinite(parsed) ? parsed : 0;
};

export const getConfiguredSafeAreaInsets = (): SafeAreaInsets => ({
  top: readCssPx("--safe-area-inset-top"),
  right: readCssPx("--safe-area-inset-right"),
  bottom: readCssPx("--safe-area-inset-bottom"),
  left: readCssPx("--safe-area-inset-left"),
});

export const getConfiguredMenuBarHeights = () => ({
  topMenuBarHeight: readCssPx("--kiosk-top-menu-height"),
  bottomMenuBarHeight: readCssPx("--kiosk-bottom-menu-height"),
  leftPadding: readCssPx("--kiosk-safe-left-padding"),
  rightPadding: readCssPx("--kiosk-safe-right-padding"),
});

export const getViewportSize = () => {
  if (typeof window === "undefined") {
    return { width: 0, height: 0 };
  }

  const visualViewport = window.visualViewport;

  return {
    width: Math.round(visualViewport?.width || window.innerWidth),
    height: Math.round(visualViewport?.height || window.innerHeight),
  };
};

export const calculateSafeViewportRect = (
  options: SafeViewportOptions = {},
): SafeViewportRect => {
  const viewport = getViewportSize();
  const configuredSafeInsets = getConfiguredSafeAreaInsets();
  const configuredMenuBars = getConfiguredMenuBarHeights();
  const safeAreaInsets = {
    ...configuredSafeInsets,
    ...options.safeAreaInsets,
  };

  const topOffset =
    clampNonNegative(options.topMenuBarHeight ?? configuredMenuBars.topMenuBarHeight) +
    clampNonNegative(safeAreaInsets.top);
  const bottomOffset =
    clampNonNegative(options.bottomMenuBarHeight ?? configuredMenuBars.bottomMenuBarHeight) +
    clampNonNegative(safeAreaInsets.bottom);
  const leftOffset =
    clampNonNegative(options.leftPadding ?? configuredMenuBars.leftPadding) +
    clampNonNegative(safeAreaInsets.left);
  const rightOffset =
    clampNonNegative(options.rightPadding ?? configuredMenuBars.rightPadding) +
    clampNonNegative(safeAreaInsets.right);

  const viewportWidth = clampNonNegative(options.viewportWidth ?? viewport.width);
  const viewportHeight = clampNonNegative(options.viewportHeight ?? viewport.height);

  return {
    width: clampNonNegative(viewportWidth - leftOffset - rightOffset),
    height: clampNonNegative(viewportHeight - topOffset - bottomOffset),
    topOffset,
    bottomOffset,
    leftOffset,
    rightOffset,
  };
};

export const calculateContainDimensions = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
): ContainDimensions => {
  const safeContentWidth = clampNonNegative(contentWidth);
  const safeContentHeight = clampNonNegative(contentHeight);
  const safeContainerWidth = clampNonNegative(containerWidth);
  const safeContainerHeight = clampNonNegative(containerHeight);

  if (
    safeContentWidth === 0 ||
    safeContentHeight === 0 ||
    safeContainerWidth === 0 ||
    safeContainerHeight === 0
  ) {
    return {
      finalWidth: 0,
      finalHeight: 0,
      offsetX: safeContainerWidth / 2,
      offsetY: safeContainerHeight / 2,
      scale: 0,
    };
  }

  const scale = Math.min(
    safeContainerWidth / safeContentWidth,
    safeContainerHeight / safeContentHeight,
  );
  const finalWidth = safeContentWidth * scale;
  const finalHeight = safeContentHeight * scale;

  return {
    finalWidth,
    finalHeight,
    offsetX: (safeContainerWidth - finalWidth) / 2,
    offsetY: (safeContainerHeight - finalHeight) / 2,
    scale,
  };
};

export const getSafeViewportStyle = (
  rect: SafeViewportRect,
  extraStyles: CSSProperties = {},
): CSSProperties => ({
  position: "fixed",
  top: `${rect.topOffset}px`,
  left: `${rect.leftOffset}px`,
  width: `${rect.width}px`,
  height: `${rect.height}px`,
  maxWidth: `${rect.width}px`,
  maxHeight: `${rect.height}px`,
  overflow: "hidden",
  ...extraStyles,
});

export const getContainMediaStyle = (
  extraStyles: CSSProperties = {},
): CSSProperties => ({
  width: "100%",
  height: "100%",
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
  objectPosition: "center center",
  display: "block",
  ...extraStyles,
});
