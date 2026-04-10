"use client";

import { ReactNode } from "react";
import { formatTrialDate, getTrialStatus, TrialInfo } from "@/utils/trial";
import { TrialBadge } from "./TrialBadge";

interface TrialStatusBannerProps {
  trial?: TrialInfo | null;
  action?: ReactNode;
  className?: string;
}

export function TrialStatusBanner({
  trial,
  action,
  className = "",
}: TrialStatusBannerProps) {
  const status = getTrialStatus(trial);

  if (!status.isTrialAccount || !status.isTrialActive) {
    return null;
  }

  const daysLeft = status.trialDaysLeft ?? 0;

  return (
    <div
      className={`border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 px-4 py-3 ${className}`.trim()}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <TrialBadge trial={trial} />
          <p className="text-sm font-medium text-amber-950" style={{ marginBottom: 0 }}>
            Trial active until <strong>{formatTrialDate(status.trialEndsAt)}</strong>. You
            have <strong>{daysLeft}</strong> day{daysLeft === 1 ? "" : "s"} left.
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
