export const JOTFORM_RESPONSES_QUERY_KEY = "jotform-responses";

export const JOTFORM_STALE_TIME_MS = 5 * 60 * 1000;

export type JotformTableParams = {
  formId: string;
  page: number;
  limit: number;
  search: unknown;
  filter: string;
  skipCount?: boolean;
};

export type JotformTableResult = {
  items: unknown[];
  allFieldNames: string[];
  totalPages: number;
  totalItems: number;
};

export function serializeJotformTableParams(params: JotformTableParams) {
  const hasSearch =
    params.search &&
    (typeof params.search === "string"
      ? params.search.trim() !== ""
      : Array.isArray(params.search) && params.search.length > 0);

  let searchKey = "";
  if (hasSearch) {
    if (typeof params.search === "string") {
      searchKey = params.search;
    } else {
      searchKey = JSON.stringify(params.search);
    }
  }

  return {
    formId: params.formId,
    page: params.page,
    limit: params.limit,
    search: searchKey,
    filter: params.filter ?? "all",
    skipCount: params.skipCount ?? false,
  };
}

export function buildJotformResponsesUrl(
  params: JotformTableParams,
  baseUrl: string,
): string {
  const { formId, page, limit, search, filter, skipCount } = params;

  let apiUrl = `${baseUrl}/api/jotform/responses/${formId}?page=${page}&limit=${limit}`;

  const hasSearch =
    search &&
    (typeof search === "string"
      ? search.trim() !== ""
      : Array.isArray(search) && search.length > 0);

  if (hasSearch) {
    let searchArray = search;
    if (typeof search === "string") {
      searchArray = [{ label: "", value: search }];
    } else if (!Array.isArray(search) && typeof search === "object") {
      searchArray = [search];
    }
    const encodedSearch = encodeURIComponent(JSON.stringify(searchArray));
    apiUrl += `&search=${encodedSearch}`;
  }

  if (filter) {
    apiUrl += `&filter=${filter}`;
  }

  if (skipCount) {
    apiUrl += "&skipCount=true";
  }

  return apiUrl;
}
