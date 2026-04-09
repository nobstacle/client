export interface TrialInfo {
  trialStartedAt?: string | Date | null;
  trialEndsAt?: string | Date | null;
  isTrialAccount?: boolean | null;
  isTrialActive?: boolean | null;
  isTrialExpired?: boolean | null;
  trialDaysLeft?: number | null;
}

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

function toDate(value?: string | Date | null) {
  if (!value) return null;

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTrialStatus(trial?: TrialInfo | null) {
  const trialStartedAt = toDate(trial?.trialStartedAt);
  const trialEndsAt = toDate(trial?.trialEndsAt);
  const isTrialAccount = Boolean(
    trial?.isTrialAccount ?? trialStartedAt ?? trialEndsAt,
  );

  if (!trialEndsAt) {
    return {
      isTrialAccount,
      isTrialActive: Boolean(trial?.isTrialActive ?? false),
      isTrialExpired: Boolean(trial?.isTrialExpired ?? false),
      trialDaysLeft: trial?.trialDaysLeft ?? null,
      trialStartedAt,
      trialEndsAt,
    };
  }

  const diffMs = trialEndsAt.getTime() - Date.now();
  const computedIsActive = diffMs > 0;
  const computedDaysLeft = computedIsActive
    ? Math.max(1, Math.ceil(diffMs / MS_IN_A_DAY))
    : 0;

  return {
    isTrialAccount,
    isTrialActive: trial?.isTrialActive ?? computedIsActive,
    isTrialExpired: trial?.isTrialExpired ?? !computedIsActive,
    trialDaysLeft: trial?.trialDaysLeft ?? computedDaysLeft,
    trialStartedAt,
    trialEndsAt,
  };
}

export function formatTrialDate(value?: string | Date | null) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
