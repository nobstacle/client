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
      const station = result.nobstacle_selected_station || null;
      console.log('[StationPicker] Chrome storage read:', station);
      resolve(station);
    });
  });
};

// Helper to save station to Chrome storage (for extension context)
const setChromeStation = (station: string): Promise<void> => {
  if (!isChromeExtension()) return Promise.resolve();
  
  return new Promise((resolve) => {
    (window as any).chrome.storage.local.set({
      nobstacle_selected_station: station
    }, () => {
      console.log('[StationPicker] Chrome storage saved:', station);
      resolve();
    });
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
  const isInExtension = isChromeExtension();

  // Start with station from localStorage immediately (synchronous)
  const [currentStation, setCurrentStation] = useState<string>(() => {
    if (typeof window === 'undefined') return "1";
    
    const saved = localStorage.getItem(STATION_STORAGE_KEY);
    console.log('[StationPicker] Initial state from localStorage:', saved || "1");
    return saved || "1";
  });

  // Initialize station ONCE on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeStation = async () => {
      console.log('[StationPicker] 🚀 Starting initialization...');
      
      let finalStation = "1";
      const urlStation = searchParams.get("station");
      
      console.log('[StationPicker] URL station:', urlStation);

      // Priority 1: Chrome extension storage
      if (isInExtension) {
        const chromeStation = await getChromeStation();
        if (chromeStation) {
          console.log('[StationPicker] ✓ Using Chrome storage:', chromeStation);
          finalStation = chromeStation;
        }
      }

      // Priority 2: localStorage (if no Chrome storage)
      if (finalStation === "1" && !isInExtension) {
        const localStation = localStorage.getItem(STATION_STORAGE_KEY);
        if (localStation) {
          console.log('[StationPicker] ✓ Using localStorage:', localStation);
          finalStation = localStation;
        }
      }

      // Priority 3: URL parameter (lowest priority)
      if (finalStation === "1" && urlStation && urlStation !== "1") {
        console.log('[StationPicker] ✓ Using URL param:', urlStation);
        finalStation = urlStation;
      }

      console.log('[StationPicker] 🎯 Final station decision:', finalStation);

      // Update state
      setCurrentStation(finalStation);

      // Sync to all storage locations
      localStorage.setItem(STATION_STORAGE_KEY, finalStation);
      if (isInExtension) {
        await setChromeStation(finalStation);
      }

      // CRITICAL: Update URL if it doesn't match
      if (urlStation !== finalStation) {
        console.log('[StationPicker] 🔄 Updating URL from', urlStation, 'to', finalStation);
        router.push("station", finalStation);
      }
    };

    initializeStation();
  }, []); // Run only once on mount

  // Listen for external station changes
  useEffect(() => {
    if (!hasInitialized.current) return;

    const handleStationChange = (event: CustomEvent) => {
      const newStation = event.detail.station;
      console.log('[StationPicker] 📡 External change detected:', newStation);
      
      setCurrentStation(newStation);
      localStorage.setItem(STATION_STORAGE_KEY, newStation);
      if (isInExtension) {
        setChromeStation(newStation);
      }
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
    };
  }, [isInExtension]);

const handleStationChange = async (newStation: string) => {
    console.log('[ClientHeader] 👤 User changed station to:', newStation);

    // Update state immediately
    setCurrentStation(newStation);

    // Save to localStorage
    localStorage.setItem(STATION_STORAGE_KEY, newStation);
    console.log('[ClientHeader] ✓ Saved to localStorage:', newStation);
    
    // ✅ CRITICAL FIX: If in iframe, tell parent to save to Chrome storage
    if (window.self !== window.top) {
      console.log('[ClientHeader] 📤 Sending STATION_CHANGE to extension...');
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
    } else if (isInExtension) {
      // Only try direct Chrome storage if NOT in iframe but Chrome API is available
      await setChromeStation(newStation);
      console.log('[ClientHeader] ✓ Saved to Chrome storage:', newStation);
    }

    // Update URL
    router.push("station", newStation);

    // Dispatch custom event
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