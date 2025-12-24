"use client";

import {
  getCompanyControllerGetCompanyQueryKey,
  useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const STATION_STORAGE_KEY = 'nobstacle_selected_station';

export const StationPicker: React.FC<{ cb?: () => void }> = ({ cb }) => {
  const { data, isLoading } = useCompanyControllerGetCompany({
    query: {
      staleTime: Infinity,
      queryKey: getCompanyControllerGetCompanyQueryKey(),
    },
  });
  const router = useRouterWithQueryParams();
  const searchParams = useSearchParams();

  // Initialize with saved station or URL station, NOT a default
  const [currentStation, setCurrentStation] = useState<string>(() => {
    // This runs ONCE during initial render
    if (typeof window === 'undefined') return "1"; // SSR safety

    const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
    const urlStation = searchParams.get("station");

    const initialStation = savedStation || urlStation || "1";
    console.log('[StationPicker] Initial state:', initialStation);
    return initialStation;
  });

  // Track if we've done the initial sync
  const hasInitialized = useRef(false);

  // Initial sync - run once on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
    const urlStation = searchParams.get("station");

    console.log('[StationPicker] Mount sync - Saved:', savedStation, 'URL:', urlStation);

    if (savedStation) {
      // localStorage is the source of truth
      setCurrentStation(savedStation);

      if (!urlStation || urlStation !== savedStation) {
        console.log('[StationPicker] Syncing URL to saved station:', savedStation);
        router.push("station", savedStation);
      }
    } else if (urlStation) {
      // No saved station, but URL has one - save it
      console.log('[StationPicker] Saving URL station to localStorage:', urlStation);
      localStorage.setItem(STATION_STORAGE_KEY, urlStation);
      setCurrentStation(urlStation);
    } else {
      // No saved station, no URL - use default
      const defaultStation = "1";
      console.log('[StationPicker] Using default station:', defaultStation);
      localStorage.setItem(STATION_STORAGE_KEY, defaultStation);
      setCurrentStation(defaultStation);
      router.push("station", defaultStation);
    }
  }, []); // Empty deps - run once

  // Listen for URL changes from external sources (like extension)
  useEffect(() => {
    if (!hasInitialized.current) return; // Skip on initial mount

    const urlStation = searchParams.get("station");

    if (urlStation && urlStation !== currentStation) {
      console.log('[StationPicker] URL changed externally to:', urlStation);
      setCurrentStation(urlStation);
      localStorage.setItem(STATION_STORAGE_KEY, urlStation);
    }
  }, [searchParams]); // Only when searchParams changes

  const handleStationChange = (newStation: string) => {
    console.log('[StationPicker] Station changed to:', newStation);

    // Update state immediately
    setCurrentStation(newStation);

    // Save to localStorage
    localStorage.setItem(STATION_STORAGE_KEY, newStation);
    console.log('[StationPicker] ✓ Saved to localStorage');

    // Update URL
    if (cb) {
      cb();
    }
    router.push("station", newStation);

    // Notify extension if in iframe
    if (window.self !== window.top) {
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
    }
  };

  if (isLoading) return null;

  return (
    <select
      className="w-full min-w-[80px] rounded-md"
      onChange={(e) => handleStationChange(e.currentTarget.value)}
      value={currentStation}
    >
      {Array(data?.stationCount)
        .fill(1)
        .map((x, y) => x + y)
        .map((val, index) => (
          <option value={String(val)} key={`station-picker-item-${index}`}>
            Station {val}
          </option>
        ))}
    </select>
  );
};