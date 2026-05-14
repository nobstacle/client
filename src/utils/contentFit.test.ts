import assert from "assert";
import {
  calculateContainDimensions,
  calculateSafeViewportRect,
} from "./contentFit";

const assertFits = (
  contentWidth: number,
  contentHeight: number,
  containerWidth: number,
  containerHeight: number,
) => {
  const result = calculateContainDimensions(
    contentWidth,
    contentHeight,
    containerWidth,
    containerHeight,
  );

  assert.ok(result.finalWidth <= containerWidth + 0.001);
  assert.ok(result.finalHeight <= containerHeight + 0.001);
  assert.ok(result.offsetX >= -0.001);
  assert.ok(result.offsetY >= -0.001);
};

assertFits(2048, 1536, 1024, 768); // iPad-like 4:3
assertFits(2560, 1600, 2960, 1848); // wide Samsung tablet 16:10
assertFits(1920, 1080, 3840, 1080); // extreme landscape TV wall
assertFits(1080, 1920, 768, 1024); // portrait tablet

const rect = calculateSafeViewportRect({
  viewportWidth: 1024,
  viewportHeight: 768,
  topMenuBarHeight: 48,
  bottomMenuBarHeight: 64,
  safeAreaInsets: { top: 12, bottom: 8 },
});

assert.deepStrictEqual(
  {
    width: rect.width,
    height: rect.height,
    topOffset: rect.topOffset,
    bottomOffset: rect.bottomOffset,
  },
  {
    width: 1024,
    height: 636,
    topOffset: 60,
    bottomOffset: 72,
  },
);

