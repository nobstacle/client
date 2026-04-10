"use client";

import { getTrialStatus, TrialInfo } from "@/utils/trial";
import { TrialStatusBanner } from "./TrialStatusBanner";

interface TrialWatermarkProps {
  trial?: TrialInfo | null;
}

export function TrialWatermark({ trial }: TrialWatermarkProps) {
  const status = getTrialStatus(trial);

  if (!status.isTrialAccount || !status.isTrialActive) {
    return null;
  }

  return (
    <TrialStatusBanner
      trial={trial}
      className="fixed inset-x-0 top-0 z-50 shadow-sm"
    />
  );
}
