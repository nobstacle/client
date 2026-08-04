import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { Dayjs } from "dayjs";

export const UPSELL_TRANSACTIONS_QUERY_KEY = "upsell-transactions";

const UPSELL_STALE_TIME_MS = 5 * 60 * 1000;

export type UpsellTransactionsFilters = {
  search?: string;
  selectedPackage?: number[];
  selectedStatus?: string;
  dateRange?: [Dayjs, Dayjs] | null;
  page: number;
  limit: number;
};

export type UpsellTransactionsResult = {
  transactions: unknown[];
  totalCount: number;
};

function serializeFilters(filters: UpsellTransactionsFilters) {
  return {
    search: filters.search ?? "",
    selectedPackage: filters.selectedPackage ?? [],
    selectedStatus: filters.selectedStatus ?? "",
    startDate: filters.dateRange?.[0]?.toISOString() ?? null,
    endDate: filters.dateRange?.[1]?.toISOString() ?? null,
    page: filters.page,
    limit: filters.limit,
  };
}

async function fetchUpsellTransactions(
  filters: UpsellTransactionsFilters,
  token: string,
): Promise<UpsellTransactionsResult> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const url = new URL(`${baseUrl}/api/v1/uploads/get-al-upsell-transactions`);

  if (filters.search) {
    url.searchParams.append("search", filters.search);
  }

  if (filters.selectedPackage?.length) {
    filters.selectedPackage.forEach((id) =>
      url.searchParams.append("packageId", id.toString()),
    );
  }

  if (filters.selectedStatus) {
    url.searchParams.append("approved", filters.selectedStatus.toUpperCase());
  }

  if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
    url.searchParams.append("startDate", filters.dateRange[0].toISOString());
    url.searchParams.append("endDate", filters.dateRange[1].toISOString());
  }

  url.searchParams.append("page", filters.page.toString());
  url.searchParams.append("limit", filters.limit.toString());

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch upsell transactions");
  }

  const text = await response.text();
  const json = JSON.parse(text);
  const responseData = json.data || json;

  return {
    transactions: responseData,
    totalCount: json.pagination?.totalCount ?? responseData.length ?? 0,
  };
}

export function useUpsellTransactions(filters: UpsellTransactionsFilters) {
  const { data: session } = useSession();
  const token = session?.user?.backendTokens?.at;
  const serialized = serializeFilters(filters);

  return useQuery({
    queryKey: [UPSELL_TRANSACTIONS_QUERY_KEY, serialized],
    queryFn: () => fetchUpsellTransactions(filters, token!),
    enabled: !!token,
    staleTime: UPSELL_STALE_TIME_MS,
    gcTime: UPSELL_STALE_TIME_MS * 2,
    placeholderData: (previous) => previous,
  });
}
