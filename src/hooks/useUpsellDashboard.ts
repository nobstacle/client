import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Dayjs } from "dayjs";

export const UPSELL_DASHBOARD_QUERY_KEY = "upsell-dashboard";

const UPSELL_STALE_TIME_MS = 5 * 60 * 1000;

export type UpsellDashboardFilters = {
  dateRange?: [Dayjs, Dayjs] | null;
  selectedPackage?: number[];
  selectedStatus?: string;
  companyId?: number;
};

export type UpsellDashboardData = {
  personalPerformance: unknown[];
  topSellingProducts: unknown[];
  topSellers: unknown[];
  topIncentives: unknown[];
  pendingApprovals: unknown[];
  stats: {
    totalTransactions: number;
    totalRevenue: string;
    totalIncentives: string;
    pendingCount: number;
    totalAttempts?: number;
    systemConversionRate?: string;
  };
};

const EMPTY_DASHBOARD: UpsellDashboardData = {
  personalPerformance: [],
  topSellingProducts: [],
  topSellers: [],
  topIncentives: [],
  pendingApprovals: [],
  stats: {
    totalTransactions: 0,
    totalRevenue: "0.00",
    totalIncentives: "0.00",
    pendingCount: 0,
  },
};

function serializeDashboardFilters(filters: UpsellDashboardFilters) {
  return {
    startDate: filters.dateRange?.[0]?.toISOString() ?? null,
    endDate: filters.dateRange?.[1]?.toISOString() ?? null,
    selectedPackage: filters.selectedPackage ?? [],
    selectedStatus: filters.selectedStatus ?? "",
    companyId: filters.companyId ?? null,
  };
}

async function fetchUpsellDashboard(
  filters: UpsellDashboardFilters,
  token: string,
): Promise<UpsellDashboardData> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const queryParams = new URLSearchParams();

  if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
    queryParams.append("startDate", filters.dateRange[0].toISOString());
    queryParams.append("endDate", filters.dateRange[1].toISOString());
  }

  if (filters.selectedPackage?.length) {
    filters.selectedPackage.forEach((id) =>
      queryParams.append("packageId", id.toString()),
    );
  }

  if (filters.selectedStatus) {
    queryParams.append("status", filters.selectedStatus);
  }

  if (filters.companyId) {
    queryParams.append("companyId", filters.companyId.toString());
  }

  const response = await fetch(
    `${baseUrl}/api/v1/uploads/get-dashboard-data?${queryParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch upsell dashboard data");
  }

  const result = await response.json();
  if (result.success && result.data) {
    return result.data as UpsellDashboardData;
  }

  return EMPTY_DASHBOARD;
}

export function useUpsellDashboard(filters: UpsellDashboardFilters) {
  const { data: session } = useSession();
  const token = session?.user?.backendTokens?.at;
  const serialized = serializeDashboardFilters(filters);

  return useQuery({
    queryKey: [UPSELL_DASHBOARD_QUERY_KEY, serialized],
    queryFn: () => fetchUpsellDashboard(filters, token!),
    enabled: !!token,
    staleTime: UPSELL_STALE_TIME_MS,
    gcTime: UPSELL_STALE_TIME_MS * 2,
    placeholderData: (previous) => previous,
  });
}

export { EMPTY_DASHBOARD };
