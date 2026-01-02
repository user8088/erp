export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
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
  if (authRequired) {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        console.log(`[API] Attaching token to ${method} ${path}`);
        headers = {
          ...headers,
          Authorization: `Bearer ${token}`,
        };
      } else {
        console.warn(`[API] No token found for authenticated request: ${method} ${path}`);
      }
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
      const d = data as { message?: string; error?: string; errors?: Record<string, string[]> };
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

import type {
  Account,
  Paginated,
  Transaction,
  JournalEntry,
  Customer,
  Item,
  Category,
  ItemTag,
  CustomerTag,
  ItemStock,
  PurchaseOrder,
  StockMovement,
  Supplier,
  StockAccountMapping,
  AutoDetectResponse,
  SupplierPayment,
  SupplierBalanceResponse,
  Invoice,
  Sale,
  CustomerPayment,
  CustomerAdvance,
  AccountMapping,
  AccountMappingType,
  AccountMappingStatus,
  CustomerPaymentSummary,
  StaffMember,
  StaffSalaryStructure,
  AttendanceEntry,
  StaffSalaryRun,
  StaffAdvance,
  User,
  Vehicle,
  VehicleProfitabilityStats,
  VehicleMaintenance,
  VehicleMaintenanceStatistics,
  VehicleDeliveryOrder,
  RentalCategory,
  RentalItem,
  RentalAgreement,
  RentalPayment,
  RentalReturn,
  ReportFilters,
  TrialBalanceReport,
  ProfitLossReport,
  ProfitLossDiagnostics,
  FinancialSummaryData,
  BalanceSheetReport,
  GeneralLedgerLine,
  ProfitabilityAnalysis,
  TrendAnalysis,
  ReportPeriod,
  FinancialAccountMapping,
} from "./types";
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

  getAccountsTree(company_id: number, includeBalances = false) {
    const query = new URLSearchParams();
    query.set("company_id", String(company_id));
    if (includeBalances) {
      query.set("include_balances", "1");
    }
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

  getAccountTransactions(id: number, params?: { 
    page?: number; 
    per_page?: number; 
    start_date?: string; 
    end_date?: string; 
    sort_direction?: 'asc' | 'desc';
    exclude_opening_balances?: boolean;
    opening_balances_only?: boolean;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    if (params?.sort_direction) query.set("sort_direction", params.sort_direction);
    if (params?.exclude_opening_balances !== undefined) query.set("exclude_opening_balances", String(params.exclude_opening_balances));
    if (params?.opening_balances_only !== undefined) query.set("opening_balances_only", String(params.opening_balances_only));

    const path = `/accounts/${id}/transactions?${query.toString()}`;
    return apiClient.get<Paginated<Transaction>>(path);
  },

  getAccountBalance(id: number) {
    return apiClient.get<{ balance: number }>(`/accounts/${id}/balance`);
  },

  async downloadAccountStatement(accountId: number, params?: { start_date?: string; end_date?: string }): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const query = new URLSearchParams();
    if (params?.start_date) query.set("start_date", params.start_date);
    if (params?.end_date) query.set("end_date", params.end_date);
    
    const queryString = query.toString();
    const path = `/accounts/${accountId}/statement${queryString ? `?${queryString}` : ""}`;
    const headers: HeadersInit = {
      Accept: "application/pdf",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to download account statement" }));
      throw new ApiError(errorData.message || "Failed to download account statement", response.status, errorData);
    }
    
    return await response.blob();
  },

  async downloadChartOfAccountsStatement(
    companyId: number,
    params?: {
      include_balances?: boolean;
      as_of_date?: string;
      root_type?: string;
      include_disabled?: boolean;
    }
  ): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const query = new URLSearchParams();
    query.set("company_id", companyId.toString());
    if (params?.include_balances !== undefined) query.set("include_balances", params.include_balances.toString());
    if (params?.as_of_date) query.set("as_of_date", params.as_of_date);
    if (params?.root_type) query.set("root_type", params.root_type);
    if (params?.include_disabled !== undefined) query.set("include_disabled", params.include_disabled.toString());
    
    const path = `/accounts/statement?${query.toString()}`;
    const headers: HeadersInit = {
      Accept: "application/pdf",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to download chart of accounts statement" }));
      throw new ApiError(errorData.message || "Failed to download chart of accounts statement", response.status, errorData);
    }
    
    return await response.blob();
  },

  async deleteAccount(id: number, reallocateToAccountId?: number | null) {
    const url = `/accounts/${id}`;
    const body = reallocateToAccountId ? { reallocate_to_account_id: reallocateToAccountId } : undefined;
    
    const result = await request<{ message: string }>(url, {
      method: "DELETE",
      body,
    });
    
    // Invalidate accounts cache when deleting an account
    invalidateCachedGet("/accounts");
    return result;
  },
};

export const journalApi = {
  createJournalEntry(payload: JournalEntry) {
    return apiClient.post<{ journal_entry: JournalEntry }>("/journal-entries", payload);
  },
};

// Staff & Payroll APIs
export const staffApi = {
  list(params: {
    q?: string;
    status?: string;
    department?: string;
    designation?: string;
    is_erp_user?: string | number | boolean;
    page?: number;
    per_page?: number;
  }) {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.status) query.set("status", params.status);
    if (params.department) query.set("department", params.department);
    if (params.designation) query.set("designation", params.designation);
    if (params.is_erp_user !== undefined) {
      query.set("is_erp_user", String(params.is_erp_user ? 1 : 0));
    }
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    const path = `/staff?${query.toString()}`;
    return apiClient.get<Paginated<StaffMember>>(path);
  },

  get(id: string | number) {
    const path = `/staff/${id}`;
    return apiClient.get<StaffMember>(path);
  },
  create(payload: Omit<StaffMember, "id" | "erp_user_id" | "is_erp_user"> & { erp_user_id?: string | number | null }) {
    return apiClient.post<{ staff: StaffMember }>("/staff", payload);
  },
  update(id: string | number, payload: Partial<StaffMember>) {
    return apiClient.patch<{ staff: StaffMember }>(`/staff/${id}`, payload);
  },
  deleteStaff(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/staff/${id}`);
  },
  createUser(staffId: number, payload: {
    email: string;
    password: string;
    password_confirmation: string;
    full_name: string;
    role_ids?: number[];
    phone?: string | null;
  }) {
    return apiClient.post<{ user: User }>(`/staff/${staffId}/create-user`, payload);
  },
  linkUser(staffId: number, userId: number) {
    return apiClient.post<{ staff: StaffMember }>(`/staff/${staffId}/link-user`, { user_id: userId });
  },
  unlinkUser(staffId: number) {
    return apiClient.delete<{ message: string }>(`/staff/${staffId}/link-user`);
  },
  paySalary(staffId: string | number, payload: {
    month: string; // YYYY-MM format
    override_basic?: number;
    override_allowances?: Array<{ label: string; amount: number }>;
    override_deductions?: Array<{ label: string; amount: number }>;
    payable_days?: number;
    manual_attendance_deduction?: number;
    advance_adjusted?: number;
    deduct_advances?: boolean;
    paid_on?: string;
    notes?: string;
    payment_metadata?: Record<string, unknown>;
  }) {
    return apiClient.post<{
      data: {
        staff: { id: number; code: string; full_name: string };
        invoice: { id: number; invoice_number: string; invoice_type: string; amount: number; status: string };
        month: string;
        amount: number;
        calculation: {
          basic: number;
          gross: number;
          per_day_rate: number;
          payable_days: number;
          present_days: number;
          paid_leave_days: number;
          unpaid_leave_days: number;
          absent_days: number;
          unpaid_deduction: number;
          net_before_advance: number;
          advance_adjusted: number;
          net_payable: number;
        };
      };
      message: string;
    }>(`/staff/${staffId}/pay-salary`, payload);
  },
  reverseSalary(staffId: string | number, payload: {
    month: string; // YYYY-MM format
    reason?: string;
  }) {
    return apiClient.post<{
      data: {
        staff: { id: number; code: string; full_name: string };
        invoice: { id: number; invoice_number: string; status: string };
        month: string;
        reversed: boolean;
      };
      message: string;
    }>(`/staff/${staffId}/reverse-salary`, payload);
  },
  listAdvances(staffId: string | number, params?: {
    transaction_type?: "given" | "deducted" | "refunded";
    from_date?: string;
    to_date?: string;
    page?: number;
    per_page?: number;
  }): Promise<Paginated<StaffAdvance>> {
    const queryParams = new URLSearchParams();
    if (params?.transaction_type) queryParams.append("transaction_type", params.transaction_type);
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.per_page) queryParams.append("per_page", String(params.per_page));

    const queryString = queryParams.toString();
    const url = `/staff/${staffId}/advances${queryString ? `?${queryString}` : ""}`;
    
    return apiClient.get<Paginated<StaffAdvance>>(url);
  },

  getAdvanceBalance(staffId: string | number): Promise<{ staff_id: number; balance: number }> {
    return apiClient.get<{ staff_id: number; balance: number }>(`/staff/${staffId}/advances/balance`);
  },

  giveAdvance(staffId: string | number, payload: {
    amount: number;
    transaction_date?: string; // YYYY-MM-DD format (default: today)
    notes?: string | null;
  }) {
    return apiClient.post<{
      data: StaffAdvance;
      message: string;
    }>(`/staff/${staffId}/advances`, payload);
  },
};

// Salary Structures API
export const salaryStructuresApi = {
  list(params: {
    pay_frequency?: string;
    name?: string;
    page?: number;
    per_page?: number;
  }) {
    const query = new URLSearchParams();
    if (params.pay_frequency) query.set("pay_frequency", params.pay_frequency);
    if (params.name) query.set("name", params.name);
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    const path = `/staff/salary-structures?${query.toString()}`;
    return apiClient.get<Paginated<StaffSalaryStructure>>(path);
  },

  get(id: number) {
    return apiClient.get<StaffSalaryStructure>(`/staff/salary-structures/${id}`);
  },

  create(payload: {
    name: string;
    basic_amount: number;
    allowances?: Array<{ label: string; amount: number }>;
    deductions?: Array<{ label: string; amount: number }>;
    pay_frequency: "monthly" | "biweekly" | "weekly";
    payable_days: number;
    notes?: string | null;
  }) {
    return apiClient.post<{ salary_structure: StaffSalaryStructure }>("/staff/salary-structures", payload);
  },

  update(id: number, payload: Partial<{
    name: string;
    basic_amount: number;
    allowances?: Array<{ label: string; amount: number }>;
    deductions?: Array<{ label: string; amount: number }>;
    pay_frequency: "monthly" | "biweekly" | "weekly";
    payable_days: number;
    notes?: string | null;
  }>) {
    return apiClient.patch<{ salary_structure: StaffSalaryStructure }>(`/staff/salary-structures/${id}`, payload);
  },

  delete(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/staff/salary-structures/${id}`);
  },
};

