'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  BUILD_VERSION_KEY,
  purgeClientStateForDeploy,
} from '../utils/deployClientPurge';

const VERSION_POLL_MS = 30_000;

const shouldSignOutOnDeploy = () =>
  process.env.NEXT_PUBLIC_DEPLOY_SIGN_OUT === 'true';

export function VersionChecker() {
  const pathname = usePathname();
  const isRefreshingRef = useRef(false);

  const checkVersion = useCallback(async (updateRegistration = false) => {
    if (isRefreshingRef.current) return;

    try {
      if (updateRegistration && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update();
      }

      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (!res.ok) return;

      const data = await res.json();
      const serverBuildId = String(data.buildId ?? '');
      if (!serverBuildId) return;

      const localBuildId = localStorage.getItem(BUILD_VERSION_KEY);

      if (!localBuildId) {
        localStorage.setItem(BUILD_VERSION_KEY, serverBuildId);
        return;
      }

      if (localBuildId !== serverBuildId) {
        isRefreshingRef.current = true;
        console.info(
          `[VersionChecker] New deployment ${serverBuildId} (was ${localBuildId}) — purging client storage and caches`,
        );
        await purgeClientStateForDeploy({
          newBuildId: serverBuildId,
          signOut: shouldSignOutOnDeploy(),
        });
      }
    } catch (err) {
      console.warn('Version check error:', err);
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    const url = new URL(window.location.href);
    if (url.searchParams.has('__deploy')) {
      url.searchParams.delete('__deploy');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    checkVersion(true);

    const interval = window.setInterval(() => checkVersion(true), VERSION_POLL_MS);
    const onFocus = () => checkVersion(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion(true);
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [checkVersion]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') return;
    checkVersion(false);
  }, [pathname, checkVersion]);

  return null;
}
