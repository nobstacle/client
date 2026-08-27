export const STATION_STORAGE_KEY = "nobstacle_selected_station";
export const STATION_CHANGED_EVENT = "stationChanged";

export function parseStation(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

export function getStationFromSearch(
  search: string | URLSearchParams | null | undefined,
): number | null {
  if (!search) return null;
  const params =
    typeof search === "string" ? new URLSearchParams(search.replace(/^\?/, "")) : search;
  return parseStation(params.get("station"));
}

export function getStationFromWindow(): number | null {
  if (typeof window === "undefined") return null;
  return getStationFromSearch(window.location.search);
}

export function getStationFromStorage(): number | null {
  if (typeof window === "undefined") return null;
  try {
    return parseStation(localStorage.getItem(STATION_STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Live station for the current tab.
 *
 * Prefer `window.location` over Next.js `useSearchParams()` because the
 * Chrome extension / iframe station picker updates the URL with
 * `history.pushState`, which does not notify the App Router. Falling back
 * to stale searchParams is why station 1 kept working while 2 and 3 did not.
 */
export function resolveActiveStation(opts?: {
  searchParams?: { get: (key: string) => string | null } | null;
  sessionStation?: unknown;
}): number {
  const fromWindow = getStationFromWindow();
  if (fromWindow) return fromWindow;

  const fromParams = parseStation(opts?.searchParams?.get("station"));
  if (fromParams) return fromParams;

  const fromSession = parseStation(opts?.sessionStation);
  if (fromSession) return fromSession;

  const fromStorage = getStationFromStorage();
  if (fromStorage) return fromStorage;

  return 1;
}

export function persistActiveStation(station: number): void {
  const parsed = parseStation(station);
  if (!parsed || typeof window === "undefined") return;
  try {
    localStorage.setItem(STATION_STORAGE_KEY, String(parsed));
  } catch {
    // ignore quota / private mode
  }
}

export function dispatchStationChanged(station: number): void {
  const parsed = parseStation(station);
  if (!parsed || typeof window === "undefined") return;
  persistActiveStation(parsed);
  window.dispatchEvent(
    new CustomEvent(STATION_CHANGED_EVENT, { detail: { station: parsed } }),
  );
}

export function lastDisplayedContentKey(station: number): string {
  return `lastDisplayedContent:${parseStation(station) ?? 1}`;
}

export function lastPublicContentKey(station: number): string {
  return `lastPublicContent:${parseStation(station) ?? 1}`;
}