export const attendanceApi = {
  list(params: {
    date?: string;
    from?: string;
    to?: string;
    person_type?: "staff" | "user";
    person_ids?: (string | number)[];
    status?: string;
    summary?: boolean;
    page?: number;
    per_page?: number;
  }) {
    const query = new URLSearchParams();
    if (params.date) query.set("date", params.date);
    if (params.from) query.set("from", params.from);
    if (params.to) query.set("to", params.to);
    if (params.person_type) query.set("person_type", params.person_type);
    if (params.person_ids && params.person_ids.length) {
      params.person_ids.forEach((id) => query.append("person_ids[]", String(id)));
    }
    if (params.status) query.set("status", params.status);
    if (params.summary) query.set("summary", "1");
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    const path = `/attendance?${query.toString()}`;
    return apiClient.get<{ data: AttendanceEntry[]; summary?: Record<string, number>; meta: Paginated<unknown>["meta"] }>(path);
  },
  bulkUpsert(payload: { date: string; entries: Array<Omit<AttendanceEntry, "id" | "date" | "name" | "designation"> & { note?: string }> }) {
    return apiClient.post<{ data: AttendanceEntry[] }>("/attendance/bulk", payload);
  },
  update(id: string | number, payload: Partial<Pick<AttendanceEntry, "status" | "note" | "late_time"> & { date?: string }>) {
    return apiClient.patch<{ attendance: AttendanceEntry }>(`/attendance/${id}`, payload);
  },
  markAll(payload: {
    date: string;
    status: AttendanceEntry["status"];
    person_type: AttendanceEntry["person_type"];
    person_ids?: Array<string | number>;
    department?: string;
    designation?: string;
    staff_status?: string;
  }) {
    return apiClient.post<{ data: AttendanceEntry[] }>("/attendance/mark-all", payload);
  },
};

// @deprecated - Use staffApi.paySalary() for new payments. Kept for backward compatibility to read salary history.
export const salaryRunsApi = {
  list(staffId: string | number, params?: { month?: string; status?: string; page?: number; per_page?: number }) {
    const query = new URLSearchParams();
    if (params?.month) query.set("month", params.month);
    if (params?.status) query.set("status", params.status);
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    const path = `/staff/${staffId}/salary-runs${query.toString() ? `?${query.toString()}` : ""}`;
    return apiClient.get<Paginated<StaffSalaryRun>>(path);
  },
  create(staffId: string | number, payload: Partial<StaffSalaryRun> & { month: string; salary_structure_id?: string | number; override_basic?: number; override_allowances?: Array<{ label: string; amount: number }>; override_deductions?: Array<{ label: string; amount: number }>; payable_days?: number }) {
    // API returns salary_run object directly (not nested) per Staff-apis.md
    return apiClient.post<StaffSalaryRun>(
      `/staff/${staffId}/salary-runs`,
      payload
    );
  },
  pay(runId: string | number, payload: { paid_on?: string; notes?: string; payment_metadata?: Record<string, unknown>; advance_adjusted?: number }) {
    return apiClient.patch<{ salary_run: StaffSalaryRun; invoice?: Invoice }>(
      `/staff/salary-runs/${runId}/pay`,
      payload
    );
  },
  get(runId: string | number) {
    return apiClient.get<{ salary_run: StaffSalaryRun }>(`/staff/salary-runs/${runId}`);
  },
};

// Customer API - Real backend integration

export interface GetCustomersParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: "clear" | "has_dues";
  rating_filter?: string;
}

export interface CreateOrUpdateCustomerPayload {
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  rating: number;
  status: "clear" | "has_dues";
  picture_url?: string | null;
}

