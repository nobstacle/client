"use client";

import { useSession } from "next-auth/react";
import ClientSidebar from "./Sidebar";
import ClientHeader from "./ClientHeader";
import { TrialDashboardNotice } from "../../components/trial/TrialDashboardNotice";
import DashboardFeatureGate from "../../components/pages/dashboard/DashboardFeatureGate";
import {
  DashboardNavigationProvider,
  useDashboardNavigation,
} from "../../context/DashboardNavigationProvider";

function DashboardContentArea({ children }: { children: React.ReactNode }) {
  const { isNavigating } = useDashboardNavigation();

  return (
    <div
      id="child3"
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col items-stretch justify-stretch overflow-hidden bg-white"
    >
      {isNavigating ? (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-white"
          aria-live="polite"
          aria-busy="true"
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-[#3b5998]"
              role="status"
              aria-label="Loading page"
            />
            <span className="text-sm text-gray-400">Loading…</span>
          </div>
        </div>
      ) : null}
      <DashboardFeatureGate>{children}</DashboardFeatureGate>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useSession();

  return (
    <DashboardNavigationProvider>
      <ClientHeader user={user ?? null} />
      <TrialDashboardNotice />
      <div className="flex flex-1 min-h-0 min-w-0 flex-row overflow-hidden bg-white">
        <ClientSidebar user={user ?? null} />
        <DashboardContentArea>{children}</DashboardContentArea>
      </div>
    </DashboardNavigationProvider>
  );
}
