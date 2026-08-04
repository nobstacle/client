import { invalidateSessionCache } from "../lib/custom-instance";

const BUILD_VERSION_KEY = "app_build_version";

/** Clears non-httpOnly cookies for the current site (httpOnly auth cookies need signOut). */
function clearAccessibleCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const hostname = window.location.hostname;
  const domainVariants = new Set<string | undefined>([
    undefined,
    hostname,
    hostname.startsWith("www.") ? hostname.slice(4) : undefined,
  ]);

  if (hostname.endsWith("nobstacle.com") || hostname === "localhost") {
    domainVariants.add(".nobstacle.com");
    domainVariants.add("localhost");
  }

  const paths = ["/", window.location.pathname];

  const raw = document.cookie;
  if (!raw) {
    return;
  }

  for (const part of raw.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name) {
      continue;
    }

    for (const path of paths) {
      for (const domain of domainVariants) {
        const domainAttr = domain ? `;domain=${domain}` : "";
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}${domainAttr}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}${domainAttr};SameSite=Lax`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path}${domainAttr};SameSite=None;Secure`;
      }
    }
  }
}

async function clearIndexedDb() {
  if (typeof indexedDB === "undefined" || !indexedDB.databases) {
    return;
  }

  try {
    const databases = await indexedDB.databases();
    await Promise.all(
      databases.map((db) => {
        if (!db.name) {
          return Promise.resolve();
        }
        return new Promise<void>((resolve, reject) => {
          const request = indexedDB.deleteDatabase(db.name!);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => resolve();
        });
      }),
    );
  } catch (error) {
    console.warn("[DeployPurge] IndexedDB cleanup failed:", error);
  }
}

async function clearCacheStorage() {
  if (typeof caches === "undefined") {
    return;
  }

  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function clearServiceWorkers() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
}

function clearWebStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.clear();
  } catch (error) {
    console.warn("[DeployPurge] sessionStorage.clear failed:", error);
  }

  try {
    window.localStorage.clear();
  } catch (error) {
    console.warn("[DeployPurge] localStorage.clear failed:", error);
  }
}

function notifyDeployRefresh() {
  if (typeof window === "undefined") {
    return;
  }

  window.postMessage({ type: "DEPLOY_REFRESH" }, "*");
  if (window.parent !== window) {
    window.parent.postMessage({ type: "DEPLOY_REFRESH" }, "*");
  }
}

export type DeployPurgeOptions = {
  newBuildId: string;
  /** When true, runs NextAuth signOut so httpOnly session cookies are cleared (logs users out). */
  signOut?: boolean;
};

/**
 * Wipes client-side state so a new deployment cannot be mixed with stale caches.
 * HttpOnly session cookies are kept unless `signOut` is true — clearing them on
 * every deploy would log out kiosk /client displays.
 */
export async function purgeClientStateForDeploy(
  options: DeployPurgeOptions,
): Promise<void> {
  const { newBuildId, signOut = false } = options;

  notifyDeployRefresh();
  invalidateSessionCache();

  clearWebStorage();
  clearAccessibleCookies();

  await clearIndexedDb();
  await clearCacheStorage();
  await clearServiceWorkers();

  try {
    window.localStorage.setItem(BUILD_VERSION_KEY, newBuildId);
  } catch (error) {
    console.warn("[DeployPurge] Could not persist build version:", error);
  }

  if (signOut) {
    const { signOut: nextAuthSignOut } = await import("next-auth/react");
    await nextAuthSignOut({
      redirect: true,
      callbackUrl: `/?deploy=${encodeURIComponent(newBuildId)}`,
    });
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("__deploy", newBuildId);
  window.location.replace(url.toString());
}

export { BUILD_VERSION_KEY };
