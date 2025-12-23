"use client";

import {
  getCompanyControllerGetCompanyQueryKey,
  useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [currentStation, setCurrentStation] = useState<string>("1");

  // Load saved station from localStorage on mount
  useEffect(() => {
    const savedStation = localStorage.getItem(STATION_STORAGE_KEY);
    const urlStation = searchParams.get("station");
    
    if (savedStation && !urlStation) {
      // We have a saved station but no URL param - restore it
      console.log('[StationPicker] Restoring saved station:', savedStation);
      setCurrentStation(savedStation);
      router.push("station", savedStation);
    } else if (urlStation) {
      // URL has station - use it and save it
      setCurrentStation(urlStation);
      if (savedStation !== urlStation) {
        localStorage.setItem(STATION_STORAGE_KEY, urlStation);
        console.log('[StationPicker] Synced station to storage:', urlStation);
      }
    } else {
      // No saved station, no URL - use default
      const defaultStation = "1";
      setCurrentStation(defaultStation);
      localStorage.setItem(STATION_STORAGE_KEY, defaultStation);
      router.push("station", defaultStation);
    }
  }, []); // Only run once on mount

  // Sync with URL changes
  useEffect(() => {
    const urlStation = searchParams.get("station");
    if (urlStation && urlStation !== currentStation) {
      setCurrentStation(urlStation);
      localStorage.setItem(STATION_STORAGE_KEY, urlStation);
    }
  }, [searchParams]);

  const handleStationChange = (newStation: string) => {
    console.log('[StationPicker] Station changed to:', newStation);
    
    // Save to localStorage
    localStorage.setItem(STATION_STORAGE_KEY, newStation);
    console.log('[StationPicker] ✓ Saved to localStorage');
    
    // Update state
    setCurrentStation(newStation);

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