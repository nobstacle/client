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

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadStation = async () => {
      console.log('[StationPicker] 🚀 Loading station from background...');

      // If in extension, ask background
      if (typeof (window as any).chrome?.runtime?.sendMessage === 'function') {
        (window as any).chrome.runtime.sendMessage(
          { action: 'getStation' },
          (response: any) => {
            if (response && response.success && response.station) {
              const station = response.station;
              console.log('[StationPicker] ✓ Got station from background:', station);
              setCurrentStation(station);

              // Update URL if different
              const urlStation = searchParams.get('station');
              if (urlStation !== station) {
                router.push('station', station);
              }
            } else {
              // Fallback
              const urlStation = searchParams.get('station') || '1';
              setCurrentStation(urlStation);
              console.log('[StationPicker] ⚠️ Using fallback:', urlStation);
            }
          }
        );
      } else {
        // Not in extension
        const urlStation = searchParams.get('station') || '1';
        setCurrentStation(urlStation);
      }
    };

    loadStation();
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
    console.log('[StationPicker] 👤 Changing to station:', newStation);

    setCurrentStation(newStation);

    // Save to background
    if (typeof (window as any).chrome?.runtime?.sendMessage === 'function') {
      (window as any).chrome.runtime.sendMessage({
        action: 'setStation',
        station: newStation
      }, (response: any) => {
        if (response && response.success) {
          console.log('[StationPicker] ✓ Background saved');
        }
      });
    }

    // Save to localStorage
    localStorage.setItem(STATION_STORAGE_KEY, newStation);

    // Notify parent
    if (window.self !== window.top) {
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
    }

    // Update URL
    router.push("station", newStation);

    // Dispatch event
    const event = new CustomEvent('stationChanged', {
      detail: { station: newStation }
    });
    window.dispatchEvent(event);

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