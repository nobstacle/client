"use client";

import { useEffect, useState } from "react";
import { Button } from "antd";
import { DownloadOutlined, CloseOutlined } from "@ant-design/icons";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const isStandaloneMode = () => {
  if (typeof window === "undefined") return false;

  return window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 767px)").matches;
};

const isIosSafari = () => {
  if (typeof window === "undefined") return false;

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);

  return isIos && isSafari;
};

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIosFallback, setIsIosFallback] = useState(false);

  useEffect(() => {
    const installed = isStandaloneMode();
    setIsInstalled(installed);

    if (installed) return;

    const handleBeforeInstallPrompt = (event: Event) => {
      const installEvent = event as BeforeInstallPromptEvent;
      installEvent.preventDefault();
      setDeferredPrompt(installEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    if (isMobileDevice() && isIosSafari()) {
      setIsIosFallback(true);
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isInstalled || !isVisible) {
    return null;
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: "12px",
        right: "12px",
        bottom: "12px",
        zIndex: 2147483647,
        background: "linear-gradient(135deg, #3b5998 0%, #2d4373 100%)",
        color: "white",
        borderRadius: "16px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.22)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxWidth: "640px",
        margin: "0 auto",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "12px",
          background: "rgba(255, 255, 255, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <DownloadOutlined style={{ fontSize: "18px" }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 600, lineHeight: 1.2 }}>
          Install Nobstacle
        </div>
        <div style={{ fontSize: "12px", opacity: 0.9, lineHeight: 1.35 }}>
          {isIosFallback
            ? "On iPhone or iPad, open Safari and choose Share, then Add to Home Screen."
            : "Install the app for faster access and a native app experience."}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {!isIosFallback && deferredPrompt && (
          <Button
            onClick={handleInstall}
            style={{
              background: "white",
              color: "#3b5998",
              border: "none",
              fontWeight: 600,
            }}
          >
            Install
          </Button>
        )}

        <button
          type="button"
          aria-label="Dismiss install prompt"
          onClick={() => setIsVisible(false)}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "10px",
            border: "none",
            background: "rgba(255, 255, 255, 0.12)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <CloseOutlined style={{ fontSize: "12px" }} />
        </button>
      </div>
    </div>
  );
};
