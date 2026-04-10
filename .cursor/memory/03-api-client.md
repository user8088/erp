# API Client - Complete Documentation

## Architecture Overview

The API layer is organized into:
1. **Base HTTP Client** (`apiClient.ts`) - Low-level request handling
2. **Domain APIs** - Business-specific API modules
3. **Caching Layer** (`apiCache.ts`) - Response caching with invalidation
4. **Error Handling** - `ApiError` class for consistent error management

## Base HTTP Client

### Configuration
```typescript
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
```

### ApiError Class
```typescript
export class ApiError extends Error {
  status: number;      // HTTP status code
  data: unknown;       // Response body

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}
```

### Request Function
```typescript
async function request<T>(
  path: string,
  {
    method = "GET",
    body,
    headers,
    authRequired = true
  }: RequestOptions = {}
): Promise<T>
```

#### Features
- **Automatic Auth**: Attaches Bearer token from localStorage
- **CSRF Support**: Credentials included for cookie-based auth
- **JSON Handling**: Automatic JSON serialization/deserialization
- **FormData Support**: Handles file uploads
- **Error Extraction**: Parses error messages from response

### HTTP Methods
```typescript
export const apiClient = {
  get: <T>(path, options?) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path, body?, options?) => request<T>(path, { ...options, method: "POST", body }),
  put: <T>(path, body?, options?) => request<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path, body?, options?) => request<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path, options?) => request<T>(path, { ...options, method: "DELETE" }),
};
```

## Caching System

### Cache Implementation (`app/lib/apiCache.ts`)
- In-memory cache using Map
- Automatic cache invalidation helpers
- Scoped to module lifetime

### Cache Functions
```typescript
// Cached GET - returns cached or fetches and caches
export function cachedGet<T>(key: string, fetcher: () => Promise<T>): Promise<T>

// Invalidate specific cache entry
export function invalidateCachedGet(key: string): void

// Invalidate by pattern
export function invalidateCachedByPrefix(prefix: string): void
```

### Usage Pattern
```typescript
const path = `/accounts?${query.toString()}`;
return cachedGet(path, () => apiClient.get<Paginated<Account>>(path));

// After mutation
export function invalidateAccountsCache() {
  invalidateCachedGet("/accounts");
}
```

## Domain APIs

### 1. Accounts API (`accountsApi`)

#### Read Operations
```typescript
getAccounts(params: GetAccountsParams): Promise<Paginated<Account>>
getAccountsTree(company_id: number, includeBalances?: boolean): Promise<Account[]>
getAccount(id: number): Promise<{ account: Account }>
getAccountTransactions(id: number, params?): Promise<Paginated<Transaction>>
getAccountBalance(id: number): Promise<{ balance: number }>
```

#### Write Operations
```typescript
createAccount(payload: CreateOrUpdateAccountPayload): Promise<{ account: Account }>
updateAccount(id: number, payload: Partial<CreateOrUpdateAccountPayload>): Promise<{ account: Account }>
updateAccountState(id: number, is_disabled: boolean): Promise<{ account: Account }>
deleteAccount(id: number, reallocateToAccountId?: number): Promise<{ message: string }>
```

#### Document Operations
```typescript
downloadAccountStatement(accountId: number, params?): Promise<Blob>
downloadChartOfAccountsStatement(companyId: number, params?): Promise<Blob>
```

### 2. Journal API (`journalApi`)
```typescript
createJournalEntry(payload: JournalEntry): Promise<{ journal_entry: JournalEntry }>
```

### 3. Staff API (`staffApi`)

#### CRUD Operations
```typescript
list(params): Promise<Paginated<StaffMember>>
get(id: string | number): Promise<StaffMember>
create(payload): Promise<{ staff: StaffMember }>
update(id, payload): Promise<{ staff: StaffMember }>
deleteStaff(id: number): Promise<{ message: string }>
```

#### User Management
```typescript
createUser(staffId, payload): Promise<{ user: User }>
linkUser(staffId, userId): Promise<{ staff: StaffMember }>
unlinkUser(staffId): Promise<{ message: string }>
```

#### Payroll Operations
```typescript
paySalary(staffId, payload): Promise<SalaryPaymentResult>
reverseSalary(staffId, payload): Promise<SalaryReversalResult>
listAdvances(staffId, params?): Promise<Paginated<StaffAdvance>>
getAdvanceBalance(staffId): Promise<{ staff_id: number; balance: number }>
giveAdvance(staffId, payload): Promise<AdvanceResult>
```

