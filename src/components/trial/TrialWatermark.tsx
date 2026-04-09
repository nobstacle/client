"use client";

import { formatTrialDate, getTrialStatus, TrialInfo } from "@/utils/trial";

interface TrialWatermarkProps {
  trial?: TrialInfo | null;
}

export function TrialWatermark({ trial }: TrialWatermarkProps) {
  const status = getTrialStatus(trial);

  if (!status.isTrialAccount || !status.isTrialActive) {
    return null;
  }

  const daysLeft = status.trialDaysLeft ?? 0;

  return (
    <>
      <div className="pointer-events-none fixed right-[-52px] top-8 z-50 rotate-45 rounded-full border border-amber-200 bg-amber-400/90 px-16 py-2 text-[11px] font-bold uppercase tracking-[0.35em] text-slate-950 shadow-lg backdrop-blur-sm md:text-xs">
        Trial Mode
      </div>
    </>
  );
}
