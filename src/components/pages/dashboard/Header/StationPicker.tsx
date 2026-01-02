"use client";

import {
  getCompanyControllerGetCompanyQueryKey,
  useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

const STATION_STORAGE_KEY = 'nobstacle_selected_station';

const isChromeExtension = (): boolean => {
  return typeof window !== 'undefined' &&
    typeof (window as any).chrome !== 'undefined' &&
    typeof (window as any).chrome.runtime !== 'undefined';
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
  const [currentStation, setCurrentStation] = useState<string>("1");
  const isUpdatingRef = useRef(false);

  // Load station on mount - FIX: Better loading logic
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadStation = async () => {
      console.log('[StationPicker] 🔍 Loading station...');
      
      if (isChromeExtension()) {
        // Method 1: Try chrome.storage.local directly first (fastest)
        try {
          const result = await (window as any).chrome.storage.local.get([STATION_STORAGE_KEY]);
          if (result[STATION_STORAGE_KEY]) {
            const station = String(result[STATION_STORAGE_KEY]);
            console.log('[StationPicker] ✅ Loaded from chrome.storage:', station);
            setCurrentStation(station);
            
            // Update URL if needed
            const urlStation = searchParams.get('station');
            if (urlStation !== station) {
              router.push('station', station);
            }
            return;
          }
        } catch (error) {
          console.error('[StationPicker] Error reading chrome.storage:', error);
        }

        // Method 2: Fallback to background script
        (window as any).chrome.runtime.sendMessage(
          { action: 'getStation' },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              console.error('[StationPicker] Background error:', (window as any).chrome.runtime.lastError);
              // Final fallback to URL or default
              const urlStation = searchParams.get('station') || '1';
              setCurrentStation(urlStation);
              return;
            }

            if (response && response.success && response.station) {
              const station = String(response.station);
              console.log('[StationPicker] ✅ Loaded from background:', station);
              setCurrentStation(station);
              
              // Update URL if needed
              const urlStation = searchParams.get('station');
              if (urlStation !== station) {
                router.push('station', station);
              }
            }
          }
        );
      } else {
        // Not in extension, use URL or localStorage
        const localStation = localStorage.getItem(STATION_STORAGE_KEY);
        const urlStation = searchParams.get('station');
        const station = urlStation || localStation || '1';
        
        console.log('[StationPicker] ✅ Using station (non-extension):', station);
        setCurrentStation(station);
        
        if (!urlStation && localStation) {
          router.push('station', localStation);
        }
      }
    };

    // Small delay to ensure chrome extension context is ready
    setTimeout(loadStation, 50);
  }, []);

  // Listen for station changes from other sources
  useEffect(() => {
    const handleStationChange = (event: CustomEvent) => {
      if (isUpdatingRef.current) return; // Prevent loops
      
      const newStation = String(event.detail.station);
      console.log('[StationPicker] 📡 External change:', newStation);
      setCurrentStation(newStation);
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
    };
  }, []);

  // Listen for chrome.storage changes (for extension)
  useEffect(() => {
    if (!isChromeExtension()) return;

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes[STATION_STORAGE_KEY]) {
        if (isUpdatingRef.current) return;
        
        const newStation = String(changes[STATION_STORAGE_KEY].newValue);
        console.log('[StationPicker] 📡 Chrome storage changed:', newStation);
        setCurrentStation(newStation);
      }
    };

    (window as any).chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      (window as any).chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleStationChange = async (newStation: string) => {
    console.log('[StationPicker] 👤 User selected:', newStation);
    
    // Set flag to prevent loops
    isUpdatingRef.current = true;
    
    // Update UI immediately
    setCurrentStation(newStation);
    
    // Save to localStorage first (synchronous)
    localStorage.setItem(STATION_STORAGE_KEY, newStation);
    
    if (isChromeExtension()) {
      // Save to chrome.storage.local directly
      try {
        await (window as any).chrome.storage.local.set({ [STATION_STORAGE_KEY]: newStation });
        console.log('[StationPicker] ✅ Saved to chrome.storage');
      } catch (error) {
        console.error('[StationPicker] Error saving to chrome.storage:', error);
      }

      // Also notify background script
      (window as any).chrome.runtime.sendMessage({
        action: 'setStation',
        station: newStation
      }, (response: any) => {
        if ((window as any).chrome.runtime.lastError) {
          console.error('[StationPicker] Background error:', (window as any).chrome.runtime.lastError);
        } else {
          console.log('[StationPicker] ✅ Background confirmed');
        }
        
        // Reset flag after a delay
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 500);
      });
    } else {
      // Reset flag for non-extension
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);
    }
    
    // Update URL
    router.push("station", newStation);
    
    // Notify parent if in iframe
    if (window.self !== window.top) {
      window.parent.postMessage({
        type: 'STATION_CHANGE',
        station: newStation
      }, '*');
    }
    
    // Dispatch event for other components
    const event = new CustomEvent('stationChanged', {
      detail: { station: newStation }
    });
    window.dispatchEvent(event);
    
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
      {Array(data?.stationCount || 10)
        .fill(1)
        .map((x, y) => x + y)
        .map((val) => (
          <option value={String(val)} key={`station-${val}`}>
            Station {val}
          </option>
        ))}
    </select>
  );
};