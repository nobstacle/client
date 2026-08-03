"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class PWAErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[PWAErrorBoundary] Caught a fatal error:", error, errorInfo);
    this.clearCachesAndReload();
  }

  private async clearCachesAndReload() {
    try {
      console.log("[PWAErrorBoundary] Attempting to clear Service Worker and Caches...");
      
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      
      localStorage.removeItem("app_build_version");
      
      // Add a small delay to ensure unregistration is processed
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("[PWAErrorBoundary] Failed to clear caches:", err);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', color: '#fff', flexDirection: 'column' }}>
          <h2>Updating application...</h2>
          <p>Clearing old cached data to load the latest version.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
