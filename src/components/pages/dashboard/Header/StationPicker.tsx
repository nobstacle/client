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

// 🔧 CRITICAL FIX: Save to BOTH storages with proper error handling
const saveStationToBothStorages = async (station: string): Promise<void> => {
  console.log('[StationPicker] 💾 Saving station to both storages:', station);
  
  // Always save to localStorage first
  try {
    localStorage.setItem(STATION_STORAGE_KEY, station);
    console.log('[StationPicker] ✅ Saved to localStorage:', station);
  } catch (error) {
    console.error('[StationPicker] ❌ localStorage error:', error);
  }
  
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
  const initializationPromise = useRef<Promise<void> | null>(null);

  // Start with null to indicate we're loading
  const [currentStation, setCurrentStation] = useState<string | null>(null);

  // Initialize station ONCE on mount - with debounce
  useEffect(() => {
    if (hasInitialized.current || initializationPromise.current) return;
    hasInitialized.current = true;

    initializationPromise.current = (async () => {
      console.log('[StationPicker] 🚀 Starting initialization...');
      
      // CRITICAL: Wait a moment for extension to finish loading
      if (isInExtension) {
        console.log('[StationPicker] ⏳ Waiting for extension to initialize...');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      let finalStation = "1";
      const urlStation = searchParams.get("station");
      
      console.log('[StationPicker] URL station:', urlStation);

      // Priority 1: Chrome extension storage (most reliable for extension)
      if (isInExtension) {
        const chromeStation = await getChromeStation();
        if (chromeStation) {
          console.log('[StationPicker] ✓ Found in Chrome storage:', chromeStation);
          finalStation = chromeStation;
        }
      }

      // Priority 2: localStorage (might be more recent)
      const localStation = localStorage.getItem(STATION_STORAGE_KEY);
      if (localStation && localStation !== finalStation) {
        console.log('[StationPicker] ✓ localStorage differs, checking recency...');
        // If in extension and they differ, Chrome storage takes priority
        if (!isInExtension) {
          finalStation = localStation;
          console.log('[StationPicker] ✓ Using localStorage:', localStation);
        }
      }

      // Priority 3: URL parameter (only if nothing else is set)
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

      initializationPromise.current = null;
    })();
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

    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'STATION_CHANGE') {
        const newStation = String(event.data.station);
        console.log('[StationPicker] 📨 Station change message received:', newStation);
        
        setCurrentStation(newStation);
        await saveStationToBothStorages(newStation);
      }
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
      window.removeEventListener('message', handleMessage);
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

  // Show loading state while initializing
  if (isLoading || currentStation === null) {
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