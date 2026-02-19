/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider, { Settings } from "react-slick";

// ─── Preloader hook ───────────────────────────────────────────────────────────
function usePreloadImages(urls: string[], maxWaitMs = 10000) {
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (urls.length === 0) {
      setReady(true);
      setProgress(100);
      return;
    }

    setReady(false);
    setProgress(0);

    let settled = 0;
    let cancelled = false;

    const onSettled = () => {
      if (cancelled) return;
      settled += 1;
      setProgress(Math.round((settled / urls.length) * 100));
      if (settled >= urls.length) {
        clearTimeout(timeout);
        setReady(true);
      }
    };

    // Safety valve — never block longer than maxWaitMs
    const timeout = setTimeout(() => {
      if (!cancelled) setReady(true);
    }, maxWaitMs);

    urls.forEach((src) => {
      if (!src) { onSettled(); return; }
      const img = new Image();
      img.onload = onSettled;
      img.onerror = onSettled; // count failures so we never hang
      img.src = src;
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [urls.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { ready, progress };
}

// ─── Component ────────────────────────────────────────────────────────────────
export const Slideshow: React.FC<{ contents: string[] }> = ({ contents }) => {
  const { ready, progress } = usePreloadImages(contents, 10000);

  const settings: Settings = {
    dots: false,
    infinite: true,
    speed: 500,
    autoplaySpeed: 6000,
    arrows: false,
    autoplay: true,
    // Disable lazyLoad so slick doesn't interfere — we handle preloading ourselves
    lazyLoad: undefined,
  };

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (!ready) {
    const firstImage = contents[0];
    return (
      <div className="relative flex h-screen w-full items-center justify-center bg-black overflow-hidden">
        {/* Blurred first image as background so it doesn't feel like a blank screen */}
        {firstImage && (
          <img
            src={firstImage}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "blur(16px) brightness(0.4)",
              transform: "scale(1.05)", // hide blur edge artifacts
            }}
          />
        )}

        {/* Progress indicator */}
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          {/* Circular progress ring */}
          <div style={{ position: "relative", width: 80, height: 80 }}>
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              style={{ transform: "rotate(-90deg)" }}
            >
              {/* Track */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="6"
              />
              {/* Progress */}
              <circle
                cx="40"
                cy="40"
                r="34"
                fill="none"
                stroke="white"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <span
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {progress}%
            </span>
          </div>

          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 14,
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            Loading slideshow…
          </p>
        </div>
      </div>
    );
  }

  // ── Slideshow (only mounts after all images are ready) ──────────────────────
  return (
    <Slider {...settings}>
      {contents.map((content) => (
        <div
          id="content-container"
          className="!flex h-screen items-center justify-center self-center"
          key={content}
        >
          <div>
            <img
              height="100%"
              alt="template_image"
              src={content ?? ""}
              style={{ maxHeight: "100vh" }}
            />
          </div>
        </div>
      ))}
    </Slider>
  );
};

export default Slideshow;