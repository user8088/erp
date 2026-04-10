# Type System - Complete Documentation

## Core Types (`app/lib/types.ts`)

### Permission & Access Control

```typescript
type AccessLevel = "no-access" | "read" | "read-write";

type PermissionsMap = Record<string, AccessLevel>;

interface RoleSummary {
  id: string | number;
  name: string;
  description?: string | null;
}

interface PermissionSummary {
  id: string | number;
  code: string;
  label: string;
  access_level: AccessLevel;
}

interface Role extends RoleSummary {
  is_system?: boolean;
  permissions?: PermissionSummary[];
}
```

### User Types

```typescript
interface User {
  id: string | number;
  email: string;
  username?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  full_name: string;
  language?: string;
  time_zone?: string;
  status: "active" | "inactive";
  initials?: string;
  user_type?: string;
  phone?: string | null;
  address?: string | null;
  roles?: RoleSummary[];
  updated_at?: string;
}

interface UserProfile {
  user_id: string | number;
  address?: string | null;
  cnic_front_path?: string | null;
  cnic_back_path?: string | null;
}
```

### Staff Management Types

```typescript
interface StaffMember {
  id: number;
  code?: string | null;
  full_name: string;
  designation: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  status: "active" | "on_leave" | "inactive";
  date_of_joining?: string | null;
  monthly_salary?: number | null;
  next_pay_date?: string | null;
  last_paid_on?: string | null;
  last_paid_month?: string | null;
  is_paid_for_current_month?: boolean;
  advance_balance?: number;
  is_erp_user?: boolean;
  erp_user_id?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  user?: {
    id: number;
    email?: string | null;
    full_name?: string | null;
  };
}

interface StaffSalary {
  id: string | number;
  staff_id: string | number;
  month: string;  // YYYY-MM
  status: "scheduled" | "due" | "paid";
  amount: number;
  due_date: string;
  paid_on?: string | null;
  invoice_number?: string | null;
  advance_adjusted?: number | null;
  notes?: string | null;
}

interface StaffAdvance {
  id: string | number;
  staff_id: string | number;
  salary_run_id: string | number | null;
  invoice_id: string | number | null;
  journal_entry_id: string | number | null;
  amount: number;
  balance: number;
  transaction_type: "given" | "deducted" | "refunded";
  reference: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  staff?: {
    id: string | number;
    code?: string;
    full_name: string;
  };
  invoice?: {
    id: string | number;
    invoice_number: string;
  } | null;
  salary_run?: {
    id: string | number;
    month: string;
  } | null;
  journal_entry?: {
    id: string | number;
    reference_number: string;
  } | null;
}

type PayFrequency = "monthly" | "biweekly" | "weekly";

interface SalaryComponent {
  id?: string | number;
  label: string;
  amount: number;
}

interface StaffSalaryStructure {
  id: string | number;
  name: string;
  basic_amount: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  pay_frequency: PayFrequency;
  payable_days: number;
  notes?: string | null;
}
```

### Attendance Types

```typescript
type AttendanceStatus =
  | "present"
  | "absent"
  | "paid_leave"
  | "unpaid_leave"
  | "late";

interface AttendanceEntry {
  id: string | number;
  person_id: string | number;
  person_type: "staff" | "user";
  name: string;
  designation?: string | null;
  date: string;  // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string | null;
  late_time?: string | null;  // HH:MM format
}

interface StaffSalaryRun {
  id: string | number;
  staff_id: string | number;
  month: string;  // YYYY-MM
  status: "scheduled" | "due" | "paid";
  gross: number;
  per_day_rate: number;
  payable_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  net_before_advance: number;
  advance_adjusted: number;
  net_payable: number;
  invoice_id?: string | number | null;
  invoice_number?: string | null;
  due_date?: string | null;
  paid_on?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

### Common Types

```typescript
interface Tag {
  id: string | number;
  name: string;
  color: string;  // Hex color code
}

