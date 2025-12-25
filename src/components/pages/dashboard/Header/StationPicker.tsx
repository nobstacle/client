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

// Helper to get station from Chrome storage
const getChromeStation = (): Promise<string | null> => {
  if (!isChromeExtension()) return Promise.resolve(null);
  
  return new Promise((resolve) => {
    (window as any).chrome.storage.local.get([STATION_STORAGE_KEY], (result: any) => {
      const station = result[STATION_STORAGE_KEY] || null;
      console.log('[StationPicker] Chrome storage read:', station);
      resolve(station);
    });
  });
};

// 🔧 CRITICAL FIX: Save to BOTH localStorage AND Chrome storage
const saveStationToBothStorages = async (station: string): Promise<void> => {
  console.log('[StationPicker] 💾 Saving station to both storages:', station);
  
  // Always save to localStorage
  localStorage.setItem(STATION_STORAGE_KEY, station);
  console.log('[StationPicker] ✅ Saved to localStorage:', station);
  
  // Save to Chrome storage if available
  if (isChromeExtension()) {
    return new Promise((resolve) => {
      (window as any).chrome.storage.local.set({
        [STATION_STORAGE_KEY]: station
      }, () => {
        if ((window as any).chrome.runtime.lastError) {
          console.error('[StationPicker] ❌ Chrome storage error:', (window as any).chrome.runtime.lastError);
        } else {
          console.log('[StationPicker] ✅ Saved to Chrome storage:', station);
        }
        resolve();
      });
    });
  }
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

  // Start with station from localStorage immediately
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

      // Priority 1: localStorage (set by webapp or extension)
      const localStation = localStorage.getItem(STATION_STORAGE_KEY);
      if (localStation) {
        console.log('[StationPicker] ✓ Found in localStorage:', localStation);
        finalStation = localStation;
      }

      // Priority 2: Chrome extension storage (if different)
      if (isInExtension) {
        const chromeStation = await getChromeStation();
        if (chromeStation && chromeStation !== finalStation) {
          console.log('[StationPicker] ✓ Chrome storage differs, using:', chromeStation);
          finalStation = chromeStation;
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

      // 🔧 CRITICAL: Sync to BOTH storages
      await saveStationToBothStorages(finalStation);

      // Update URL if needed
      if (urlStation !== finalStation) {
        console.log('[StationPicker] 🔄 Updating URL from', urlStation, 'to', finalStation);
        router.push("station", finalStation);
      }
    };

    initializeStation();
  }, []);

  // Listen for external station changes
  useEffect(() => {
    if (!hasInitialized.current) return;

    const handleStationChange = async (event: CustomEvent) => {
      const newStation = event.detail.station;
      console.log('[StationPicker] 📡 External change detected:', newStation);
      
      setCurrentStation(newStation);
      await saveStationToBothStorages(newStation);
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
    };
  }, []);

  const handleStationChange = async (newStation: string) => {
    console.log('[StationPicker] 👤 User changed station to:', newStation);

    // Update state immediately
    setCurrentStation(newStation);

    // 🔧 CRITICAL FIX: Save to BOTH storages
    await saveStationToBothStorages(newStation);
    
    // If in iframe, notify parent
    if (window.self !== window.top) {
      console.log('[StationPicker] 📤 Sending STATION_CHANGE to extension...');
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
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