### 4. Attendance API (`attendanceApi`)
```typescript
list(params): Promise<AttendanceListResult>
save(personId, payload): Promise<AttendanceEntry>
bulkSave(entries: AttendanceEntry[]): Promise<{ entries: AttendanceEntry[]; summary: AttendanceSummary }>
delete(personId, date): Promise<{ message: string }>
```

### 5. Customers API (`customersApi`)

#### CRUD
```typescript
getCustomers(params?: GetCustomersParams): Promise<Paginated<Customer>>
getCustomer(id: number): Promise<Customer>
createCustomer(payload): Promise<Customer>
updateCustomer(id, payload): Promise<Customer>
deleteCustomer(id): Promise<void>
```

#### Financial Operations
```typescript
recordPayment(id, payload): Promise<PaymentResult>
getBalance(id): Promise<CustomerBalance>
getInvoices(id, params?): Promise<Paginated<Invoice>>
getDeliveryOrders(id, params?): Promise<Paginated<DeliveryOrder>>
getEarnings(id, params?): Promise<Paginated<Earning>>
getStockProfits(id, params?): Promise<Paginated<StockProfit>>
getDeliveryProfits(id, params?): Promise<Paginated<DeliveryProfit>>
getRentals(id, params?): Promise<Paginated<RentalAgreement>>
```

#### Document Operations
```typescript
exportToExcel(params?): Promise<Blob>
exportToPDF(params?): Promise<Blob>
```

### 6. Items API (`itemsApi`)

#### CRUD
```typescript
getItems(params?): Promise<Paginated<Item>>
getItem(id: number): Promise<Item>
createItem(payload): Promise<Item>
updateItem(id, payload): Promise<Item>
deleteItem(id): Promise<void>
```

#### Stock Operations
```typescript
getStock(itemId: number): Promise<ItemStock>
getBatches(itemId: number): Promise<ItemStockBatch[]>
getActiveBatch(itemId: number): Promise<ItemActiveBatchResponse>
getBatchQueue(itemId: number, options?): Promise<ItemBatchQueueResponse>
getBatchHistory(itemId: number, params?): Promise<ItemBatchHistoryResponse>
getStockValueSummary(): Promise<ItemStockValueSummary>
```

#### Analytics
```typescript
getSalesAnalytics(itemId: number, params?): Promise<SalesAnalyticsResponse>
getStockAnalytics(itemId: number, params?): Promise<StockAnalyticsResponse>
```

#### Tag Management
```typescript
getItemTags(): Promise<ItemTag[]>
createItemTag(payload): Promise<ItemTag>
updateItemTag(id, payload): Promise<ItemTag>
deleteItemTag(id): Promise<void>
syncItemTags(itemId, tagIds): Promise<Item>
```

### 7. Stock/Purchase Orders API (`purchaseOrdersApi`)

#### PO Operations
```typescript
getPurchaseOrders(params?): Promise<Paginated<PurchaseOrder>>
getPurchaseOrder(id: number): Promise<PurchaseOrder>
createPurchaseOrder(payload): Promise<PurchaseOrder>
updatePurchaseOrder(id, payload): Promise<PurchaseOrder>
deletePurchaseOrder(id): Promise<void>
```

#### Item Operations
```typescript
addItemToPO(poId, payload): Promise<PurchaseOrder>
updatePOItem(itemId, payload): Promise<POItem>
removePOItem(itemId): Promise<void>
receiveItem(itemId, payload): Promise<POItem>
```

#### Document Operations
```typescript
exportToPDF(id): Promise<Blob>
exportToExcel(id): Promise<Blob>
```

### 8. Stock Movements API (`stockMovementsApi`)
```typescript
getMovements(params?): Promise<Paginated<StockMovement>>
getMovement(id): Promise<StockMovement>
createMovement(payload): Promise<StockMovement>
```

### 9. Suppliers API (`suppliersApi`)

#### CRUD
```typescript
getSuppliers(params?): Promise<Paginated<Supplier>>
getSupplier(id: number): Promise<Supplier>
createSupplier(payload): Promise<Supplier>
updateSupplier(id, payload): Promise<Supplier>
deleteSupplier(id): Promise<void>
```

