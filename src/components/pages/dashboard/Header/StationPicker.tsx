
"use client";

import {
  getCompanyControllerGetCompanyQueryKey,
  useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";

const isChromeExtension = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof (window as any).chrome !== 'undefined' && 
         typeof (window as any).chrome.storage !== 'undefined';
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
  
  // Simply read from URL - don't manage state
  const currentStation = searchParams.get("station") ?? "1";

  const handleStationChange = (newStation: string) => {
    console.log('[StationPicker] Station changed to:', newStation);
    
    // Save to chrome.storage if available
    if (isChromeExtension()) {
      (window as any).chrome.storage.local.set({
        selectedStation: newStation
      }, () => {
        console.log('[StationPicker] ✓ Station saved to storage:', newStation);
      });
    }

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
            {val}
          </option>
        ))}
    </select>
  );
};
