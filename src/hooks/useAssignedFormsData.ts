import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export type AssignedForm = {
  id: number;
  form_id: string;
  form_name: string;
  assigned_companies: string[];
  createdAt: string;
  updatedAt: string;
};

export const ASSIGNED_FORMS_QUERY_KEY = "assigned-forms";
export const DEFAULT_COMPANY_FORM_QUERY_KEY = "default-company-form";

const FORMS_STALE_TIME_MS = 5 * 60 * 1000;
const FORMS_FETCH_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), FORMS_FETCH_TIMEOUT_MS);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function fetchAssignedForms(companyId: number): Promise<AssignedForm[]> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetchWithTimeout(`${baseUrl}/api/assigned-form/${companyId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch assigned forms");
  }
  return response.json();
}

async function fetchDefaultCompanyForm(token: string): Promise<string | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  const response = await fetchWithTimeout(`${baseUrl}/api/v1/shortcut/default-company-form`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  return result?.data?.formId ?? null;
}

export function useAssignedFormsData() {
  const { data: session } = useSession();
  const companyId = session?.user?.companyId;
  const token = session?.user?.backendTokens?.at;

  const assignedFormsQuery = useQuery({
    queryKey: [ASSIGNED_FORMS_QUERY_KEY, companyId],
    queryFn: () => fetchAssignedForms(companyId!),
    enabled: !!companyId,
    staleTime: FORMS_STALE_TIME_MS,
    gcTime: FORMS_STALE_TIME_MS * 2,
  });

  const defaultFormQuery = useQuery({
    queryKey: [DEFAULT_COMPANY_FORM_QUERY_KEY, companyId],
    queryFn: () => fetchDefaultCompanyForm(token!),
    enabled: !!companyId && !!token,
    staleTime: FORMS_STALE_TIME_MS,
    gcTime: FORMS_STALE_TIME_MS * 2,
  });

  return {
    assignedForms: assignedFormsQuery.data ?? [],
    defaultFormId: defaultFormQuery.data ?? null,
    isLoading: assignedFormsQuery.isLoading || defaultFormQuery.isLoading,
    isError: assignedFormsQuery.isError || defaultFormQuery.isError,
    refetchAssignedForms: assignedFormsQuery.refetch,
  };
}
