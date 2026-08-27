/**
 * Client-Side Image Optimizer
 * Resizes and compresses images in the browser before saving or transmitting,
 * preventing 413 Payload Too Large errors and reducing transfer sizes by >95%.
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1400,
  maxHeight: 1400,
  quality: 0.82,
  format: 'image/webp',
};

export const AVATAR_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 320,
  maxHeight: 320,
  quality: 0.85,
  format: 'image/webp',
};

export const COVER_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1600,
  maxHeight: 1000,
  quality: 0.82,
  format: 'image/webp',
};

export async function compressImage(
  file: File | Blob,
  options: ImageOptimizationOptions = {}
): Promise<string> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { maxWidth = 1400, maxHeight = 1400, quality = 0.82, format = 'image/webp' } = mergedOptions;

  return new Promise((resolve) => {
    // If running outside browser environment, return empty
    if (typeof window === 'undefined') {
      resolve('');
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      // Fallback to empty string on read error
      resolve('');
    };

    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }

      // If already a small SVG or non-raster, return as-is
      if (file.type === 'image/svg+xml' || (file.size && file.size < 40 * 1024)) {
        resolve(src);
        return;
      }

      const img = new Image();
      img.onerror = () => {
        // If image decode fails, resolve original base64
        resolve(src);
      };

      img.onload = () => {
        try {
          let { width, height } = img;

          // Compute constrained dimensions maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const ratio = Math.min(widthRatio, heightRatio);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Render onto canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(src);
            return;
          }

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Try exporting to WebP first, fallback to JPEG if format not supported
          let dataUrl = canvas.toDataURL(format, quality);

          // If browser doesn't support webp encoding (rare in modern browsers), fallback to jpeg
          if (!dataUrl.startsWith(`data:${format}`) && format === 'image/webp') {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(dataUrl);
        } catch (err) {
          console.warn('Canvas image compression failed, falling back to original:', err);
          resolve(src);
        }
      };

      img.src = src;
    };

    reader.readAsDataURL(file);
  });
}
