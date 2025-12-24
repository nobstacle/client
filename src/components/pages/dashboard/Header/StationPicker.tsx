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

  // Initialize from saved station immediately
  const [currentStation, setCurrentStation] = useState<string>(() => {
    if (typeof window === 'undefined') return "1";

    const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
    const urlStation = searchParams.get("station");

    return savedStation || urlStation || "1";
  });

  const hasInitialized = useRef(false);

  // Sync on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
    const urlStation = searchParams.get("station");

    console.log('[StationPicker] Mount - Saved:', savedStation, 'URL:', urlStation);

    if (savedStation) {
      setCurrentStation(savedStation);
      if (!urlStation || urlStation !== savedStation) {
        router.push("station", savedStation);
      }
    } else if (urlStation) {
      localStorage.setItem(STATION_STORAGE_KEY, urlStation);
      setCurrentStation(urlStation);
    }
  }, []);

  // Listen for external URL changes
  useEffect(() => {
    if (!hasInitialized.current) return;

    const urlStation = searchParams.get("station");
    if (urlStation && urlStation !== currentStation) {
      console.log('[StationPicker] URL changed to:', urlStation);
      setCurrentStation(urlStation);
      localStorage.setItem(STATION_STORAGE_KEY, urlStation);
    }
  }, [searchParams, currentStation]);

  const handleStationChange = (newStation: string) => {
    console.log('[StationPicker] Changing station to:', newStation);

    // Update immediately
    setCurrentStation(newStation);
    localStorage.setItem(STATION_STORAGE_KEY, newStation);

    // Update URL
    if (cb) cb();
    router.push("station", newStation);

    // Notify extension if in iframe
    if (window.self !== window.top) {
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
    }
  };

  // Show loading only during data fetch, not initialization
  if (isLoading) {
    return (
      <div className="w-full min-w-[80px] rounded-md bg-gray-100 px-3 py-1.5">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

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