export const customersApi = {
  async getCustomers(params: GetCustomersParams = {}): Promise<Paginated<Customer>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.rating_filter) queryParams.append("rating_filter", params.rating_filter);

    const response = await apiClient.get<{
      data: Customer[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/customers?${queryParams.toString()}`);

    // Transform backend response to match our Paginated interface
    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getCustomer(id: number): Promise<{ customer: Customer }> {
    return await apiClient.get<{ customer: Customer }>(`/customers/${id}`);
  },

  async createCustomer(payload: CreateOrUpdateCustomerPayload): Promise<{ customer: Customer }> {
    return await apiClient.post<{ customer: Customer; message: string }>(`/customers`, payload);
  },

  async updateCustomer(
    id: number,
    payload: Partial<CreateOrUpdateCustomerPayload>
  ): Promise<{ customer: Customer }> {
    return await apiClient.patch<{ customer: Customer; message: string }>(
      `/customers/${id}`,
      payload
    );
  },

  async deleteCustomer(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/customers/${id}`);
  },

  async deleteCustomers(ids: number[]): Promise<{ message: string; deleted_count: number; failed_ids: number[] }> {
    return await apiClient.post<{
      message: string;
      deleted_count: number;
      failed_ids: number[];
    }>(`/customers/bulk-delete`, { ids });
  },

  // Customer Earnings Statistics
  // GET /api/customers/{id}/earnings-stats
  // Returns total earnings, discounts, and revenue breakdown from sales, rentals, and invoices
  async getCustomerEarningsStats(
    id: number,
    params?: {
      start_date?: string; // YYYY-MM-DD
      end_date?: string; // YYYY-MM-DD
      month?: string; // YYYY-MM format
    }
  ): Promise<{
    customer_id: number;
    customer_name: string;
      statistics: {
        // Walk-in Sales
        walk_in_sales_revenue?: number;
        walk_in_sales_discount?: number;
        walk_in_sales_count?: number;
        
        // Order/Delivery Sales (ONLY PAID INVOICES)
        order_sales_revenue?: number;
        order_sales_discount?: number;
        order_sales_count?: number;
        
        // Rental Agreements
        rental_revenue?: number;
        rental_count?: number;
        
        // Payment Breakdown
        total_paid?: number;
        walk_in_paid?: number;
        order_paid?: number;
        rental_paid?: number;
        
        // Customer Due (Unpaid Invoices)
        customer_due?: number;
        unpaid_invoices_count?: number;
        
        // Aggregated Totals (for backward compatibility)
        total_sales_revenue: number;
        total_sales_discount: number;
        total_rental_revenue: number;
        total_invoice_revenue: number;
        total_invoice_discount: number;
        total_earnings: number;
        total_discounts_given: number;
        net_earnings?: number;
        total_orders: number;
        total_rentals: number;
        total_invoices: number;
        period_start?: string;
        period_end?: string;
      };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.month) queryParams.append('month', params.month);
    
    const queryString = queryParams.toString();
    const url = `/customers/${id}/earnings-stats${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<{
      customer_id: number;
      customer_name: string;
      statistics: {
        // Walk-in Sales
        walk_in_sales_revenue?: number;
        walk_in_sales_discount?: number;
        walk_in_sales_count?: number;
        
        // Order/Delivery Sales (ONLY PAID INVOICES)
        order_sales_revenue?: number;
        order_sales_discount?: number;
        order_sales_count?: number;
        
        // Rental Agreements
        rental_revenue?: number;
        rental_count?: number;
        
        // Payment Breakdown
        total_paid?: number;
        walk_in_paid?: number;
        order_paid?: number;
        rental_paid?: number;
        
        // Customer Due (Unpaid Invoices)
        customer_due?: number;
        unpaid_invoices_count?: number;
        
        // Aggregated Totals (for backward compatibility)
        total_sales_revenue: number;
        total_sales_discount: number;
        total_rental_revenue: number;
        total_invoice_revenue: number;
        total_invoice_discount: number;
        total_earnings: number;
        total_discounts_given: number;
        net_earnings?: number;
        total_orders: number;
        total_rentals: number;
        total_invoices: number;
        period_start?: string;
        period_end?: string;
      };
    }>(url);
  },

  // Customer Delivery Profitability Stats
  // GET /api/customers/{id}/delivery-profitability-stats
  // Returns profitability statistics for customer's delivery orders with maintenance costs from VehicleMaintenance records
  async getDeliveryProfitabilityStats(
    id: number,
    params?: {
      start_date?: string; // YYYY-MM-DD
      end_date?: string; // YYYY-MM-DD
      month?: string; // YYYY-MM format
    }
  ): Promise<{
    customer_id: number;
    customer_name: string;
    statistics: {
      total_delivery_charges: number;
      total_maintenance_costs: number;
      net_profit: number;
      profit_margin_percentage: number;
      total_orders: number;
      period_start?: string;
      period_end?: string;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.month) queryParams.append('month', params.month);
    
    const queryString = queryParams.toString();
    const url = `/customers/${id}/delivery-profitability-stats${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<{
      customer_id: number;
      customer_name: string;
      statistics: {
        total_delivery_charges: number;
        total_maintenance_costs: number;
        net_profit: number;
        profit_margin_percentage: number;
        total_orders: number;
        period_start?: string;
        period_end?: string;
      };
    }>(url);
  },

  // Customer Stock Profit Statistics
  // GET /api/customers/{id}/stock-profit-stats
  // Returns profit analysis for stock items sold to customer, tracking cost prices from purchases
  async getCustomerStockProfit(
    id: number,
    params?: {
      start_date?: string; // YYYY-MM-DD
      end_date?: string; // YYYY-MM-DD
      month?: string; // YYYY-MM format
    }
  ): Promise<{
    customer_id: number;
    customer_name: string;
    total_items_sold: number;
    total_quantity_sold: number;
    total_cost: number;
    total_revenue: number;
    total_profit: number;
    overall_profit_margin: number;
    items: Array<{
      item_id: number;
      item_name: string;
      item_brand?: string;
      item_category?: string;
      total_quantity_sold: number;
      unit: string;
      average_cost_price: number;
      average_selling_price: number;
      total_cost: number;
      total_revenue: number;
      total_profit: number;
      profit_margin_percentage: number;
      transactions_count: number;
      last_sale_date?: string;
    }>;
    transactions: Array<{
      id: number;
      sale_id: number;
      sale_number?: string;
      invoice_id?: number;
      invoice_number?: string;
      item_id: number;
      item_name: string;
      item_brand?: string;
      quantity: number;
      unit: string;
      cost_price: number;
      historical_cost_price: number;
      selling_price: number;
      total_cost: number;
      total_revenue: number;
      profit: number;
      historical_profit: number;
      profit_margin_percentage: number;
      historical_profit_margin_percentage: number;
      sale_date: string;
      purchase_invoice_id?: number;
      purchase_invoice_number?: string;
      supplier_id?: number;
      supplier_name?: string;
    }>;
    period_start?: string;
    period_end?: string;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.month) queryParams.append('month', params.month);
    
    const queryString = queryParams.toString();
    const url = `/customers/${id}/stock-profit-stats${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<{
      customer_id: number;
      customer_name: string;
      total_items_sold: number;
      total_quantity_sold: number;
      total_cost: number;
      total_revenue: number;
      total_profit: number;
      overall_profit_margin: number;
      items: Array<{
        item_id: number;
        item_name: string;
        item_brand?: string;
        item_category?: string;
        total_quantity_sold: number;
        unit: string;
        average_cost_price: number;
        average_selling_price: number;
        total_cost: number;
        total_revenue: number;
        total_profit: number;
        profit_margin_percentage: number;
        transactions_count: number;
        last_sale_date?: string;
      }>;
      transactions: Array<{
        id: number;
        sale_id: number;
        sale_number?: string;
        invoice_id?: number;
        invoice_number?: string;
        item_id: number;
        item_name: string;
        item_brand?: string;
        quantity: number;
        unit: string;
        cost_price: number;
        historical_cost_price: number;
        selling_price: number;
        total_cost: number;
        total_revenue: number;
        profit: number;
        historical_profit: number;
        profit_margin_percentage: number;
        historical_profit_margin_percentage: number;
        sale_date: string;
        purchase_invoice_id?: number;
        purchase_invoice_number?: string;
        supplier_id?: number;
        supplier_name?: string;
      }>;
      period_start?: string;
      period_end?: string;
    }>(url);
  },
};

// Items API - Using real backend endpoints

export interface GetItemsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  brand?: string;
}

export interface CreateOrUpdateItemPayload {
  name: string;
  brand?: string | null;
  category_id?: number | null;
  picture_url?: string | null;
  last_purchase_price?: number | null;
  lowest_purchase_price?: number | null;
  highest_purchase_price?: number | null;
  selling_price?: number | null;
  primary_unit: string;
  secondary_unit?: string | null;
  conversion_rate?: number | null;
}

export const itemsApi = {
  async getItems(params: GetItemsParams = {}): Promise<Paginated<Item>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.category_id) queryParams.append("category_id", String(params.category_id));
    if (params.brand) queryParams.append("brand", params.brand);

    const response = await apiClient.get<{
      data: Item[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/items?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getItem(id: number): Promise<{ item: Item }> {
    return await apiClient.get<{ item: Item }>(`/items/${id}`);
  },

  async createItem(payload: CreateOrUpdateItemPayload): Promise<{ item: Item }> {
    return await apiClient.post<{ item: Item; message: string }>(`/items`, payload);
  },

  async updateItem(
    id: number,
    payload: Partial<CreateOrUpdateItemPayload>
  ): Promise<{ item: Item }> {
    return await apiClient.patch<{ item: Item; message: string }>(
      `/items/${id}`,
      payload
    );
  },

  async deleteItem(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/items/${id}`);
  },

  async deleteItems(ids: number[]): Promise<{ message: string; deleted_count: number; failed_ids: number[] }> {
    return await apiClient.post<{
      message: string;
      deleted_count: number;
      failed_ids: number[];
    }>(`/items/bulk-delete`, { ids });
  },
};

// Categories API - Using real backend endpoints

export interface GetCategoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface CreateOrUpdateCategoryPayload {
  name: string;
  alias?: string | null;
  description?: string | null;
}

