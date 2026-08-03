'use client';
import { useEffect } from 'react';

async function clearServiceWorkerState() {
  if ('caches' in window) {
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }
}

export function VersionChecker() {
  useEffect(() => {
    let isRefreshing = false;

    // Dev never uses a SW; kill any leftover registration from a prior prod/build session.
    if (process.env.NODE_ENV === 'development') {
      clearServiceWorkerState().catch(() => undefined);
      return;
    }

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const serverBuildId = data.buildId;
        const localBuildId = localStorage.getItem('app_build_version');

        if (!localBuildId) {
          localStorage.setItem('app_build_version', serverBuildId);
          return;
        }

        if (localBuildId !== serverBuildId && !isRefreshing) {
          isRefreshing = true;
          localStorage.setItem('app_build_version', serverBuildId);
          await clearServiceWorkerState();
          // Hard reload so the browser fetches a fresh document + chunk graph.
          window.location.replace(window.location.href);
        }
      } catch (err) {
        console.warn('Version check error:', err);
      }
    };

    checkVersion();

    const interval = setInterval(checkVersion, 2 * 60 * 1000);
    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}
