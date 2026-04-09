"use client";

import { ClockCircleOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import { formatTrialDate, getTrialStatus, TrialInfo } from "@/utils/trial";

interface TrialBadgeProps {
  trial?: TrialInfo | null;
  compact?: boolean;
}

export function TrialBadge({ trial, compact = false }: TrialBadgeProps) {
  const status = getTrialStatus(trial);

  if (!status.isTrialAccount) {
    return null;
  }

  const active = status.isTrialActive && !status.isTrialExpired;
  const daysLeft = status.trialDaysLeft ?? 0;
  const label = active
    ? compact
      ? `Temporary account • ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
      : `Temporary account • ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
    : "Temporary account expired";
  const helperText = active
    ? `Temporary trial active until ${formatTrialDate(status.trialEndsAt)}`
    : `Temporary trial expired on ${formatTrialDate(status.trialEndsAt)}`;

  return (
    <Tooltip title={helperText}>
      <div
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
          active
            ? "border-amber-300 bg-amber-50 text-amber-900"
            : "border-rose-300 bg-rose-50 text-rose-800"
        }`}
      >
        {active ? <ClockCircleOutlined /> : <InfoCircleOutlined />}
        <span>{label}</span>
      </div>
    </Tooltip>
  );
}
