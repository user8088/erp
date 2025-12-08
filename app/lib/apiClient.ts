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

import type { Account, Paginated, Transaction, JournalEntry, Customer, Item, Category, ItemTag, ItemStock, PurchaseOrder, StockMovement, Supplier, StockAccountMapping, AutoDetectResponse, SupplierPayment, SupplierBalanceResponse } from "./types";
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
    return await apiClient.post<any>(`/stock/item/${itemId}/suggest-reorder-level`, params || {});
  },

  async getLowStockAlerts(): Promise<{ low_stock: ItemStock[]; out_of_stock: ItemStock[]; low_stock_count: number; out_of_stock_count: number }> {
    return await apiClient.get<{ low_stock: ItemStock[]; out_of_stock: ItemStock[]; low_stock_count: number; out_of_stock_count: number }>("/stock/alerts");
  },

  // Account Mappings
  async getAccountMappings(): Promise<{ mappings: StockAccountMapping | null; message?: string }> {
    try {
      return await apiClient.get<{ mappings: StockAccountMapping }>("/stock/account-mappings");
    } catch (error: any) {
      if (error.status === 404) {
        return { mappings: null, message: error.data?.message || "No mappings configured" };
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
    } catch (error: any) {
      if (error.status === 404 && error.data) {
        return error.data;
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
  items: {
    id: number; // PO item ID
    quantity_received: number;
  }[];
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

  async receivePurchaseOrder(id: number, payload: ReceivePurchaseOrderPayload): Promise<{ purchase_order: PurchaseOrder; stock_movements: StockMovement[]; message: string }> {
    return await apiClient.post<{ purchase_order: PurchaseOrder; stock_movements: StockMovement[]; message: string }>(`/purchase-orders/${id}/receive`, payload);
  },

  async updateStatus(id: number, status: PurchaseOrder['status']): Promise<{ purchase_order: PurchaseOrder; message: string }> {
    return await apiClient.patch<{ purchase_order: PurchaseOrder; message: string }>(`/purchase-orders/${id}/status`, { status });
  },

  async deletePurchaseOrder(id: number): Promise<{ message: string }> {
    return await apiClient.delete<{ message: string }>(`/purchase-orders/${id}`);
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
    return await apiClient.get<any>(`/suppliers/${supplierId}/payments${queryString ? `?${queryString}` : ""}`);
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
    return await apiClient.post<any>(`/suppliers/${supplierId}/payments`, data);
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
      return await apiClient.get<any>('/suppliers/payment-account/auto-detect');
    } catch (error: any) {
      if (error.status === 404 && error.data) {
        return error.data;
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