interface Attachment {
  id: string | number;
  user_id: string | number;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface TransactionTotals {
  total_debit: number;
  total_credit: number;
  net_change: number;
  page_total_debit?: number;
  page_total_credit?: number;
}

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

### Accounting Types

```typescript
type RootAccountType = "asset" | "liability" | "equity" | "income" | "expense";
type NormalBalance = "debit" | "credit";

interface Account {
  id: number;
  company_id: number;
  name: string;
  number: string | null;
  root_type: RootAccountType;
  is_group: boolean;
  normal_balance: NormalBalance | null;
  tax_rate: number | null;
  is_disabled: boolean;
  currency: string | null;
  parent_id: number | null;
  parent_name: string | null;
  has_children: boolean;
  balance?: number | null;
  children: Account[] | null;
}

type AccountTreeNode = Omit<Account, "children"> & {
  children: AccountTreeNode[];
};

interface StockAccountMapping {
  id: number;
  inventory_account_id: number;
  accounts_payable_account_id: number;
  inventory_account?: Account;
  accounts_payable_account?: Account;
  created_at: string;
  updated_at: string;
}

interface DetectedAccount {
  account: Account | null;
  confidence: number;
  method: string;
  reason: string;
}

interface AutoDetectResponse {
  detected_accounts: {
    inventory_account: Account;
    inventory_detection: {
      confidence: number;
      method: string;
      reason: string;
    };
    accounts_payable_account: Account;
    payable_detection: {
      confidence: number;
      method: string;
      reason: string;
    };
  } | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  message: string;
  suggestions?: string[];
}

interface Transaction {
  id: number;
  date: string;
  voucher_type: string;
  reference_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance?: number;
  related_account_name?: string;
  related_account_number?: string;
  created_at?: string;
  entry_date?: string;
  entry_time?: string;
  entry_datetime?: string;
  is_opening_balance?: boolean;
  created_by?: number;
  creator?: {
    id: number;
    full_name: string;
    email?: string;
  };
}

interface JournalEntryLine {
  id?: number;
  journal_entry_id?: number;
  account_id: number;
  account?: Account | null;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  description?: string | null;
}

interface JournalEntry {
  id?: number;
  entry_number?: string;
  entry_date?: string;
  date?: string;
  voucher_type?: string;
  reference_number?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  description?: string | null;
  total_debit?: number;
  total_credit?: number;
  status?: 'draft' | 'posted';
  created_by?: number;
  created_at?: string;
  updated_at?: string;
  lines?: JournalEntryLine[];
  entries?: JournalEntryLine[];
}
```

### Customer Types

```typescript
interface Customer {
  id: number;
  serial_number: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  rating: number;  // 1-10 scale
  status: "clear" | "has_dues";
  picture_url: string | null;
  opening_due_amount?: number | null;
  created_at: string;
  updated_at: string;
}

interface CustomerTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}
```

### Category Types

```typescript
interface Category {
  id: number;
  name: string;
  alias: string | null;  // e.g., "CONST" for "Construction Material"
  description: string | null;
  created_at: string;
  updated_at: string;
}
```

### Item Types

```typescript
interface ItemTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

interface Item {
  id: number;
  serial_number: string;  // Format: {category_alias}-XXXXXX or ITEM-XXXXXX
  name: string;
  brand: string | null;
  category_id: number | null;
  category?: Category | null;
  picture_url: string | null;
  total_profit: number;
  total_quantity_sold?: number;
  // Purchase prices
  last_purchase_price: number | null;
  lowest_purchase_price: number | null;
  highest_purchase_price: number | null;
  // Selling price
  selling_price: number | null;
  // Unit tracking
  primary_unit: string;
  secondary_unit: string | null;
  conversion_rate: number | null;
  tags?: ItemTag[];
  created_at: string;
  updated_at: string;
}
```

### Stock Types

```typescript
interface ItemStock {
  id: number;
  item_id: number;
  item?: Item;
  quantity_on_hand: number;
  reorder_level: number;
  stock_value: number;
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

interface ItemStockBatch {
  id: number;
  item_id: number;
  purchased_qty: number;
  remaining_qty: number;
  unit_cost: number;
  total_cost: number;
  received_at: string;
  status: 'active' | 'depleted' | 'cancelled';
}

interface ItemActiveBatchResponse {
  batch: ItemStockBatch | null;
  total_remaining_in_queue: number;
}

interface ItemBatchQueueResponse {
  batches: ItemStockBatch[];
  total_remaining: number;
}

// Batch History (Full batch tracking)
interface ItemBatchHistoryPurchaseOrderSupplier {
  id: number;
  serial_number: string;
  name: string;
}

interface ItemBatchHistoryPurchaseOrder {
  id: number;
  po_number: string;
  order_date: string | null;
  received_date: string | null;
  supplier_name: string | null;
  supplier: ItemBatchHistoryPurchaseOrderSupplier | null;
}

interface ItemBatchHistorySupplierInvoice {
  id: number;
  invoice_number: string;
  invoice_type: string;
  invoice_date: string | null;
  status: string;
  total_amount: number;
  pdf_path: string | null;
}

interface ItemBatchHistoryPurchaseOrderItem {
  id: number;
  quantity_ordered: number;
  quantity_received: number;
  quantity_received_final: number | null;
  unit_price: number;
  final_unit_price: number | null;
}

interface ItemBatchHistoryQuantities {
  purchased_qty: number;
  remaining_qty: number;
  consumed_qty: number;
  sold_qty: number;
  returned_qty: number;
  net_sold_qty: number;
}

interface ItemBatchHistoryCosting {
  unit_cost: number;
  total_cost: number;
}

interface ItemBatchHistoryEntry {
  batch_id: number;
  status: 'active' | 'depleted' | 'cancelled';
  received_at: string | null;
  costing: ItemBatchHistoryCosting;
  quantities: ItemBatchHistoryQuantities;
  purchase_order: ItemBatchHistoryPurchaseOrder | null;
  supplier_invoice: ItemBatchHistorySupplierInvoice | null;
  purchase_order_item: ItemBatchHistoryPurchaseOrderItem | null;
}

interface ItemBatchHistoryResponse {
  item: {
    id: number;
    serial_number: string;
    name: string;
    primary_unit: string;
  };
  data: ItemBatchHistoryEntry[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
```

### Purchase Order Types

```typescript
interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier?: Supplier;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  total_amount: number;
  notes: string | null;
  items: PurchaseOrderItem[];
  invoice?: SupplierInvoice | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  item_id: number;
  item?: Item;
  quantity_ordered: number;
  quantity_received: number;
  quantity_received_final: number | null;
  unit_price: number;
  final_unit_price: number | null;
  total_price: number;
  status: 'pending' | 'partial' | 'received';
  batch_id?: number | null;
}

interface SupplierInvoice {
  id: number;
  purchase_order_id: number;
  invoice_number: string;
  invoice_type: 'supplier';
  invoice_date: string;
  total_amount: number;
  status: 'pending' | 'issued' | 'paid';
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
}
```

### Stock Movement Types

```typescript
interface StockMovement {
  id: number;
  item_id: number;
  item?: Item;
  batch_id: number | null;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer';
  quantity: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Supplier Types

```typescript
interface Supplier {
  id: number;
  serial_number: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

interface SupplierBalanceResponse {
  supplier_id: number;
  balance: number;
  currency: string;
  total_invoiced: number;
  total_paid: number;
  last_payment_date: string | null;
  last_payment_amount: number | null;
}

interface SupplierPayment {
  id: number;
  supplier_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Invoice Types

```typescript
interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: 'sale' | 'purchase' | 'supplier' | 'staff' | 'journal';
  customer_id: number | null;
  customer?: Customer | null;
  supplier_id: number | null;
  supplier?: Supplier | null;
  issue_date: string;
  due_date: string | null;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  status: 'draft' | 'issued' | 'partial' | 'paid' | 'cancelled';
  items: InvoiceItem[];
  created_at: string;
  updated_at: string;
}

interface InvoiceItem {
  id: number;
  invoice_id: number;
  item_id: number;
  item?: Item;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_id?: number | null;
}
```

### Sale Types

```typescript
interface Sale {
  id: number;
  sale_number: string;
  customer_id: number;
  customer?: Customer;
  sale_date: string;
  total_amount: number;
  status: 'draft' | 'confirmed' | 'invoiced' | 'cancelled';
  items: SaleItem[];
  invoice?: Invoice | null;
  created_at: string;
  updated_at: string;
}

interface SaleItem {
  id: number;
  sale_id: number;
  item_id: number;
  item?: Item;
  quantity: number;
  unit_price: number;
  total_price: number;
  batch_id?: number | null;
}

type ItemSale = SaleItem;
```

### Customer Payment Types

```typescript
interface CustomerPayment {
  id: number;
  customer_id: number;
  invoice_id: number | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerAdvance {
  id: number;
  customer_id: number;
  amount: number;
  balance: number;
  transaction_type: 'given' | 'deducted' | 'refunded';
  reference: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerPaymentSummary {
  customer_id: number;
  total_invoiced: number;
  total_paid: number;
  total_balance: number;
  total_advance: number;
  net_balance: number;  // balance - advance
  currency: string;
}
```

### Account Mapping Types

```typescript
type AccountMappingType = 'inventory' | 'accounts_payable' | 'accounts_receivable' | 'revenue' | 'cogs' | 'expense';
type AccountMappingStatus = 'active' | 'inactive' | 'pending';

interface AccountMapping {
  id: number;
  company_id: number;
  mapping_type: AccountMappingType;
  account_id: number;
  account?: Account;
  is_default: boolean;
  status: AccountMappingStatus;
  created_at: string;
  updated_at: string;
}
```

### Rental Types

```typescript
interface RentalCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface RentalItem {
  id: number;
  name: string;
  sku: string | null;
  category_id: number | null;
  category?: RentalCategory;
  description: string | null;
  rental_price_per_day: number;
  replacement_value: number;
  quantity_available: number;
  quantity_rented: number;
  status: 'available' | 'partial' | 'rented' | 'maintenance';
  created_at: string;
  updated_at: string;
}

type RentalStatus = 'active' | 'completed' | 'overdue' | 'cancelled';
type RentalPaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'late';

interface RentalAgreement {
  id: number;
  agreement_number: string;
  customer_id: number;
  customer?: Customer;
  rental_item_id: number;
  rental_item?: RentalItem;
  quantity_rented: number;
  rental_start_date: string;
  rental_end_date: string;
  total_rent_amount: number;
  outstanding_balance: number;
  security_deposit_amount: number;
  security_deposit_collected: number;
  rental_status: RentalStatus;
  payment_status: RentalPaymentStatus;
  payment_schedule?: RentalPaymentScheduleItem[];
  created_at: string;
  updated_at: string;
}

interface RentalPaymentScheduleItem {
  id: number;
  agreement_id: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  payment_status: RentalPaymentStatus;
  paid_date: string | null;
}

interface RentalPayment {
  id: number;
  agreement_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface RentalReturn {
  id: number;
  agreement_id: number;
  return_date: string;
  quantity_returned: number;
  condition: 'good' | 'fair' | 'damaged' | 'lost';
  damage_charges: number;
  late_charges: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Vehicle Types

```typescript
interface Vehicle {
  id: number;
  vehicle_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  type: 'truck' | 'van' | 'car' | 'bike' | 'other';
  capacity_kg: number | null;
  status: 'active' | 'maintenance' | 'retired';
  purchase_date: string | null;
  purchase_price: number | null;
  created_at: string;
  updated_at: string;
}

interface VehicleProfitabilityStats {
  vehicle_id: number;
  total_delivery_orders: number;
  total_revenue: number;
  total_cost: number;
  net_profit: number;
  profit_margin: number;
  period_start: string;
  period_end: string;
}

interface VehicleMaintenance {
  id: number;
  vehicle_id: number;
  maintenance_date: string;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  cost: number;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface VehicleMaintenanceStatistics {
  vehicle_id: number;
  total_maintenance_count: number;
  total_maintenance_cost: number;
  last_maintenance_date: string | null;
  average_cost_per_maintenance: number;
}

interface VehicleDeliveryOrder {
  id: number;
  vehicle_id: number;
  do_number: string;
  customer_id: number;
  customer?: Customer;
  delivery_date: string;
  destination: string;
  distance_km: number | null;
  fuel_cost: number | null;
  driver_cost: number | null;
  other_costs: number | null;
  total_cost: number;
  revenue: number | null;
  status: 'scheduled' | 'in_transit' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

### Report Types

```typescript
interface ReportFilters {
  start_date?: string;
  end_date?: string;
  period?: ReportPeriod;
  comparison_type?: ComparisonType;
  account_ids?: number[];
  item_ids?: number[];
  customer_ids?: number[];
  supplier_ids?: number[];
  group_by?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

type ReportPeriod = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'last_year' | 'custom';
type ComparisonType = 'none' | 'previous_period' | 'previous_year';

interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  total_debit: number;
  total_credit: number;
}

interface TrialBalanceAccount {
  account_id: number;
  account_name: string;
  account_number: string | null;
  opening_balance: number;
  debit: number;
  credit: number;
  closing_balance: number;
}

interface ProfitLossReport {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  operating_profit: number;
  other_income: number;
  other_expenses: number;
  net_profit: number;
  details: ProfitLossDetail[];
}

interface ProfitLossDetail {
  account_id: number;
  account_name: string;
  amount: number;
  type: 'revenue' | 'cogs' | 'expense' | 'other_income' | 'other_expense';
}

interface ProfitLossDiagnostics {
  unconfigured_accounts: Account[];
  transactions_without_account: number;
  orphan_transactions: Transaction[];
  zero_balance_accounts: Account[];
}

interface BalanceSheetReport {
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}

interface BalanceSheetSection {
  items: BalanceSheetItem[];
  total: number;
}

interface BalanceSheetItem {
  account_id: number;
  account_name: string;
  amount: number;
}

interface GeneralLedgerLine {
  id: number;
  entry_number: string;
  entry_date: string;
  voucher_type: string;
  reference_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

interface FinancialSummaryData {
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
  total_assets: number;
  total_liabilities: number;
  equity: number;
  current_ratio: number;
  quick_ratio: number;
}

interface ProfitabilityAnalysis {
  by_item: ItemProfitability[];
  by_customer: CustomerProfitability[];
  by_category: CategoryProfitability[];
}

interface ItemProfitability {
  item_id: number;
  item_name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
  quantity_sold: number;
}

interface CustomerProfitability {
  customer_id: number;
  customer_name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
  order_count: number;
}

interface CategoryProfitability {
  category_id: number;
  category_name: string;
  revenue: number;
  cost: number;
  profit: number;
  margin_percent: number;
}

type TrendType = 'sales' | 'purchases' | 'revenue' | 'expenses' | 'profit';

interface TrendAnalysis {
  type: TrendType;
  period: string;
  data: TrendDataPoint[];
  summary: TrendSummary;
}

interface TrendDataPoint {
  date: string;
  label: string;
  value: number;
  change_from_previous: number;
  change_percent: number;
}

interface TrendSummary {
  total: number;
  average: number;
  highest: TrendDataPoint;
  lowest: TrendDataPoint;
  trend_direction: 'up' | 'down' | 'stable';
}

interface SalesAnalyticsResponse {
  item_id: number;
  total_sales: number;
  total_quantity: number;
  total_revenue: number;
  average_price: number;
  period: string;
  by_month: MonthlySalesData[];
}

interface MonthlySalesData {
  month: string;
  quantity: number;
  revenue: number;
  average_price: number;
}

interface StockAnalyticsResponse {
  item_id: number;
  current_stock: number;
  average_stock_level: number;
  stock_turnover: number;
  days_of_inventory: number;
  period: string;
  movements: StockMovementSummary[];
}

interface StockMovementSummary {
  date: string;
  in_quantity: number;
  out_quantity: number;
  balance: number;
}

interface ItemStockValueSummary {
  total_items: number;
  total_stock_value: number;
  average_stock_value_per_item: number;
  by_category: CategoryStockValue[];
}

interface CategoryStockValue {
  category_id: number;
  category_name: string;
  item_count: number;
  total_value: number;
}
```

### Financial Account Mappings

```typescript
interface FinancialAccountMapping {
  id: number;
  company_id: number;
  mapping_type: 'sales_revenue' | 'purchase_expense' | 'inventory_asset' | 'accounts_receivable' | 'accounts_payable';
  account_id: number;
  account?: Account;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
```

### Store Documents

```typescript
interface StoreDocument {
  id: number;
  document_type: 'invoice' | 'receipt' | 'report' | 'contract' | 'other';
  document_number: string;
  reference_id: number;
  reference_type: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by: number;
  created_at: string;
  updated_at: string;
}
```

## Type Utilities

### Nullable Fields
Most entity types follow the pattern where optional fields are `type | null` rather than optional. This enforces explicit null handling.

### Date Fields
All date fields are ISO 8601 strings (`string`) in the format:
- Date only: `YYYY-MM-DD`
- DateTime: `YYYY-MM-DDTHH:mm:ssZ`

### Money/Decimal Fields
All monetary values are represented as `number` (float). The UI handles formatting with `Intl.NumberFormat`.

### Enum Patterns
String literal unions are used instead of string enums:
```typescript
// Preferred
type Status = 'active' | 'inactive';

// Not used
enum Status { Active = 'active', Inactive = 'inactive' }
```

## Type-Safe API Client

The API client is typed using these interfaces:
```typescript
// All API methods return these types
apiClient.get<Paginated<Account>>('/accounts');
accountsApi.getAccount(1); // returns Promise<{ account: Account }>
```

## Related Documentation
- [API Client](./03-api-client.md) - How types are used in API calls
- [Module Documentation](./06-modules-accounting.md) - Domain-specific type usage
