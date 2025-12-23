"use client";

declare global {
  interface Window {
    chrome?: {
      storage?: {
        local: {
          get: (keys: string[], callback: (result: Record<string, unknown>) => void) => void;
          set: (items: Record<string, unknown>, callback?: () => void) => void;
        };
      };
    };
  }
}

import {
  getCompanyControllerGetCompanyQueryKey,
  useCompanyControllerGetCompany,
} from "../../../../lib/client/api";
import { useRouterWithQueryParams } from "../../../../hooks/useRouterWithQueryParams";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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

  // Load saved station on mount
  useEffect(() => {
    // Check if we're in the extension context
    if (typeof window !== 'undefined' && window.chrome?.storage) {
      window.chrome.storage.local.get(['selectedStation'], (result) => {
        if (result.selectedStation) {
          const savedStation = String(result.selectedStation);
          setCurrentStation(savedStation);
          
          // If URL doesn't have station param, set it
          if (!searchParams.get("station")) {
            router.push("station", savedStation);
          }
        } else {
          // Use URL param or default to 1
          const urlStation = searchParams.get("station") ?? "1";
          setCurrentStation(urlStation);
        }
      });
    } else {
      // Not in extension, just use URL param
      setCurrentStation(searchParams.get("station") ?? "1");
    }
  }, [searchParams, router]);

  const handleStationChange = (newStation: string) => {
    // Save to chrome.storage if available
    if (typeof window !== 'undefined' && window.chrome?.storage) {
      window.chrome.storage.local.set({
        selectedStation: newStation
      }, () => {
        console.log('[StationPicker] Station saved:', newStation);
      });
    }

    // Update local state
    setCurrentStation(newStation);

    // Update URL
    if (cb) {
      cb();
    }
    router.push("station", newStation);
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