#### Financial Operations
```typescript
getBalance(id: number): Promise<SupplierBalanceResponse>
recordPayment(id, payload): Promise<SupplierPayment>
getPayments(id, params?): Promise<Paginated<SupplierPayment>>
getPurchaseOrders(id, params?): Promise<Paginated<PurchaseOrder>>
```

### 10. Rental API (`rentalApi`)

#### Categories
```typescript
getCategories(params?): Promise<Paginated<RentalCategory>>
getCategory(id: number): Promise<RentalCategory>
createCategory(payload): Promise<RentalCategory>
updateCategory(id, payload): Promise<RentalCategory>
deleteCategory(id): Promise<void>
```

#### Items
```typescript
getRentalItems(params?): Promise<Paginated<RentalItem>>
getRentalItem(id: number): Promise<RentalItem>
createRentalItem(payload): Promise<RentalItem>
updateRentalItem(id, payload): Promise<RentalItem>
deleteRentalItem(id): Promise<void>
```

#### Agreements
```typescript
getAgreements(params?): Promise<Paginated<RentalAgreement>>
getAgreement(id: number): Promise<RentalAgreement>
createAgreement(payload): Promise<RentalAgreement>
updateAgreement(id, payload): Promise<RentalAgreement>
```

#### Payments & Returns
```typescript
recordPayment(agreementId, payload): Promise<RentalPayment>
processReturn(agreementId, payload): Promise<RentalReturn>
writeOffBadDebt(agreementId, payload): Promise<Agreement>
```

### 11. Vehicles API (`vehiclesApi`)
```typescript
getVehicles(params?): Promise<Paginated<Vehicle>>
getVehicle(id: number): Promise<Vehicle>
createVehicle(payload): Promise<Vehicle>
updateVehicle(id, payload): Promise<Vehicle>
deleteVehicle(id): Promise<void>
getProfitabilityStats(id, params?): Promise<VehicleProfitabilityStats>
getDeliveryOrders(id, params?): Promise<Paginated<VehicleDeliveryOrder>>
getMaintenanceRecords(id, params?): Promise<Paginated<VehicleMaintenance>>
```

### 12. Categories API (`categoriesApi`)
```typescript
getCategories(params?): Promise<Paginated<Category>>
getCategory(id: number): Promise<Category>
createCategory(payload): Promise<Category>
updateCategory(id, payload): Promise<Category>
deleteCategory(id): Promise<void>
```

### 13. Tags APIs

#### Customer Tags (`customerTagsApi`)
```typescript
getCustomerTags(): Promise<CustomerTag[]>
createCustomerTag(payload): Promise<CustomerTag>
updateCustomerTag(id, payload): Promise<CustomerTag>
deleteCustomerTag(id): Promise<void>
syncCustomerTags(customerId, tagIds): Promise<void>
```

#### Staff Tags (`staffTagsApi`)
```typescript
getStaffTags(): Promise<StaffTag[]>
createStaffTag(payload): Promise<StaffTag>
updateStaffTag(id, payload): Promise<StaffTag>
deleteStaffTag(id): Promise<void>
```

### 14. Reports API (`reportsApi`)
```typescript
getTrialBalance(params: ReportFilters): Promise<TrialBalanceReport>
getProfitLoss(params: ReportFilters): Promise<ProfitLossReport>
getBalanceSheet(params: ReportFilters): Promise<BalanceSheetReport>
getGeneralLedger(params: ReportFilters): Promise<Paginated<GeneralLedgerLine>>
getCashFlow(params: ReportFilters): Promise<CashFlowReport>
getProfitabilityAnalysis(params): Promise<ProfitabilityAnalysis>
getTrendAnalysis(type: TrendType, params): Promise<TrendAnalysis>
```

### 15. Selling API (`sellingApi`)

#### Invoices
```typescript
getSaleInvoices(params?): Promise<Paginated<Invoice>>
getSaleInvoice(id: number): Promise<Invoice>
createSaleInvoice(payload): Promise<Invoice>
updateSaleInvoice(id, payload): Promise<Invoice>
cancelSaleInvoice(id): Promise<void>
```

#### Sales Orders
```typescript
getSalesOrders(params?): Promise<Paginated<Sale>>
getSalesOrder(id: number): Promise<Sale>
createSalesOrder(payload): Promise<Sale>
updateSalesOrder(id, payload): Promise<Sale>
```

#### POS & Trends
```typescript
getPosItems(params?): Promise<Paginated<Item>>
getSalesTrends(params?): Promise<TrendData>
getTopSellingItems(params?): Promise<TopSellingItem[]>
```

