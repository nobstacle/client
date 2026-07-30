'use client';
import { useEffect } from 'react';

export function VersionChecker() {
  useEffect(() => {
    let isRefreshing = false;

    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
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
          console.log('[App Update] New deployment detected. Clearing cache and reloading...');
          localStorage.setItem('app_build_version', serverBuildId);

          // Clear Service Worker Caches & CacheStorage
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            await Promise.all(cacheKeys.map(key => caches.delete(key)));
          }

          // Unregister existing Service Workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const reg of registrations) {
              await reg.unregister();
            }
          }

          // Reload page to get fresh bundle
          window.location.reload();
        }
      } catch (err) {
        console.warn('Version check error:', err);
      }
    };

    // Run check on mount
    checkVersion();

    // Check periodically every 2 minutes
    const interval = setInterval(checkVersion, 2 * 60 * 1000);
    
    // Check when user focuses tab
    const onFocus = () => checkVersion();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  return null;
}
