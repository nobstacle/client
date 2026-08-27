"use client";

import { signOut } from "next-auth/react";
import { invalidateSessionCache } from "./custom-instance";

const LOGGED_OUT_URL = "/?loggedOut=1";

async function clearClientCaches(): Promise<void> {
  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }
  try {
    localStorage.clear();
  } catch {
    // ignore
  }
  if (typeof caches !== "undefined") {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // ignore
    }
  }
}

/**
 * Fully end a client/kiosk session. Pairing cookies are set with Domain=.nobstacle.com,
 * which NextAuth signOut often fails to delete — then middleware on `/` sends the
 * user straight back to `/client`.
 */
export async function logoutClientSession(): Promise<void> {
  invalidateSessionCache();

  if (typeof window !== "undefined") {
    window.postMessage({ type: "LOGOUT_REQUEST" }, "*");
    if (window.parent !== window) {
      window.parent.postMessage({ type: "LOGOUT_REQUEST" }, "*");
    }
  }

  try {
    await signOut({ redirect: false, callbackUrl: LOGGED_OUT_URL });
  } catch (error) {
    console.error("[logout] NextAuth signOut failed:", error);
  }

  try {
    await fetch("/api/auth/clear-session", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    console.error("[logout] clear-session failed:", error);
  }

  await clearClientCaches();
  window.location.replace(LOGGED_OUT_URL);
}