### 16. Stock Account Mappings API (`stockAccountMappingsApi`)
```typescript
getMapping(): Promise<StockAccountMapping>
getOrDetectMapping(): Promise<AutoDetectResponse>
updateMapping(payload): Promise<StockAccountMapping>
resetMapping(): Promise<void>
```

### 17. User Management API (`usersApi`)
```typescript
getUsers(params?): Promise<Paginated<User>>
getUser(id: number): Promise<User>
createUser(payload): Promise<User>
updateUser(id, payload): Promise<User>
deleteUser(id): Promise<void>
updatePassword(id, payload): Promise<void>
```

### 18. Roles API (`rolesApi`)
```typescript
getRoles(): Promise<Role[]>
getRole(id: number): Promise<Role>
createRole(payload): Promise<Role>
updateRole(id, payload): Promise<Role>
deleteRole(id): Promise<void>
```

## Request/Response Patterns

### Paginated Responses
All list endpoints return a standard paginated structure:
```typescript
interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}
```

### Common Query Parameters
```typescript
interface CommonListParams {
  page?: number;           // Default: 1
  per_page?: number;       // Default: 20, Max: 100
  search?: string;         // Search term
  sort_by?: string;        // Sort field
  sort_order?: 'asc' | 'desc';
}
```

### Date Filtering
```typescript
interface DateRangeParams {
  start_date?: string;     // YYYY-MM-DD
  end_date?: string;       // YYYY-MM-DD
}
```

## Error Handling Patterns

### API Error Response Format
```json
{
  "message": "Error description",
  "error": "Error code",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### Handling in Components
```typescript
try {
  await api.operation();
} catch (e) {
  if (e instanceof ApiError) {
    // Handle specific error
    if (e.status === 422) {
      // Validation errors
      setErrors(e.data?.errors);
    } else if (e.status === 401) {
      // Auth error
      addToast("Session expired", "error");
    }
  }
}
```

## Cache Invalidation Strategy

### After Mutations
```typescript
// Create operation
export const createAccount = (payload) => {
  return apiClient.post("/accounts", payload).then((result) => {
    invalidateCachedGet("/accounts");  // Invalidate list
    return result;
  });
};

// Update operation
export const updateAccount = (id, payload) => {
  return apiClient.put(`/accounts/${id}`, payload).then((result) => {
    invalidateCachedGet("/accounts");      // Invalidate list
    invalidateCachedGet(`/accounts/${id}`); // Invalidate detail
    return result;
  });
};
```

## File Upload Pattern

### Supplier Invoice Upload
```typescript
uploadSupplierInvoice(poId: number, file: File) {
  const formData = new FormData();
  formData.append("invoice", file);

  return apiClient.post<{ invoice: SupplierInvoice }>(
    `/purchase-orders/${poId}/upload-invoice`,
    formData
  );
}
```

## Document Download Pattern

### PDF/Excel Downloads
```typescript
async downloadAccountStatement(accountId: number, params?): Promise<Blob> {
  const token = localStorage.getItem("access_token");
  const query = new URLSearchParams();
  if (params?.start_date) query.set("start_date", params.start_date);

  const response = await fetch(`${API_BASE_URL}/accounts/${accountId}/statement?${query}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/pdf",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ApiError(errorData.message, response.status, errorData);
  }

  return await response.blob();
}
```

## Authentication Endpoints

### Login
```typescript
POST /auth/login
Body: { login: string, password: string }
Response: { user: User, permissions: PermissionsMap, access_token: string }
```

### Me (Current User)
```typescript
GET /auth/me
Headers: Authorization: Bearer {token}
Response: { user: User, permissions?: PermissionsMap }
```

### Logout
```typescript
POST /auth/logout
Headers: Authorization: Bearer {token}
Response: { message: string }
```

### CSRF Cookie
```typescript
GET /sanctum/csrf-cookie
// Sets XSRF-TOKEN cookie for Laravel Sanctum
```

## Best Practices

1. **Always Use Domain APIs**: Don't call `apiClient` directly in components
2. **Handle Loading States**: All API calls should have loading indicators
3. **Error Boundaries**: Wrap API calls in try/catch with user-friendly messages
4. **Cache Invalidation**: Invalidate cache after mutations
5. **Cancellation**: Implement request cancellation for long-running requests
6. **Pagination**: Always handle pagination in list views
7. **Permissions**: Check permissions before showing action buttons
