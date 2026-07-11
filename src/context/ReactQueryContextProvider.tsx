"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export const ReactQueryContextProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ── Prevent unnecessary refetch storms on route changes ──────────
            //
            // Without these defaults, React Query refetches every query that is
            // "stale" (staleTime defaults to 0 = immediately stale) whenever:
            //   • The window regains focus  (tab switching, alt-tab, etc.)
            //   • A component remounts      (route change re-renders providers)
            //
            // Since all real data queries already set staleTime: Infinity,
            // these defaults only catch anything that falls through without an
            // explicit setting — but refetchOnWindowFocus alone was causing a
            // mass-refetch on every focus event across the entire query cache.
            staleTime: 5 * 60 * 1000,   // 5 minutes — safe baseline for any query without an explicit staleTime
            refetchOnWindowFocus: false, // ❌ no mass refetch when user alt-tabs back
            refetchOnMount: false,       // ❌ don't refetch if fresh data is already cached
            retry: 1,                    // one retry on failure (down from 3)
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