export const categoriesApi = {
  async getCategories(params: GetCategoriesParams = {}): Promise<Paginated<Category>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);

    const response = await apiClient.get<{
      data: Category[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/categories?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getCategory(id: number): Promise<{ category: Category }> {
    return await apiClient.get<{ category: Category }>(`/categories/${id}`);
  },

  async createCategory(payload: CreateOrUpdateCategoryPayload): Promise<{ category: Category }> {
    return await apiClient.post<{ category: Category; message: string }>(`/categories`, payload);
  },

  async updateCategory(
    id: number,
    payload: Partial<CreateOrUpdateCategoryPayload>
  ): Promise<{ category: Category }> {
    return await apiClient.patch<{ category: Category; message: string }>(
      `/categories/${id}`,
      payload
    );
  },

  async deleteCategory(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/categories/${id}`);
  },

  async deleteCategories(ids: number[]): Promise<{ message: string; deleted_count: number; failed_ids: number[] }> {
    return await apiClient.post<{
      message: string;
      deleted_count: number;
      failed_ids: number[];
    }>(`/categories/bulk-delete`, { ids });
  },
};

// Stock Management API - Mock Implementation (Backend TBD)
export interface GetStockParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StockAdjustmentPayload {
  item_id: number;
  quantity: number; // +ve to add, -ve to subtract
  notes?: string;
}

export const stockApi = {
  async getStock(params: GetStockParams = {}): Promise<Paginated<ItemStock>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.category_id) queryParams.append("category_id", String(params.category_id));
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const queryString = queryParams.toString();
    const url = `/stock${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<{ stock: ItemStock[]; pagination: { current_page: number; per_page: number; total: number; last_page: number } }>(url);
    return {
      data: response.stock,
      meta: response.pagination,
    };
  },

  async getItemStock(itemId: number): Promise<{ stock: ItemStock }> {
    return await apiClient.get<{ stock: ItemStock }>(`/stock/item/${itemId}`);
  },

  async adjustStock(payload: StockAdjustmentPayload): Promise<{ stock: ItemStock; movement: StockMovement; message: string }> {
    return await apiClient.post<{ stock: ItemStock; movement: StockMovement; message: string }>("/stock/adjust", payload);
  },

  async updateReorderLevel(itemId: number, reorderLevel: number): Promise<{ stock: ItemStock; message: string }> {
    return await apiClient.patch<{ stock: ItemStock; message: string }>(`/stock/item/${itemId}/reorder-level`, {
      reorder_level: reorderLevel,
    });
  },

  async bulkUpdateReorderLevels(updates: Array<{ item_id: number; reorder_level: number }>): Promise<{ 
    updated_count: number; 
    errors: string[]; 
    message: string 
  }> {
    return await apiClient.patch<{ updated_count: number; errors: string[]; message: string }>("/stock/reorder-levels/bulk", {
      updates,
    });
  },

  async suggestReorderLevel(itemId: number, params?: { lead_time_days?: number; safety_stock_percentage?: number }): Promise<{
    item: { id: number; serial_number: string; name: string; primary_unit: string };
    suggested_reorder_level: number;
    calculation: {
      average_daily_sales: number;
      lead_time_days: number;
      safety_stock_percentage: number;
      lead_time_demand: number;
      safety_stock: number;
      total_sold_last_30_days: number;
      sales_records_count: number;
    };
    message: string;
  }> {
    return await apiClient.post<{
      item: { id: number; serial_number: string; name: string; primary_unit: string };
      suggested_reorder_level: number;
      calculation: {
        average_daily_sales: number;
        lead_time_days: number;
        safety_stock_percentage: number;
        lead_time_demand: number;
        safety_stock: number;
        total_sold_last_30_days: number;
        sales_records_count: number;
      };
      message: string;
    }>(`/stock/item/${itemId}/suggest-reorder-level`, params || {});
  },

  async getLowStockAlerts(): Promise<{ low_stock: ItemStock[]; out_of_stock: ItemStock[]; low_stock_count: number; out_of_stock_count: number }> {
    return await apiClient.get<{ low_stock: ItemStock[]; out_of_stock: ItemStock[]; low_stock_count: number; out_of_stock_count: number }>("/stock/alerts");
  },

  // Account Mappings
  async getAccountMappings(): Promise<{ mappings: StockAccountMapping | null; message?: string }> {
    try {
      return await apiClient.get<{ mappings: StockAccountMapping }>("/stock/account-mappings");
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404) {
        const errorData = error.data as { message?: string } | undefined;
        return { mappings: null, message: errorData?.message || "No mappings configured" };
      }
      throw error;
    }
  },

  async saveAccountMappings(payload: { 
    inventory_account_id: number; 
    accounts_payable_account_id: number 
  }): Promise<{ mappings: StockAccountMapping; message: string }> {
    return await apiClient.post<{ mappings: StockAccountMapping; message: string }>("/stock/account-mappings", payload);
  },

  async autoDetectAccounts(): Promise<AutoDetectResponse> {
    try {
      return await apiClient.get<AutoDetectResponse>("/stock/account-mappings/auto-detect");
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404 && error.data) {
        return error.data as AutoDetectResponse;
      }
      throw error;
    }
  },
};

// Purchase Orders API - Mock Implementation (Backend TBD)
export interface GetPurchaseOrdersParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  supplier_id?: number;
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreatePurchaseOrderPayload {
  supplier_name: string;
  order_date: string;
  expected_delivery_date?: string | null;
  tax_percentage: number;
  discount?: number;
  notes?: string | null;
  items: {
    item_id: number;
    quantity_ordered: number;
    unit_price: number;
  }[];
}

export interface ReceivePurchaseOrderPayload {
  items: Array<{
    id: number; // PO item ID
    quantity_received: number;
    final_unit_price: number;
  }>;
  other_costs?: Array<{
    description: string;
    amount: number;
    account_id?: number | null;
  }>;
  supplier_invoice_file?: File | null;
}

