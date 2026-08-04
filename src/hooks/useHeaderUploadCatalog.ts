import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useDeferredIdle } from "./useDeferredIdle";

export const UPLOAD_CATEGORIES_QUERY_KEY = ["uploads", "categories"] as const;
export const UPLOAD_PACKAGES_QUERY_KEY = ["uploads", "packages"] as const;

const CATALOG_STALE_TIME_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(
  input: RequestInfo,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    FETCH_TIMEOUT_MS,
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchCategories(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetchWithTimeout(
    `${baseUrl}/api/v1/uploads/get-all-categories?fetchAll=true&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch categories");
  }

  const json = await response.json();
  return json.data || json;
}

async function fetchPackages(token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetchWithTimeout(
    `${baseUrl}/api/v1/uploads/get-all-packages?limit=9999`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch packages");
  }

  const packageData = await response.json();
  return (
    packageData.data?.filter((item: { active?: boolean }) => item?.active === true) ??
    []
  );
}

export type HeaderUploadCatalogOptions = {
  /** When true, packages load immediately instead of after idle (e.g. upsell page). */
  eagerPackages?: boolean;
  /** Pass token from header user prop when useSession() is unavailable (extension iframe). */
  token?: string | null;
};

export const useHeaderUploadCatalog = (
  options: HeaderUploadCatalogOptions = {},
) => {
  const { eagerPackages = false, token: tokenOverride } = options;
  const { data: session, status: sessionStatus } = useSession();
  const token = tokenOverride ?? session?.user?.backendTokens?.at ?? null;
  const deferPackages = useDeferredIdle();
  const loadPackages = eagerPackages || deferPackages;

  const categoriesQuery = useQuery({
    queryKey: UPLOAD_CATEGORIES_QUERY_KEY,
    queryFn: () => fetchCategories(token!),
    enabled: !!token,
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_STALE_TIME_MS,
    retry: 1,
  });

  const packagesQuery = useQuery({
    queryKey: UPLOAD_PACKAGES_QUERY_KEY,
    queryFn: () => fetchPackages(token!),
    enabled: !!token && loadPackages,
    staleTime: CATALOG_STALE_TIME_MS,
    gcTime: CATALOG_STALE_TIME_MS,
    retry: 0,
  });

  const categoriesData = categoriesQuery.data ?? [];
  const categoriesFetched = categoriesQuery.isFetched;
  const isCategoriesLoading =
    !!token &&
    (categoriesQuery.isLoading || categoriesQuery.isFetching) &&
    !categoriesFetched;
  const categoriesError = categoriesQuery.isError;
  const allPackages = packagesQuery.data ?? [];

  const fetchCategoriesManual = async () => {
    if (!token) {
      return [];
    }

    if (categoriesData.length > 0) {
      return categoriesData;
    }

    const result = await categoriesQuery.refetch();
    return result.data ?? [];
  };

  return {
    allPackages,
    categoriesData,
    categoriesFetched,
    isCategoriesLoading,
    categoriesError,
    categoriesTokenReady: !!token || sessionStatus !== "loading",
    fetchCategories: fetchCategoriesManual,
  };
};
