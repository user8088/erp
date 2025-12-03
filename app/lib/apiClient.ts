export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

const CSRF_COOKIE_URL = API_BASE_URL.replace(/\/api\/?$/, "") + "/sanctum/csrf-cookie";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

let csrfFetched = false;

async function ensureCsrfCookie() {
  if (csrfFetched) return;
  try {
    await fetch(CSRF_COOKIE_URL, {
      method: "GET",
      credentials: "include",
    });
    csrfFetched = true;
  } catch (e) {
    console.error("Failed to fetch Sanctum CSRF cookie", e);
  }
}

function getXsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));
  if (!match) return null;
  const value = match.split("=")[1];
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  authRequired?: boolean;
}

async function request<T>(
  path: string,
  { method = "GET", body, headers, authRequired = true }: RequestOptions = {}
): Promise<T> {
  if (authRequired && method !== "GET") {
    await ensureCsrfCookie();
    const xsrf = getXsrfToken();
    if (xsrf) {
      headers = {
        ...headers,
        "X-XSRF-TOKEN": xsrf,
      };
    }
  }

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const init: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...(headers || {}),
    },
  };

  if (body !== undefined && body !== null) {
    (init as RequestInit).body =
      body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    let message = `API request failed with status ${res.status}`;
    if (data && typeof data === "object") {
      const d = data as { message?: string; error?: string };
      if (d.message || d.error) {
        message = d.message ?? d.error ?? message;
      }
    }
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method"> = {}) =>
    request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method"> = {}) =>
    request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options: Omit<RequestOptions, "method"> = {}) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options: Omit<RequestOptions, "method" | "body"> = {}) =>
    request<T>(path, { ...options, method: "DELETE" }),
};

// Domain-specific helpers

import type { Account, Paginated, Transaction, JournalEntry } from "./types";
import { cachedGet, invalidateCachedGet } from "./apiCache";

export interface GetAccountsParams {
  company_id: number;
  search?: string;
  root_type?: string;
  is_group?: boolean;
  page?: number;
  per_page?: number;
}

export interface CreateOrUpdateAccountPayload {
  company_id: number;
  name: string;
  number?: string | null;
  parent_id?: number | null;
  root_type: string;
  is_group: boolean;
  normal_balance?: "debit" | "credit" | null;
  tax_rate?: number | null;
  is_disabled?: boolean;
  currency?: string | null;
}

export const accountsApi = {
  getAccounts(params: GetAccountsParams) {
    const query = new URLSearchParams();
    query.set("company_id", String(params.company_id));
    if (params.search) query.set("search", params.search);
    if (params.root_type) query.set("root_type", params.root_type);
    if (typeof params.is_group === "boolean") {
      query.set("is_group", params.is_group ? "1" : "0");
    }
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));

    const path = `/accounts?${query.toString()}`;
    return cachedGet(path, () => apiClient.get<Paginated<Account>>(path));
  },

  getAccountsTree(company_id: number) {
    const query = new URLSearchParams();
    query.set("company_id", String(company_id));
    const path = `/accounts/tree?${query.toString()}`;
    return cachedGet(path, () => apiClient.get<Account[]>(path));
  },

  createAccount(payload: CreateOrUpdateAccountPayload) {
    return apiClient.post<{ account: Account }>("/accounts", payload).then((result) => {
      // Invalidate accounts cache when creating a new account
      invalidateCachedGet("/accounts");
      return result;
    });
  },

  getAccount(id: number) {
    const path = `/accounts/${id}`;
    return cachedGet(path, () => apiClient.get<{ account: Account }>(path));
  },

  updateAccount(id: number, payload: Partial<CreateOrUpdateAccountPayload>) {
    return apiClient.put<{ account: Account }>(`/accounts/${id}`, payload).then((result) => {
      // Invalidate accounts cache when updating an account
      invalidateCachedGet("/accounts");
      return result;
    });
  },

  updateAccountState(id: number, is_disabled: boolean) {
    return apiClient.patch<{ account: Account }>(`/accounts/${id}/state`, {
      is_disabled,
    }).then((result) => {
      // Invalidate accounts cache when updating account state
      invalidateCachedGet("/accounts");
      return result;
    });
  },

  getAccountTransactions(id: number, params?: { page?: number; per_page?: number; start_date?: string; end_date?: string; sort_direction?: 'asc' | 'desc' }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.sort_direction) query.set("sort_direction", params.sort_direction);

    const path = `/accounts/${id}/transactions?${query.toString()}`;
    return apiClient.get<Paginated<Transaction>>(path);
  },

  getAccountBalance(id: number) {
    return apiClient.get<{ balance: number }>(`/accounts/${id}/balance`);
  },
};

export const journalApi = {
  createJournalEntry(payload: JournalEntry) {
    return apiClient.post<{ journal_entry: JournalEntry }>("/journal-entries", payload);
  },
};