export const purchaseOrdersApi = {
  async getPurchaseOrders(params: GetPurchaseOrdersParams = {}): Promise<Paginated<PurchaseOrder>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.supplier_id) queryParams.append("supplier_id", String(params.supplier_id));
    if (params.from_date) queryParams.append("from_date", params.from_date);
    if (params.to_date) queryParams.append("to_date", params.to_date);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const queryString = queryParams.toString();
    const url = `/purchase-orders${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<{ purchase_orders: PurchaseOrder[]; pagination: { current_page: number; per_page: number; total: number; last_page: number } }>(url);
    return {
      data: response.purchase_orders,
      meta: response.pagination,
    };
  },

  async getPurchaseOrder(id: number): Promise<{ purchase_order: PurchaseOrder }> {
    return await apiClient.get<{ purchase_order: PurchaseOrder }>(`/purchase-orders/${id}`);
  },

  async createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<{ purchase_order: PurchaseOrder; message: string }> {
    return await apiClient.post<{ purchase_order: PurchaseOrder; message: string }>("/purchase-orders", payload);
  },

  async updatePurchaseOrder(id: number, payload: Partial<CreatePurchaseOrderPayload>): Promise<{ purchase_order: PurchaseOrder; message: string }> {
    return await apiClient.patch<{ purchase_order: PurchaseOrder; message: string }>(`/purchase-orders/${id}`, payload);
  },

  async receivePurchaseOrder(
    id: number, 
    payload: ReceivePurchaseOrderPayload
  ): Promise<{ 
    purchase_order: PurchaseOrder; 
    stock_movements: StockMovement[]; 
    supplier_invoice?: Invoice;
    message: string;
  }> {
    // If there's a file, use FormData; otherwise use JSON
    if (payload.supplier_invoice_file) {
      const formData = new FormData();
      
      // Add items as JSON string
      formData.append('items', JSON.stringify(payload.items));
      
      // Add other costs if present
      if (payload.other_costs && payload.other_costs.length > 0) {
        formData.append('other_costs', JSON.stringify(payload.other_costs));
      }
      
      // Add the file
      formData.append('supplier_invoice_file', payload.supplier_invoice_file);
      
      return await apiClient.post<{ 
        purchase_order: PurchaseOrder; 
        stock_movements: StockMovement[]; 
        supplier_invoice?: Invoice;
        message: string;
      }>(`/purchase-orders/${id}/receive`, formData);
    } else {
      // No file, send as JSON
      return await apiClient.post<{ 
        purchase_order: PurchaseOrder; 
        stock_movements: StockMovement[]; 
        supplier_invoice?: Invoice;
        message: string;
      }>(`/purchase-orders/${id}/receive`, payload);
    }
  },

  async updateStatus(id: number, status: PurchaseOrder['status']): Promise<{ purchase_order: PurchaseOrder; message: string }> {
    return await apiClient.patch<{ purchase_order: PurchaseOrder; message: string }>(`/purchase-orders/${id}/status`, { status });
  },

  async deletePurchaseOrder(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/purchase-orders/${id}`);
  },

  async downloadSupplierInvoiceAttachment(poId: number): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: HeadersInit = {
      Accept: "application/pdf,image/*",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/purchase-orders/${poId}/supplier-invoice-attachment`, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to download attachment" }));
      throw new ApiError(errorData.message || "Failed to download attachment", response.status, errorData);
    }

    return await response.blob();
  },
};

// Stock Movements API - Real Backend Integration
export interface GetStockMovementsParams {
  page?: number;
  per_page?: number;
  item_id?: number;
  movement_type?: 'purchase' | 'sale' | 'adjustment' | 'return';
  from_date?: string;
  to_date?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export const stockMovementsApi = {
  async getStockMovements(params: GetStockMovementsParams = {}): Promise<Paginated<StockMovement>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.item_id) queryParams.append("item_id", String(params.item_id));
    if (params.movement_type) queryParams.append("movement_type", params.movement_type);
    if (params.from_date) queryParams.append("from_date", params.from_date);
    if (params.to_date) queryParams.append("to_date", params.to_date);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const queryString = queryParams.toString();
    const url = `/stock/movements${queryString ? `?${queryString}` : ""}`;

    const response = await apiClient.get<{ movements: StockMovement[]; pagination: { current_page: number; per_page: number; total: number; last_page: number } }>(url);
    return {
      data: response.movements,
      meta: response.pagination,
    };
  },
};

// Suppliers API - Using real backend endpoints
export interface GetSuppliersParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: 'active' | 'inactive';
  rating_filter?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateOrUpdateSupplierPayload {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  picture_url?: string | null;
  rating: number;
  status: 'active' | 'inactive';
  customer_id?: number | null;
  items_supplied?: string | null;
  notes?: string | null;
}

export const suppliersApi = {
  async getSuppliers(params: GetSuppliersParams = {}): Promise<Paginated<Supplier>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.rating_filter) queryParams.append("rating_filter", params.rating_filter);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await apiClient.get<{
      data: Supplier[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/suppliers?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getSupplier(id: number): Promise<{ supplier: Supplier }> {
    return await apiClient.get<{ supplier: Supplier }>(`/suppliers/${id}`);
  },

  async createSupplier(payload: CreateOrUpdateSupplierPayload): Promise<{ supplier: Supplier }> {
    return await apiClient.post<{ supplier: Supplier; message: string }>(`/suppliers`, payload);
  },

  async updateSupplier(
    id: number,
    payload: Partial<CreateOrUpdateSupplierPayload>
  ): Promise<{ supplier: Supplier }> {
    return await apiClient.patch<{ supplier: Supplier; message: string }>(
      `/suppliers/${id}`,
      payload
    );
  },

  async deleteSupplier(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/suppliers/${id}`);
  },

  async deleteSuppliers(ids: number[]): Promise<{ message: string; deleted_count: number; failed_ids: number[] }> {
    return await apiClient.post<{
      message: string;
      deleted_count: number;
      failed_ids: number[];
    }>(`/suppliers/bulk-delete`, { ids });
  },

  // Supplier Payments
  async getPayments(supplierId: number, params?: { 
    page?: number; 
    per_page?: number; 
    from_date?: string; 
    to_date?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<{
    payments: SupplierPayment[];
    pagination: { current_page: number; per_page: number; total: number; last_page: number };
    summary: { total_paid: number; total_received: number; outstanding_balance: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.per_page) queryParams.append("per_page", String(params.per_page));
    if (params?.from_date) queryParams.append("from_date", params.from_date);
    if (params?.to_date) queryParams.append("to_date", params.to_date);
    if (params?.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params?.sort_order) queryParams.append("sort_order", params.sort_order);

    const queryString = queryParams.toString();
    return await apiClient.get<{
      payments: SupplierPayment[];
      pagination: { current_page: number; per_page: number; total: number; last_page: number };
      summary: { total_paid: number; total_received: number; outstanding_balance: number };
    }>(`/suppliers/${supplierId}/payments${queryString ? `?${queryString}` : ""}`);
  },

  async createPayment(supplierId: number, data: {
    amount: number;
    payment_date: string;
    payment_account_id: number;
    invoice_number?: string;
    notes?: string;
    skip_invoice: boolean;
  }): Promise<{
    payment: SupplierPayment;
    journal_entry: JournalEntry;
    outstanding_balance: number;
    message: string;
  }> {
    return await apiClient.post<{
      payment: SupplierPayment;
      journal_entry: JournalEntry;
      outstanding_balance: number;
      message: string;
    }>(`/suppliers/${supplierId}/payments`, data);
  },

  async getBalance(supplierId: number): Promise<SupplierBalanceResponse> {
    return await apiClient.get<SupplierBalanceResponse>(`/suppliers/${supplierId}/balance`);
  },

  async autoDetectPaymentAccount(): Promise<{
    detected_account: Account | null;
    confidence: 'high' | 'medium' | 'low' | 'none';
    method: string;
    reason: string;
    message: string;
    suggestions?: string[];
  }> {
    try {
      return await apiClient.get<{
        detected_account: Account | null;
        confidence: 'high' | 'medium' | 'low' | 'none';
        method: string;
        reason: string;
        message: string;
        suggestions?: string[];
      }>('/suppliers/payment-account/auto-detect');
    } catch (error: unknown) {
      if (error instanceof ApiError && error.status === 404 && error.data) {
        return error.data as {
          detected_account: Account | null;
          confidence: 'high' | 'medium' | 'low' | 'none';
          method: string;
          reason: string;
          message: string;
          suggestions?: string[];
        };
      }
      throw error;
    }
  },
};

// Item Tags API - Real Backend Integration
export interface GetItemTagsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface CreateOrUpdateItemTagPayload {
  name: string;
  color: string; // Hex color code like #3b82f6
}

export const itemTagsApi = {
  async getTags(params: GetItemTagsParams = {}): Promise<Paginated<ItemTag>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);

    const response = await apiClient.get<{
      data: ItemTag[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/item-tags?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getTag(id: number): Promise<{ tag: ItemTag }> {
    return await apiClient.get<{ tag: ItemTag }>(`/item-tags/${id}`);
  },

  async createTag(payload: CreateOrUpdateItemTagPayload): Promise<{ tag: ItemTag; message: string }> {
    return await apiClient.post<{ tag: ItemTag; message: string }>(`/item-tags`, payload);
  },

  async updateTag(
    id: number,
    payload: Partial<CreateOrUpdateItemTagPayload>
  ): Promise<{ tag: ItemTag; message: string }> {
    return await apiClient.patch<{ tag: ItemTag; message: string }>(
      `/item-tags/${id}`,
      payload
    );
  },

  async deleteTag(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/item-tags/${id}`);
  },

  async assignTagToItem(tagId: number, itemId: number): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>(
      `/item-tags/${tagId}/assign`,
      { item_id: itemId }
    );
  },

  async removeTagFromItem(tagId: number, itemId: number): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>(
      `/item-tags/${tagId}/remove`,
      { item_id: itemId }
    );
  },

  async getItemTags(itemId: number): Promise<{ data: ItemTag[] }> {
    return await apiClient.get<{ data: ItemTag[] }>(`/items/${itemId}/tags`);
  },

  async syncItemTags(itemId: number, tagIds: number[]): Promise<{ message: string; data: ItemTag[] }> {
    return await apiClient.post<{ message: string; data: ItemTag[] }>(
      `/items/${itemId}/tags/sync`,
      { tag_ids: tagIds }
    );
  },
};

// Customer Tags API - Real Backend Integration
export interface GetCustomerTagsParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface CreateOrUpdateCustomerTagPayload {
  name: string;
  color: string; // Hex color code like #3b82f6
}

export const customerTagsApi = {
  async getTags(params: GetCustomerTagsParams = {}): Promise<Paginated<CustomerTag>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);

    const response = await apiClient.get<{
      data: CustomerTag[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/customer-tags?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getTag(id: number): Promise<{ tag: CustomerTag }> {
    return await apiClient.get<{ tag: CustomerTag }>(`/customer-tags/${id}`);
  },

  async createTag(payload: CreateOrUpdateCustomerTagPayload): Promise<{ tag: CustomerTag; message: string }> {
    return await apiClient.post<{ tag: CustomerTag; message: string }>(`/customer-tags`, payload);
  },

  async updateTag(
    id: number,
    payload: Partial<CreateOrUpdateCustomerTagPayload>
  ): Promise<{ tag: CustomerTag; message: string }> {
    return await apiClient.patch<{ tag: CustomerTag; message: string }>(
      `/customer-tags/${id}`,
      payload
    );
  },

  async deleteTag(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/customer-tags/${id}`);
  },

  async assignTagToCustomer(tagId: number, customerId: number): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>(
      `/customer-tags/${tagId}/assign`,
      { customer_id: customerId }
    );
  },

  async removeTagFromCustomer(tagId: number, customerId: number): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>(
      `/customer-tags/${tagId}/remove`,
      { customer_id: customerId }
    );
  },

  async getCustomerTags(customerId: number): Promise<{ data: CustomerTag[] }> {
    return await apiClient.get<{ data: CustomerTag[] }>(`/customers/${customerId}/tags`);
  },

  async syncCustomerTags(customerId: number, tagIds: number[]): Promise<{ message: string; data: CustomerTag[] }> {
    return await apiClient.post<{ message: string; data: CustomerTag[] }>(
      `/customers/${customerId}/tags/sync`,
      { tag_ids: tagIds }
    );
  },
};

// Invoices API
export interface GetInvoicesParams {
  invoice_type?: 'supplier' | 'sale' | 'payment' | 'purchase' | 'expense' | 'staff';
  status?: 'draft' | 'issued' | 'paid' | 'cancelled';
  start_date?: string;
  end_date?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  page?: number;
  per_page?: number;
}

export const invoicesApi = {
  async getInvoices(params: GetInvoicesParams = {}): Promise<{
    invoices: Invoice[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params.invoice_type) queryParams.append("invoice_type", params.invoice_type);
    if (params.status) queryParams.append("status", params.status);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);
    if (params.search) queryParams.append("search", params.search);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_direction) queryParams.append("sort_direction", params.sort_direction);
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));

    const queryString = queryParams.toString();
    const url = `/invoices${queryString ? `?${queryString}` : ""}`;
    
    return await apiClient.get<{
      invoices: Invoice[];
      pagination: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
      };
    }>(url);
  },

  async getInvoice(id: number): Promise<{ invoice: Invoice }> {
    return await apiClient.get<{ invoice: Invoice }>(`/invoices/${id}`);
  },

  async downloadInvoice(id: number): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const headers: HeadersInit = {
      Accept: "application/pdf",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/invoices/${id}/download`, {
      method: "GET",
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Failed to download invoice" }));
      throw new ApiError(errorData.message || "Failed to download invoice", response.status, errorData);
    }

    return await response.blob();
  },

  getInvoiceViewUrl(id: number): string {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return `${API_BASE_URL}/invoices/${id}/view${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  },

  async updateInvoiceStatus(id: number, status: 'draft' | 'issued' | 'paid' | 'cancelled'): Promise<{
    invoice: Invoice;
    message: string;
  }> {
    return await apiClient.patch<{ invoice: Invoice; message: string }>(
      `/invoices/${id}/status`,
      { status }
    );
  },
};

// Sales API
export interface GetSalesParams {
  page?: number;
  per_page?: number;
  customer_id?: number;
  sale_type?: 'walk-in' | 'delivery';
  status?: 'draft' | 'completed' | 'cancelled';
  payment_status?: 'paid' | 'unpaid' | 'partial';
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format
  search?: string;
}

