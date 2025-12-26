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

  // Load station on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const loadStation = () => {
      console.log('[StationPicker] 🔍 Loading station...');
      
      if (isChromeExtension()) {
        // Ask background for station
        (window as any).chrome.runtime.sendMessage(
          { action: 'getStation' },
          (response: any) => {
            if (response && response.success) {
              const station = response.station || "1";
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
        // Not in extension, use URL
        const urlStation = searchParams.get('station') || '1';
        console.log('[StationPicker] ✅ Using URL:', urlStation);
        setCurrentStation(urlStation);
      }
    };

    // Small delay to ensure background is ready
    setTimeout(loadStation, 100);
  }, []);

  // Listen for station changes from other sources
  useEffect(() => {
    const handleStationChange = (event: CustomEvent) => {
      const newStation = event.detail.station;
      console.log('[StationPicker] 📡 External change:', newStation);
      setCurrentStation(newStation);
    };

    window.addEventListener('stationChanged', handleStationChange as EventListener);

    return () => {
      window.removeEventListener('stationChanged', handleStationChange as EventListener);
    };
  }, []);

  const handleStationChange = (newStation: string) => {
    console.log('[StationPicker] 👤 User selected:', newStation);
    
    // Update UI immediately
    setCurrentStation(newStation);
    
    if (isChromeExtension()) {
      // Save to background
      (window as any).chrome.runtime.sendMessage({
        action: 'setStation',
        station: newStation
      }, (response: any) => {
        console.log('[StationPicker] ✅ Saved to background');
      });
    }
    
    // Save to localStorage
    localStorage.setItem(STATION_STORAGE_KEY, newStation);
    
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