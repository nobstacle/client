"use client";

import { useSession } from "next-auth/react";
import ClientSidebar from "./Sidebar";
import ClientHeader from "./ClientHeader";
import { TrialDashboardNotice } from "../../components/trial/TrialDashboardNotice";
import DashboardFeatureGate from "../../components/pages/dashboard/DashboardFeatureGate";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useSession();

  return (
    <>
      <ClientHeader user={user ?? null} />
      <TrialDashboardNotice />
      <div className="flex flex-1 min-h-0 min-w-0 flex-row overflow-hidden bg-white">
        <ClientSidebar user={user ?? null} />
        <div
          id="child3"
          className="flex h-full min-h-0 w-full min-w-0 flex-col items-stretch justify-stretch overflow-hidden bg-white"
        >
          <DashboardFeatureGate>{children}</DashboardFeatureGate>
        </div>
      </div>
    </>
  );
}