export interface CreateSalePayload {
  sale_type: 'walk-in' | 'delivery';
  customer_id: number;
  is_guest?: boolean; // New field for guest sales
  vehicle_id?: number | null;
  delivery_address?: string | null;
  expected_delivery_date?: string | null;
  // Optional maintenance cost for this delivery run (e.g., fuel cost).
  // Backend defaults to 0 when omitted.
  maintenance_cost?: number;
  items: Array<{
    item_id: number;
    quantity: number;
    unit_price: number;
    discount_percentage?: number;
    delivery_charge?: number;
  }>;
  overall_discount?: number; // Overall discount applied to the entire sale (in addition to item-level discounts)
  notes?: string | null;
}

export interface ProcessSalePayload {
  payment_method?: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  payment_account_id?: number;
  amount_paid?: number;
  use_advance?: boolean;
  is_guest?: boolean; // New field for guest sales validation
  notes?: string | null;
}

export const salesApi = {
  async getSales(params: GetSalesParams = {}): Promise<Paginated<Sale>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.customer_id) queryParams.append("customer_id", String(params.customer_id));
    if (params.sale_type) queryParams.append("sale_type", params.sale_type);
    if (params.status) queryParams.append("status", params.status);
    if (params.payment_status) queryParams.append("payment_status", params.payment_status);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);
    if (params.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    const url = `/sales${queryString ? `?${queryString}` : ""}`;
    
    return await apiClient.get<Paginated<Sale>>(url);
  },

  async getSale(id: number): Promise<{ sale: Sale }> {
    return await apiClient.get<{ sale: Sale }>(`/sales/${id}`);
  },

  async createSale(payload: CreateSalePayload): Promise<{ sale: Sale }> {
    return await apiClient.post<{ sale: Sale }>("/sales", payload);
  },

  async processSale(id: number, payload?: ProcessSalePayload): Promise<{
    sale: Sale;
    invoice: Invoice;
    payment?: CustomerPayment;
    journal_entries: unknown[];
    stock_movements: unknown[];
  }> {
    return await apiClient.post<{
      sale: Sale;
      invoice: Invoice;
      payment?: CustomerPayment;
      journal_entries: unknown[];
      stock_movements: unknown[];
    }>(`/sales/${id}/process`, payload || {});
  },

  async cancelSale(id: number): Promise<{ sale: Sale }> {
    return await apiClient.post<{ sale: Sale }>(`/sales/${id}/cancel`);
  },

  async markAsDelivered(id: number): Promise<{
    sale: Sale;
    invoice: Invoice;
    message: string;
  }> {
    return await apiClient.post<{
      sale: Sale;
      invoice: Invoice;
      message: string;
    }>(`/sales/${id}/mark-delivered`);
  },

  // Sales Trends
  // GET /api/sales/trends
  // Returns sales revenue aggregated by period (daily, weekly, monthly, quarterly, yearly)
  async getSalesTrends(filters: {
    company_id: number;
    period_type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
    start_date: string;
    end_date: string;
    sale_type?: "walk-in" | "delivery";
    customer_id?: number;
  }): Promise<{
    data: Array<{
      period: string;
      value: number;
      count?: number;
    }>;
    summary: {
      total_revenue: number;
      total_sales: number;
      average_sale_value: number;
    };
    generated_at: string;
  }> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("period_type", filters.period_type);
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    if (filters.sale_type) {
      queryParams.append("sale_type", filters.sale_type);
    }
    if (filters.customer_id) {
      queryParams.append("customer_id", String(filters.customer_id));
    }

    return await apiClient.get<{
      data: Array<{
        period: string;
        value: number;
        count?: number;
      }>;
      summary: {
        total_revenue: number;
        total_sales: number;
        average_sale_value: number;
      };
      generated_at: string;
    }>(`/sales/trends?${queryParams.toString()}`);
  },

  async deleteSale(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/sales/${id}`);
  },
};

// Customer Payments API
export interface GetCustomerPaymentsParams {
  page?: number;
  per_page?: number;
  customer_id?: number;
  payment_type?: 'invoice_payment' | 'advance_payment' | 'refund';
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface CreateCustomerPaymentPayload {
  customer_id: number;
  payment_type: 'invoice_payment' | 'advance_payment' | 'refund';
  invoice_id?: number;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  payment_account_id: number;
  payment_date: string;
  reference_number?: string | null;
  notes?: string | null;
}

export const customerPaymentsApi = {
  async getCustomerPayments(params: GetCustomerPaymentsParams = {}): Promise<Paginated<CustomerPayment>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.customer_id) queryParams.append("customer_id", String(params.customer_id));
    if (params.payment_type) queryParams.append("payment_type", params.payment_type);
    if (params.start_date) queryParams.append("start_date", params.start_date);
    if (params.end_date) queryParams.append("end_date", params.end_date);
    if (params.search) queryParams.append("search", params.search);

    const queryString = queryParams.toString();
    const url = `/customer-payments${queryString ? `?${queryString}` : ""}`;
    
    return await apiClient.get<Paginated<CustomerPayment>>(url);
  },

  async getCustomerPayment(id: number): Promise<{ payment: CustomerPayment }> {
    return await apiClient.get<{ payment: CustomerPayment }>(`/customer-payments/${id}`);
  },

  async createCustomerPayment(payload: CreateCustomerPaymentPayload): Promise<{
    payment: CustomerPayment;
    journal_entries: unknown[];
    advance_transaction?: CustomerAdvance | null;
  }> {
    return await apiClient.post<{
      payment: CustomerPayment;
      journal_entries: unknown[];
      advance_transaction?: CustomerAdvance | null;
    }>("/customer-payments", payload);
  },
};

// Account Mappings API
export interface GetAccountMappingsParams {
  mapping_type?: string;
  company_id?: number;
}

export interface CreateAccountMappingPayload {
  mapping_type: AccountMappingType;
  account_id: number;
  company_id?: number | null;
}

export const accountMappingsApi = {
  async getAccountMappings(params: GetAccountMappingsParams = {}): Promise<{
    data: AccountMapping[];
  }> {
    const queryParams = new URLSearchParams();
    if (params.mapping_type) queryParams.append("mapping_type", params.mapping_type);
    if (params.company_id) queryParams.append("company_id", String(params.company_id));

    const queryString = queryParams.toString();
    const url = `/account-mappings${queryString ? `?${queryString}` : ""}`;
    
    return await apiClient.get<{ data: AccountMapping[] }>(url);
  },

  async getAccountMappingStatus(company_id?: number): Promise<{
    data: AccountMappingStatus[];
  }> {
    const queryParams = new URLSearchParams();
    if (company_id) queryParams.append("company_id", String(company_id));

    const queryString = queryParams.toString();
    const url = `/account-mappings/status${queryString ? `?${queryString}` : ""}`;
    
    return await apiClient.get<{ data: AccountMappingStatus[] }>(url);
  },

  async createAccountMapping(payload: CreateAccountMappingPayload): Promise<{
    account_mapping: AccountMapping;
  }> {
    return await apiClient.post<{ account_mapping: AccountMapping }>("/account-mappings", payload);
  },

  async deleteAccountMapping(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/account-mappings/${id}`);
  },
};

// Customer Payment Summary API (extends customersApi)
export const customerPaymentSummaryApi = {
  async getCustomerPaymentSummary(customerId: number): Promise<{
    payment_summary: CustomerPaymentSummary;
  }> {
    return await apiClient.get<{ payment_summary: CustomerPaymentSummary }>(
      `/customers/${customerId}/payment-summary`
    );
  },
};

// Vehicle Management API
export interface GetVehiclesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: "active" | "inactive";
  sort_by?: string;
  sort_order?: "asc" | "desc";
  include_stats?: boolean;
}

export interface CreateOrUpdateVehiclePayload {
  name: string;
  registration_number: string;
  type?: string | null;
  notes?: string | null;
  status?: "active" | "inactive";
  maintenance_cost?: number; // Maintenance cost per delivery run (e.g., fuel cost)
}

export interface CreateOrUpdateMaintenancePayload {
  type: string;
  description?: string | null;
  amount: number;
  maintenance_date: string; // YYYY-MM-DD
  notes?: string | null;
}

export interface GetVehicleMaintenanceParams {
  page?: number;
  per_page?: number;
  type?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  from_date?: string;
  to_date?: string;
}

export interface GetVehicleOrdersParams {
  page?: number;
  per_page?: number;
  status?: "draft" | "completed" | "cancelled";
}

