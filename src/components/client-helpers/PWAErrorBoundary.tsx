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
    
    // Guard against infinite reload loops
    const hasReloaded = typeof window !== "undefined" && sessionStorage.getItem("pwa_auto_reloaded");
    if (!hasReloaded) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pwa_auto_reloaded", "true");
      }
      this.clearCachesAndReload();
    }
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
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error("[PWAErrorBoundary] Failed to clear caches:", err);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff', flexDirection: 'column', gap: '1rem', padding: '1rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Updating application...</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '400px' }}>
            We cleared old cached files to load the latest version.
          </p>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                sessionStorage.removeItem("pwa_auto_reloaded");
                window.location.reload();
              }
            }}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#2563eb',
              color: '#fff',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
