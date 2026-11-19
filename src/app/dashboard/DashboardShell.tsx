"use client";
import React, { useEffect, useRef } from "react";

import dynamic from "next/dynamic";
import { Session } from "next-auth";
import { signOut, useSession } from "next-auth/react";
import ClientSidebar from "./Sidebar";
import { TrialDashboardNotice } from "../../components/trial/TrialDashboardNotice";
import DashboardFeatureGate from "../../components/pages/dashboard/DashboardFeatureGate";
import {
  DashboardNavigationProvider,
  useDashboardNavigation,
} from "../../context/DashboardNavigationProvider";

// ClientHeader is a 215 KB monolith. Loading it lazily means it does NOT
// block the initial JS bundle for any dashboard route and is fetched in
// parallel with the route chunk instead of sequentially before it.
// The fallback is an empty div with the same height so the layout doesn't jump.
const ClientHeader = dynamic(() => import("./ClientHeader"), {
  ssr: false,
  loading: () => (
    <div
      style={{ height: 56, minHeight: 56 }}
      className="w-full bg-[#3b5998] flex-shrink-0"
    />
  ),
});

function DashboardContentArea({ children }: { children: React.ReactNode }) {
  const { isNavigating } = useDashboardNavigation();

  return (
    <div
      id="child3"
      className="relative flex h-full min-h-0 w-full min-w-0 flex-col items-stretch justify-stretch overflow-y-auto overflow-x-hidden bg-white"
    >
      {/* Lightweight top progress bar — replaces the full white overlay which
          was blocking content view for the entire navigation duration */}
      {isNavigating ? (
        <div
          className="absolute top-0 left-0 right-0 z-20 h-[3px] bg-[#3b5998] origin-left"
          style={{
            animation: "navProgress 1.5s ease-in-out infinite",
          }}
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading page"
        />
      ) : null}
      <DashboardFeatureGate>{children}</DashboardFeatureGate>

      <style>{`
        @keyframes navProgress {
          0%   { transform: scaleX(0); }
          50%  { transform: scaleX(0.7); }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function DashboardShell({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession?: Session | null;
}) {
  const { data: user, status } = useSession();
  const activeUser = user ?? (status === "loading" ? initialSession ?? null : null);
  const recoveryTriggeredRef = useRef(false);

  // If the client session resolves without a valid user (e.g. token refresh failed),
  // clear the stale session cleanly instead of leaving a broken Display-only sidebar.
  useEffect(() => {
    if (recoveryTriggeredRef.current) return;
    if (status === "unauthenticated" || (status === "authenticated" && !user?.user)) {
      recoveryTriggeredRef.current = true;
      void signOut({ callbackUrl: "/" });
    }
  }, [status, user]);

  return (
    <DashboardNavigationProvider>
      <ClientHeader user={activeUser} />
      <TrialDashboardNotice />
      <div className="flex flex-1 min-h-0 min-w-0 flex-row overflow-hidden bg-white">
        <ClientSidebar user={activeUser} sessionStatus={status} />
        <DashboardContentArea>{children}</DashboardContentArea>
      </div>
    </DashboardNavigationProvider>
  );
}