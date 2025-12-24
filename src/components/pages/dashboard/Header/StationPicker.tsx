"use client";

import {
  getCompanyControllerGetCompanyQueryKey,
  useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const STATION_STORAGE_KEY = 'nobstacle_selected_station';

// Helper to check if we're in Chrome extension
const isChromeExtension = (): boolean => {
  return typeof window !== 'undefined' &&
    typeof (window as any).chrome !== 'undefined' &&
    typeof (window as any).chrome.storage !== 'undefined';
};

// Helper to get station from Chrome storage (for extension context)
const getChromeStation = (): Promise<string | null> => {
  if (!isChromeExtension()) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    (window as any).chrome.storage.local.get(['nobstacle_selected_station'], (result: any) => {
      resolve(result.nobstacle_selected_station || null);
    });
  });
};

// Helper to save station to Chrome storage (for extension context)
const setChromeStation = (station: string): void => {
  if (!isChromeExtension()) return;
  
  (window as any).chrome.storage.local.set({
    nobstacle_selected_station: station
  });
};

export const StationPicker: React.FC<{ cb?: () => void }> = ({ cb }) => {
  const { data, isLoading } = useCompanyControllerGetCompany({
    query: {
      staleTime: Infinity,
      queryKey: getCompanyControllerGetCompanyQueryKey(),
    },
  });
  const router = useRouterWithQueryParams();
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);
  const isInExtension = useRef(isChromeExtension());

  // Initialize station - ONLY read, don't write yet
  const [currentStation, setCurrentStation] = useState<string>(() => {
    if (typeof window === 'undefined') return "1";
    
    // Just read from localStorage for initial render
    const saved = localStorage.getItem(STATION_STORAGE_KEY);
    return saved || "1";
  });

  // ONE-TIME initialization on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeStation = async () => {
      let finalStation = "1";

      // Priority 1: Chrome extension storage (if in extension)
      if (isInExtension.current) {
        const chromeStation = await getChromeStation();
        if (chromeStation) {
          console.log('[StationPicker] ✓ Using Chrome storage:', chromeStation);
          finalStation = chromeStation;
        }
      }

      // Priority 2: localStorage (if no Chrome storage)
      if (finalStation === "1") {
        const localStation = localStorage.getItem(STATION_STORAGE_KEY);
        if (localStation) {
          console.log('[StationPicker] ✓ Using localStorage:', localStation);
          finalStation = localStation;
        }
      }

      // Priority 3: URL parameter (if no storage)
      if (finalStation === "1") {
        const urlStation = searchParams.get("station");
        if (urlStation) {
          console.log('[StationPicker] ✓ Using URL param:', urlStation);
          finalStation = urlStation;
        }
      }

      console.log('[StationPicker] Final station:', finalStation);

      // Update state
      setCurrentStation(finalStation);

      // Sync to all storage locations
      localStorage.setItem(STATION_STORAGE_KEY, finalStation);
      if (isInExtension.current) {
        setChromeStation(finalStation);
      }

      // Update URL if needed
      const currentUrlStation = searchParams.get("station");
      if (currentUrlStation !== finalStation) {
        router.push("station", finalStation);
      }
    };

    initializeStation();
  }, []); // Empty deps - run only once

  // Listen for external station changes (from extension or other tabs)
  useEffect(() => {
    if (!hasInitialized.current) return;

    const handleStationChange = (event: CustomEvent) => {
      const newStation = event.detail.station;
      console.log('[StationPicker] External change detected:', newStation);
      
      setCurrentStation(newStation);
      localStorage.setItem(STATION_STORAGE_KEY, newStation);
      if (isInExtension.current) {
        setChromeStation(newStation);
      }
    };

    const handlePopState = () => {
      const urlStation = searchParams.get("station");
      if (urlStation && urlStation !== currentStation) {
        console.log('[StationPicker] URL changed via popstate:', urlStation);
        setCurrentStation(urlStation);
        localStorage.setItem(STATION_STORAGE_KEY, urlStation);
        if (isInExtension.current) {
          setChromeStation(urlStation);
        }
      }
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [currentStation, searchParams, isInExtension.current]);

  const handleStationChange = (newStation: string) => {
    console.log('[StationPicker] User changed station to:', newStation);

    // Update state immediately
    setCurrentStation(newStation);

    // Save to ALL storage locations synchronously
    localStorage.setItem(STATION_STORAGE_KEY, newStation);
    
    if (isInExtension.current) {
      setChromeStation(newStation);
    }

    // Update URL
    router.push("station", newStation);

    // Notify extension if in iframe
    if (window.self !== window.top) {
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
    }

    // Dispatch custom event for other components
    const event = new CustomEvent('stationChanged', {
      detail: { station: newStation }
    });
    window.dispatchEvent(event);

    // Execute callback
    if (cb) cb();
  };

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