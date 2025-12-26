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

      setTimeout(loadStation, 100);
    }, []);

    // Listen for station changes from other sources
    useEffect(() => {
      const handleStationChange = (event: CustomEvent) => {
        if (isUpdatingRef.current) return; // Prevent loops
        
        const newStation = event.detail.station;
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

    const handleStationChange = (newStation: string) => {
      console.log('[StationPicker] 👤 User selected:', newStation);
      
      // Set flag to prevent loops
      isUpdatingRef.current = true;
      
      // Update UI immediately
      setCurrentStation(newStation);
      
      if (isChromeExtension()) {
        // Save to background
        (window as any).chrome.runtime.sendMessage({
          action: 'setStation',
          station: newStation
        }, (response: any) => {
          console.log('[StationPicker] ✅ Saved to background');
          
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