export const vehiclesApi = {
  async getVehicles(params: GetVehiclesParams = {}): Promise<Paginated<Vehicle>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);
    if (params.include_stats !== undefined) queryParams.append("include_stats", String(params.include_stats));

    const response = await apiClient.get<{
      data: Vehicle[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/vehicles?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getVehicle(id: number, include_stats?: boolean): Promise<{ vehicle: Vehicle }> {
    const queryParams = new URLSearchParams();
    if (include_stats !== undefined) queryParams.append("include_stats", String(include_stats));
    const queryString = queryParams.toString();
    return await apiClient.get<{ vehicle: Vehicle }>(`/vehicles/${id}${queryString ? `?${queryString}` : ""}`);
  },

  async createVehicle(payload: CreateOrUpdateVehiclePayload): Promise<{ vehicle: Vehicle; message: string }> {
    return await apiClient.post<{ vehicle: Vehicle; message: string }>("/vehicles", payload);
  },

  async updateVehicle(id: number, payload: Partial<CreateOrUpdateVehiclePayload>): Promise<{ vehicle: Vehicle; message: string }> {
    return await apiClient.put<{ vehicle: Vehicle; message: string }>(`/vehicles/${id}`, payload);
  },

  async deleteVehicle(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/vehicles/${id}`);
  },

  async getVehicleProfitabilityStats(
    id: number,
    params?: {
      start_date?: string; // YYYY-MM-DD
      end_date?: string; // YYYY-MM-DD
      month?: string; // YYYY-MM format
    }
  ): Promise<{
    vehicle_id: number;
    vehicle_name: string;
    registration_number: string;
    statistics: VehicleProfitabilityStats;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.month) queryParams.append('month', params.month);
    
    const queryString = queryParams.toString();
    const url = `/vehicles/${id}/profitability-stats${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<{
      vehicle_id: number;
      vehicle_name: string;
      registration_number: string;
      statistics: VehicleProfitabilityStats;
    }>(url);
  },

  async getVehicleOrders(id: number, params: GetVehicleOrdersParams = {}): Promise<Paginated<VehicleDeliveryOrder>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.status) queryParams.append("status", params.status);

    const response = await apiClient.get<{
      data: VehicleDeliveryOrder[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/vehicles/${id}/orders?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getVehicleMaintenance(vehicleId: number, params: GetVehicleMaintenanceParams = {}): Promise<Paginated<VehicleMaintenance>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.type) queryParams.append("type", params.type);
    if (params.from_date) queryParams.append("from_date", params.from_date);
    if (params.to_date) queryParams.append("to_date", params.to_date);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await apiClient.get<{
      data: VehicleMaintenance[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/vehicles/${vehicleId}/maintenance?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getMaintenanceRecord(vehicleId: number, id: number): Promise<{ maintenance: VehicleMaintenance }> {
    return await apiClient.get<{ maintenance: VehicleMaintenance }>(`/vehicles/${vehicleId}/maintenance/${id}`);
  },

  async createMaintenanceRecord(vehicleId: number, payload: CreateOrUpdateMaintenancePayload): Promise<{ maintenance: VehicleMaintenance; message: string }> {
    return await apiClient.post<{ maintenance: VehicleMaintenance; message: string }>(`/vehicles/${vehicleId}/maintenance`, payload);
  },

  async updateMaintenanceRecord(vehicleId: number, id: number, payload: Partial<CreateOrUpdateMaintenancePayload>): Promise<{ maintenance: VehicleMaintenance; message: string }> {
    return await apiClient.put<{ maintenance: VehicleMaintenance; message: string }>(`/vehicles/${vehicleId}/maintenance/${id}`, payload);
  },

  async deleteMaintenanceRecord(vehicleId: number, id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/vehicles/${vehicleId}/maintenance/${id}`);
  },

  async getMaintenanceStatistics(vehicleId: number): Promise<VehicleMaintenanceStatistics> {
    return await apiClient.get<VehicleMaintenanceStatistics>(`/vehicles/${vehicleId}/maintenance-statistics`);
  },
};

// Rental Management API

export interface GetRentalCategoriesParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: "active" | "inactive";
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateOrUpdateRentalCategoryPayload {
  name: string;
  slug?: string | null;
  serial_alias?: string | null;
  description?: string | null;
  status?: "active" | "inactive";
}

export interface GetRentalItemsParams {
  page?: number;
  per_page?: number;
  search?: string;
  category_id?: number;
  status?: "available" | "rented" | "maintenance";
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateOrUpdateRentalItemPayload {
  rental_category_id: number;
  name: string;
  sku?: string | null;
  quantity_total: number;
  quantity_available?: number | null;
  cost_price?: number | null;
  security_deposit_amount?: number | null;
  status?: "available" | "rented" | "maintenance";
  // Legacy fields (deprecated - kept for backward compatibility during migration)
  rental_price_total?: number;
  rental_period_type?: "daily" | "weekly" | "monthly" | "custom";
  rental_period_length?: number;
  auto_divide_rent?: boolean;
  rent_per_period?: number | null;
}

export interface GetRentalAgreementsParams {
  page?: number;
  per_page?: number;
  search?: string;
  customer_id?: number;
  status?: "active" | "completed" | "returned" | "overdue";
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateRentalAgreementPayload {
  customer_id: number;
  rental_item_id: number;
  quantity_rented: number;
  rental_start_date: string;
  rental_period_type: "daily" | "weekly" | "monthly";
  rent_amount: number;
  security_deposit_amount?: number | null;
  collect_security_deposit?: boolean;
  security_deposit_payment_account_id?: number | null;
}

export interface RecordRentalPaymentPayload {
  amount_paid: number;
  payment_date?: string | null;
  payment_account_id: number;
  payment_method?: "cash" | "bank_transfer" | "cheque" | "card" | "other" | null;
  notes?: string | null;
}

export interface ProcessRentalReturnPayload {
  rental_agreement_id: number;
  return_date: string;
  return_condition: "returned_safely" | "damaged" | "lost";
  damage_charge_amount?: number | null;
  security_deposit_refunded?: number | null;
  damage_description?: string | null;
  refund_account_id?: number | null;
  notes?: string | null;
}

export const rentalApi = {
  // Categories
  async getCategories(params: GetRentalCategoriesParams = {}): Promise<Paginated<RentalCategory>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await apiClient.get<{
      data: RentalCategory[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/rentals/categories?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getCategory(id: number): Promise<{ category: RentalCategory }> {
    return await apiClient.get<{ category: RentalCategory }>(`/rentals/categories/${id}`);
  },

  async createCategory(payload: CreateOrUpdateRentalCategoryPayload): Promise<{ category: RentalCategory; message: string }> {
    return await apiClient.post<{ category: RentalCategory; message: string }>("/rentals/categories", payload);
  },

  async updateCategory(id: number, payload: Partial<CreateOrUpdateRentalCategoryPayload>): Promise<{ category: RentalCategory; message: string }> {
    return await apiClient.patch<{ category: RentalCategory; message: string }>(`/rentals/categories/${id}`, payload);
  },

  async deleteCategory(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/rentals/categories/${id}`);
  },

  async bulkDeleteCategories(ids: number[]): Promise<{ message: string; deleted_count: number; failed_ids: number[] }> {
    return await apiClient.post<{ message: string; deleted_count: number; failed_ids: number[] }>("/rentals/categories/bulk-delete", { ids });
  },

  // Items
  async getItems(params: GetRentalItemsParams = {}): Promise<Paginated<RentalItem>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.category_id) queryParams.append("category_id", String(params.category_id));
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await apiClient.get<{
      data: RentalItem[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/rentals/items?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getItem(id: number): Promise<{ item: RentalItem }> {
    return await apiClient.get<{ item: RentalItem }>(`/rentals/items/${id}`);
  },

  async createItem(payload: CreateOrUpdateRentalItemPayload): Promise<{ item: RentalItem; message: string }> {
    return await apiClient.post<{ item: RentalItem; message: string }>("/rentals/items", payload);
  },

  async updateItem(id: number, payload: Partial<CreateOrUpdateRentalItemPayload>): Promise<{ item: RentalItem; message: string }> {
    return await apiClient.patch<{ item: RentalItem; message: string }>(`/rentals/items/${id}`, payload);
  },

  async deleteItem(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/rentals/items/${id}`);
  },

  // Agreements
  async getAgreements(params: GetRentalAgreementsParams = {}): Promise<Paginated<RentalAgreement>> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", String(params.page));
    if (params.per_page) queryParams.append("per_page", String(params.per_page));
    if (params.search) queryParams.append("search", params.search);
    if (params.customer_id) queryParams.append("customer_id", String(params.customer_id));
    if (params.status) queryParams.append("status", params.status);
    if (params.sort_by) queryParams.append("sort_by", params.sort_by);
    if (params.sort_order) queryParams.append("sort_order", params.sort_order);

    const response = await apiClient.get<{
      data: RentalAgreement[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
        from: number;
        to: number;
      };
    }>(`/rentals/agreements?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  async getAgreement(id: number): Promise<{ agreement: RentalAgreement }> {
    return await apiClient.get<{ agreement: RentalAgreement }>(`/rentals/agreements/${id}`);
  },

  async createAgreement(payload: CreateRentalAgreementPayload): Promise<{ agreement: RentalAgreement; message: string }> {
    return await apiClient.post<{ agreement: RentalAgreement; message: string }>("/rentals/agreements", payload);
  },

  // Payments
  async recordPayment(agreementId: number, payload: RecordRentalPaymentPayload): Promise<{ payment: RentalPayment; message: string }> {
    return await apiClient.post<{ payment: RentalPayment; message: string }>(`/rentals/agreements/${agreementId}/payments`, payload);
  },

  // Returns
  async processReturn(payload: ProcessRentalReturnPayload): Promise<{ return: RentalReturn; agreement: Partial<RentalAgreement>; message: string }> {
    return await apiClient.post<{ return: RentalReturn; agreement: Partial<RentalAgreement>; message: string }>("/rentals/returns", payload);
  },

  // Download Agreement PDF
  async downloadAgreement(id: number): Promise<void> {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) {
      throw new ApiError("Authentication required. Please log in.", 401, {});
    }

    const response = await fetch(`${API_BASE_URL}/rentals/agreements/${id}/download`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/pdf",
      },
      credentials: "include",
    });

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        throw new ApiError("Authentication required. Please log in again.", response.status, {});
      }
      
      // Try to parse error response, but don't fail if it's not JSON
      let errorData: { message?: string } = { message: "Failed to download rental agreement" };
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          errorData = await response.json();
        }
      } catch {
        // If response is not JSON, use default error message
      }
      
      throw new ApiError(errorData.message || "Failed to download rental agreement", response.status, errorData);
    }

    // Check if response is actually PDF
    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("application/pdf")) {
      throw new ApiError("Invalid response format. Expected PDF file.", 500, {});
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    // Extract filename from Content-Disposition header if available, otherwise use agreement number
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = `RENT-${id}.pdf`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// Financial Reports API
// All endpoints require: Bearer token authentication + module.accounting.read permission
// Base URL: /api/financial-reports
export const financialReportsApi = {
  // Trial Balance
  // GET /api/financial-reports/trial-balance
  // Returns all accounts with debit/credit balances for the selected period
  async getTrialBalance(filters: ReportFilters): Promise<TrialBalanceReport> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    if (filters.comparison_type) queryParams.append("comparison_type", filters.comparison_type);
    if (filters.comparison_start_date) queryParams.append("comparison_start_date", filters.comparison_start_date);
    if (filters.comparison_end_date) queryParams.append("comparison_end_date", filters.comparison_end_date);
    if (filters.account_ids && filters.account_ids.length > 0) {
      filters.account_ids.forEach(id => queryParams.append("account_ids[]", String(id)));
    }
    if (filters.root_types && filters.root_types.length > 0) {
      filters.root_types.forEach(type => queryParams.append("root_types[]", type));
    }

    return await apiClient.get<TrialBalanceReport>(`/financial-reports/trial-balance?${queryParams.toString()}`);
  },

  // Profit & Loss Statement (also used for Gross Profit)
  // GET /api/financial-reports/profit-loss
  // Returns comprehensive P&L report with revenue, COGS, operating expenses, and net profit
  // Supports comparison_type: "previous_period", "previous_year", or "none"
  async getProfitLoss(filters: ReportFilters): Promise<ProfitLossReport> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    if (filters.comparison_type && filters.comparison_type !== "none") {
      queryParams.append("comparison_type", filters.comparison_type);
    }
    // Custom comparison dates (for custom comparison type)
    if (filters.comparison_start_date) {
      queryParams.append("comparison_start_date", filters.comparison_start_date);
    }
    if (filters.comparison_end_date) {
      queryParams.append("comparison_end_date", filters.comparison_end_date);
    }
    // Account filtering (optional)
    if (filters.account_ids && filters.account_ids.length > 0) {
      filters.account_ids.forEach(id => queryParams.append("account_ids[]", String(id)));
    }
    if (filters.root_types && filters.root_types.length > 0) {
      filters.root_types.forEach(type => queryParams.append("root_types[]", type));
    }

    return await apiClient.get<ProfitLossReport>(`/financial-reports/profit-loss?${queryParams.toString()}`);
  },

  // Profit & Loss Diagnostics
  // GET /api/financial-reports/profit-loss/diagnostics
  // Returns diagnostic information to help troubleshoot when no data is showing
  async getProfitLossDiagnostics(filters: { company_id: number; start_date: string; end_date: string }): Promise<ProfitLossDiagnostics> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);

    return await apiClient.get<ProfitLossDiagnostics>(`/financial-reports/profit-loss/diagnostics?${queryParams.toString()}`);
  },

  // Financial Summary
  // GET /api/financial-reports/summary
  // Returns key financial metrics: total income, total expenses, accounts receivable, accounts payable
  async getFinancialSummary(filters: {
    company_id: number;
    period?: "current_month" | "current_year" | "all_time";
    start_date?: string;
    end_date?: string;
    include_breakdown?: boolean;
  }): Promise<FinancialSummaryData> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    if (filters.period) {
      queryParams.append("period", filters.period);
    }
    if (filters.start_date) {
      queryParams.append("start_date", filters.start_date);
    }
    if (filters.end_date) {
      queryParams.append("end_date", filters.end_date);
    }
    if (filters.include_breakdown) {
      queryParams.append("include_breakdown", "1");
    }

    return await apiClient.get<FinancialSummaryData>(`/financial-reports/summary?${queryParams.toString()}`);
  },

  // Balance Sheet
  async getBalanceSheet(filters: ReportFilters): Promise<BalanceSheetReport> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    if (filters.comparison_type) queryParams.append("comparison_type", filters.comparison_type);
    if (filters.comparison_start_date) queryParams.append("comparison_start_date", filters.comparison_start_date);
    if (filters.comparison_end_date) queryParams.append("comparison_end_date", filters.comparison_end_date);
    if (filters.account_ids && filters.account_ids.length > 0) {
      filters.account_ids.forEach(id => queryParams.append("account_ids[]", String(id)));
    }

    return await apiClient.get<BalanceSheetReport>(`/financial-reports/balance-sheet?${queryParams.toString()}`);
  },

  // General Ledger
  async getGeneralLedger(filters: ReportFilters & { page?: number; per_page?: number }): Promise<Paginated<GeneralLedgerLine>> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    if (filters.page) queryParams.append("page", String(filters.page));
    if (filters.per_page) queryParams.append("per_page", String(filters.per_page));
    if (filters.account_ids && filters.account_ids.length > 0) {
      filters.account_ids.forEach(id => queryParams.append("account_ids[]", String(id)));
    }
    if (filters.root_types && filters.root_types.length > 0) {
      filters.root_types.forEach(type => queryParams.append("root_types[]", type));
    }

    const response = await apiClient.get<{
      data: GeneralLedgerLine[];
      meta: {
        current_page: number;
        per_page: number;
        total: number;
        last_page: number;
      };
    }>(`/financial-reports/general-ledger?${queryParams.toString()}`);

    return {
      data: response.data,
      meta: {
        current_page: response.meta.current_page,
        per_page: response.meta.per_page,
        total: response.meta.total,
        last_page: response.meta.last_page,
      },
    };
  },

  // Profitability Analysis
  // GET /api/financial-reports/profitability-analysis
  // Returns key financial ratios: Gross Margin, Operating Margin, Net Margin, ROA, ROE
  // Supports comparison_type: "previous_period", "previous_year", or "none"
  async getProfitabilityAnalysis(filters: ReportFilters): Promise<ProfitabilityAnalysis> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    if (filters.comparison_type && filters.comparison_type !== "none") {
      queryParams.append("comparison_type", filters.comparison_type);
    }
    // Note: Backend calculates comparison dates automatically based on comparison_type

    return await apiClient.get<ProfitabilityAnalysis>(`/financial-reports/profitability-analysis?${queryParams.toString()}`);
  },

  // Trend Analysis (for Sales Invoice Trends and Purchase Invoice Trends)
  // GET /api/financial-reports/trends
  // Returns revenue or expense trends over time with period grouping
  // metric: "revenue" (from sales invoices) or "expense" (from purchase invoices)
  // period: "monthly" (default), "quarterly", or "yearly"
  async getTrendAnalysis(filters: ReportFilters & { metric: "revenue" | "expense"; period?: ReportPeriod }): Promise<TrendAnalysis> {
    const queryParams = new URLSearchParams();
    queryParams.append("company_id", String(filters.company_id));
    queryParams.append("start_date", filters.start_date);
    queryParams.append("end_date", filters.end_date);
    queryParams.append("metric", filters.metric);
    // Period defaults to "monthly" on backend if not provided
    if (filters.period) {
      queryParams.append("period", filters.period);
    }

    return await apiClient.get<TrendAnalysis>(`/financial-reports/trends?${queryParams.toString()}`);
  },
};

// Financial Account Mappings API (for COA mapping configuration)
export const financialAccountMappingsApi = {
  async getMappings(companyId: number): Promise<FinancialAccountMapping[]> {
    return await apiClient.get<FinancialAccountMapping[]>(`/financial-account-mappings?company_id=${companyId}`);
  },

  async createMapping(mapping: Omit<FinancialAccountMapping, "id">): Promise<{ mapping: FinancialAccountMapping; message: string }> {
    return await apiClient.post<{ mapping: FinancialAccountMapping; message: string }>("/financial-account-mappings", mapping);
  },

  async updateMapping(id: number, mapping: Partial<FinancialAccountMapping>): Promise<{ mapping: FinancialAccountMapping; message: string }> {
    return await apiClient.put<{ mapping: FinancialAccountMapping; message: string }>(`/financial-account-mappings/${id}`, mapping);
  },

  async deleteMapping(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/financial-account-mappings/${id}`);
  },
};

