import Axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

export const AXIOS_INSTANCE = Axios.create({
  baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

// ─── Session cache singleton ───────────────────────────────────────────────
// `getSession()` makes a full HTTP round-trip to /api/auth/session on EVERY
// call. With 11+ parallel React Query hooks firing per route change, this was
// causing 10–20 sequential auth round-trips before any real data could load.
//
// This singleton deduplicates concurrent calls (all callers share one pending
// promise) and caches the result for SESSION_CACHE_TTL_MS. The cache is
// invalidated automatically after the TTL, so a refreshed token is picked up
// within the next window without requiring a page reload.
// ──────────────────────────────────────────────────────────────────────────

const SESSION_CACHE_TTL_MS = 30_000; // 30 seconds

let _cachedSession: Awaited<ReturnType<typeof getSession>> | null = null;
let _sessionPromise: Promise<Awaited<ReturnType<typeof getSession>>> | null = null;
let _sessionCachedAt = 0;

/**
 * Returns the current next-auth session, re-using a shared in-flight promise
 * so that N concurrent API calls on the same tick only issue ONE HTTP request
 * to /api/auth/session instead of N.
 */
const getCachedSession = (): Promise<Awaited<ReturnType<typeof getSession>>> => {
  const now = Date.now();

  // Return cached value if still fresh
  if (_cachedSession !== null && now - _sessionCachedAt < SESSION_CACHE_TTL_MS) {
    return Promise.resolve(_cachedSession);
  }

  // If a fetch is already in-flight, share it — do NOT start another
  if (_sessionPromise !== null) {
    return _sessionPromise;
  }

  // Start a new fetch and cache the promise so concurrent callers share it
  _sessionPromise = getSession().then((session) => {
    _cachedSession = session;
    _sessionCachedAt = Date.now();
    _sessionPromise = null; // clear the in-flight ref
    return session;
  }).catch((err) => {
    _sessionPromise = null; // allow retry on next call
    throw err;
  });

  return _sessionPromise;
};

/** Call this after a sign-out or forced token refresh so the next call re-fetches. */
export const invalidateSessionCache = () => {
  _cachedSession = null;
  _sessionPromise = null;
  _sessionCachedAt = 0;
};

// ──────────────────────────────────────────────────────────────────────────

// add a second `options` argument here if you want to pass extra options to each generated query
export const nobstacleBackendApiInstance = async <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const token = await getCachedSession();

  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    headers: token?.user.backendTokens.at
      ? { Authorization: `Bearer ${token?.user.backendTokens.at}` }
      : undefined,
    cancelToken: source.token,
    withCredentials: true,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return await promise;
};

export type ErrorType<Error> = AxiosError<Error>;

export type BodyType<BodyData> = BodyData;
