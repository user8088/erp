export type AccessLevel = "no-access" | "read" | "read-write";

export type PermissionsMap = Record<string, AccessLevel>;

export interface RoleSummary {
  id: string | number;
  name: string;
  description?: string | null;
}

export interface PermissionSummary {
  id: string | number;
  code: string;
  label: string;
  access_level: AccessLevel;
}

export interface Role extends RoleSummary {
  is_system?: boolean;
  permissions?: PermissionSummary[];
}

export interface User {
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

export interface UserProfile {
  user_id: string | number;
  address?: string | null;
  cnic_front_path?: string | null;
  cnic_back_path?: string | null;
}

// Staff Management
export interface StaffMember {
  id: number; // API returns numeric ID
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

export interface StaffSalary {
  id: string | number;
  staff_id: string | number;
  month: string; // YYYY-MM
  status: "scheduled" | "due" | "paid";
  amount: number;
  due_date: string;
  paid_on?: string | null;
  invoice_number?: string | null;
  advance_adjusted?: number | null;
  notes?: string | null;
}

export interface StaffAdvance {
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

export type PayFrequency = "monthly" | "biweekly" | "weekly";

export interface SalaryComponent {
  id?: string | number;
  label: string;
  amount: number;
}

/**
 * @deprecated Salary structures are no longer used. Use direct payment API (staffApi.paySalary) instead.
 */
export interface StaffSalaryStructure {
  id: string | number;
  name: string;
  basic_amount: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  pay_frequency: PayFrequency;
  payable_days: number;
  notes?: string | null;
}

export type AttendanceStatus =
  | "present"
  | "absent"
  | "paid_leave"
  | "unpaid_leave"
  | "late";

export interface AttendanceEntry {
  id: string | number;
  person_id: string | number;
  person_type: "staff" | "user";
  name: string;
  designation?: string | null;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string | null;
  late_time?: string | null; // HH:MM format (e.g., "09:30")
}

export interface StaffSalaryRun {
  id: string | number;
  staff_id: string | number;
  month: string; // YYYY-MM
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

export interface Tag {
  id: string | number;
  name: string;
  color: string;
}

export interface Attachment {
  id: string | number;
  user_id: string | number;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface TransactionTotals {
  total_debit: number;
  total_credit: number;
  net_change: number;
  page_total_debit?: number;
  page_total_credit?: number;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// Accounting / Accounts
export type RootAccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type NormalBalance = "debit" | "credit";

export interface Account {
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
  // For tree responses, children is an array; for flat responses it may be null.
  children: Account[] | null;
}

export type AccountTreeNode = Omit<Account, "children"> & {
  children: AccountTreeNode[];
};

// Stock Account Mappings
export interface StockAccountMapping {
  id: number;
  inventory_account_id: number;
  accounts_payable_account_id: number;
  inventory_account?: Account;
  accounts_payable_account?: Account;
  created_at: string;
  updated_at: string;
}

export interface DetectedAccount {
  account: Account | null;
  confidence: number;
  method: string;
  reason: string;
}

export interface AutoDetectResponse {
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

export interface Transaction {
  id: number;
  date: string;
  voucher_type: string;
  reference_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance?: number;
  related_account_name?: string; // For group accounts
  related_account_number?: string;
  created_at?: string; // ISO 8601 timestamp
  entry_date?: string; // Y-m-d format
  entry_time?: string; // H:i:s format
  entry_datetime?: string; // Y-m-d H:i:s format
  is_opening_balance?: boolean; // Flag to identify opening balance transactions
  created_by?: number; // User ID who created the transaction
  creator?: {
    id: number;
    full_name: string;
    email?: string;
  }; // Creator user details
}

export interface JournalEntryLine {
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

export interface JournalEntry {
  id?: number;
  entry_number?: string;
  entry_date?: string;
  date?: string; // For backward compatibility
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
  lines?: JournalEntryLine[]; // For creating entries
  entries?: JournalEntryLine[]; // For reading entries (backend may use this)
}

// Customer Management
export interface Customer {
  id: number;
  serial_number: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  rating: number; // 1-10 scale
  status: "clear" | "has_dues";
  picture_url: string | null;
  opening_due_amount?: number | null; // Opening balance - amount customer owes
  created_at: string;
  updated_at: string;
}

// Category Management
export interface Category {
  id: number;
  name: string;
  alias: string | null; // e.g., "CONST" for "Construction Material"
  description: string | null;
  created_at: string;
  updated_at: string;
}

// Item Management
// Item Tags
export interface ItemTag {
  id: number;
  name: string;
  color: string; // Hex color code like #3b82f6
  created_at: string;
  updated_at: string;
}

// Customer Tags
export interface CustomerTag {
  id: number;
  name: string;
  color: string; // Hex color code like #3b82f6
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: number;
  serial_number: string; // Format: {category_alias}-XXXXXX or ITEM-XXXXXX
  name: string;
  brand: string | null;
  category_id: number | null;
  category?: Category | null;
  picture_url: string | null;
  total_profit: number;
  // Purchase prices (from suppliers)
  last_purchase_price: number | null; // Last price purchased from supplier
  lowest_purchase_price: number | null; // Lowest price ever paid
  highest_purchase_price: number | null; // Highest price ever paid
  // Selling price (to customers)
  selling_price: number | null; // Price at which item is sold to customers (per primary unit)
  // Unit tracking
  primary_unit: string; // e.g., "bag", "box", "piece", "carton"
  secondary_unit: string | null; // e.g., "kg", "liter", "meter"
  conversion_rate: number | null; // How many secondary units in one primary unit (e.g., 1 bag = 10 kg)
  tags?: ItemTag[]; // Assigned tags
  created_at: string;
  updated_at: string;
}

// Stock Management
export interface ItemStock {
  id: number;
  item_id: number;
  item?: Item;
  quantity_on_hand: number;
  reorder_level: number;
  stock_value: number; // Auto-calculated: quantity × selling_price (value at which you can sell the stock)
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Purchase Order
export interface PurchaseOrder {
  id: number;
  po_number: string; // PO-YYYYMMDD-XXX
  supplier_id: number | null;
  supplier_name: string; // Temporary field until supplier module is ready
  order_date: string;
  expected_delivery_date: string | null;
  received_date: string | null;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  subtotal: number;
  tax_percentage: number;
  tax_amount: number;
  discount: number;
  total: number;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  items?: PurchaseOrderItem[];
  journal_entry_id?: number | null;
  journal_entry?: JournalEntry | null;
  supplier_invoice_path?: string | null; // Path to uploaded supplier invoice
  other_costs_total?: number; // Sum of other costs
  delivery_charge?: number; // Delivery charge from supplier (increases amount owed)
  final_total?: number; // Final amount after adjustments
  supplier_invoice_id?: number | null; // ID of created supplier invoice
  supplier_invoice?: Invoice | null; // Created supplier invoice
}

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  item_id: number;
  item?: Item;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  total: number;
  final_unit_price?: number | null; // Final settled price (may differ from initial quote)
  quantity_received_final?: number; // Final quantity received (may be less than ordered)
}

// Receive Stock Payload
export interface ReceiveStockPayload {
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
  delivery_charge?: number; // Delivery charge from supplier (increases amount owed)
  supplier_invoice_file?: File | null;
}

// Stock Movement (Audit Trail)
export interface StockMovement {
  id: number;
  item_id: number;
  item?: Item;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: number; // +ve for in, -ve for out
  previous_stock: number;
  new_stock: number;
  reference_type: string | null; // 'purchase_order', 'invoice', 'adjustment'
  reference_id: number | null;
  notes: string | null;
  performed_by: number;
  performed_by_name?: string;
  created_at: string;
}

// Supplier Management
export interface Supplier {
  id: number;
  serial_number: string; // SUPP-YYYYMMDD-XXX
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  picture_url: string | null;
  rating: number; // 1-10
  status: 'active' | 'inactive';
  customer_id: number | null; // Link to customer if supplier is also a customer
  customer?: {
    id: number;
    serial_number: string;
    name: string;
    email: string;
  } | null;
  total_purchase_amount: string; // Decimal as string - Lifetime total purchases from this supplier
  items_supplied: string | null; // Description of items/products this supplier provides
  notes: string | null;
  outstanding_balance?: number;
  created_at: string;
  updated_at: string;
}

// Supplier Payments
export interface SupplierPayment {
  id: number;
  payment_number: string; // PAY-YYYYMMDD-XXX
  supplier_id: number;
  supplier_name?: string;
  amount: number;
  payment_date: string;
  payment_account_id: number;
  payment_account?: Account;
  payment_account_name?: string;
  invoice_number: string | null;
  notes: string | null;
  journal_entry_id: number | null;
  journal_entry?: JournalEntry | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierBalanceResponse {
  supplier_id: number;
  supplier_name: string;
  total_purchased: number;
  total_paid: number;
  outstanding_balance: number;
  breakdown: {
    received_orders_count: number;
    payments_count: number;
    last_payment_date: string | null;
    last_payment_amount: number | null;
  };
}

// Invoice System
export interface Invoice {
  id: number;
  invoice_number: string;
  invoice_type: 'supplier' | 'sale' | 'payment' | 'purchase' | 'expense' | 'staff';
  type_label?: string;
  company_id: number | null;
  reference_type: string | null;
  reference_id: number | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  invoice_date: string;
  due_date: string | null;
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  pdf_path: string | null;
  has_pdf?: boolean;
  metadata: {
    supplier?: {
      id: number;
      name: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    customer?: {
      id: number;
      name: string;
      serial_number?: string;
      email?: string;
      phone?: string;
      address?: string;
    };
    payment?: {
      payment_number: string;
      payment_date: string;
      payment_account?: {
        id: number;
        name: string;
        number?: string;
      };
      invoice_number?: string;
      notes?: string;
    };
    sale_type?: 'walk-in' | 'delivery';
    [key: string]: unknown;
  } | null;
  notes: string | null;
  created_by: number;
  creator?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  reference?: {
    id: number;
    payment_number?: string;
    amount?: number;
    payment_date?: string;
    [key: string]: unknown;
  };
}

// POS System Types

export interface Vehicle {
  id: number;
  name: string;
  registration_number: string;
  type: string | null;
  notes: string | null;
  status: "active" | "inactive";
  maintenance_cost?: number; // Maintenance cost per delivery run (e.g., fuel cost)
  created_at: string;
  updated_at: string;
  profitability_stats?: VehicleProfitabilityStats;
  total_orders?: number;
}

export interface VehicleProfitabilityStats {
  total_delivery_charges: number;
  total_maintenance_costs: number; // Sum of all maintenance records in date range
  net_profit: number;
  profit_margin_percentage: number;
  total_orders: number;
  period_start?: string; // Date range start (YYYY-MM-DD)
  period_end?: string; // Date range end (YYYY-MM-DD)
}

export interface VehicleMaintenance {
  id: number;
  vehicle_id: number;
  type: string;
  description: string | null;
  amount: number;
  maintenance_date: string; // YYYY-MM-DD
  notes: string | null;
  created_by: number;
  creator?: {
    id: number;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface VehicleMaintenanceStatistics {
  vehicle_id: number;
  vehicle_name: string;
  total_maintenance_costs: number;
  maintenance_by_type: Record<string, {
    count: number;
    total_amount: number;
  }>;
  total_records: number;
}

export interface VehicleDeliveryOrder extends Sale {
  sale_type: "delivery"; // Narrow the type to only "delivery"
}

export interface SaleItem {
  id: number;
  sale_id: number;
  item_id: number;
  item_stock_id: number;
  item?: Item;
  quantity: number;
  unit: string;
  unit_price: number;
  original_price: number;
  discount_percentage: number;
  discount_amount: number;
  delivery_charge: number;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: number;
  sale_number: string;
  sale_type: 'walk-in' | 'delivery';
  customer_id: number;
  customer?: Customer;
  created_by: number;
  subtotal: number;
  total_discount: number;
  total_delivery_charges: number;
  tax_amount: number;
  total_amount: number;
  payment_status: 'paid' | 'unpaid' | 'partial';
  amount_paid: number;
  amount_due: number;
  advance_used: number;
  vehicle_id?: number | null;
  vehicle?: Vehicle | null;
  delivery_address?: string | null;
  expected_delivery_date?: string | null;
  maintenance_cost?: number; // Maintenance cost for delivery runs (e.g., fuel cost)
  status: 'draft' | 'completed' | 'cancelled';
  notes?: string | null;
  items?: SaleItem[];
  invoice?: Invoice | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPayment {
  id: number;
  payment_number: string;
  customer_id: number;
  customer?: Customer;
  created_by: number;
  payment_type: 'invoice_payment' | 'advance_payment' | 'refund';
  invoice_id?: number | null;
  invoice?: Invoice | null;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card' | 'other';
  payment_account_id: number;
  payment_account?: Account | null;
  reference_number?: string | null;
  payment_date: string;
  notes?: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CustomerAdvance {
  id: number;
  customer_id: number;
  customer?: Customer;
  payment_id?: number | null;
  payment?: CustomerPayment | null;
  sale_id?: number | null;
  sale?: Sale | null;
  amount: number;
  balance: number;
  transaction_type: 'received' | 'used' | 'refunded';
  reference?: string | null;
  transaction_date: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type AccountMappingType = 
  | 'pos_cash' 
  | 'pos_bank' 
  | 'pos_ar' 
  | 'pos_advance' 
  | 'pos_sales_revenue' 
  | 'pos_delivery_revenue' 
  | 'pos_discount' 
  | 'staff_salary_expense' 
  | 'staff_salary_payment' 
  | 'staff_advance' 
  | 'rental_cash' 
  | 'rental_bank' 
  | 'rental_ar' 
  | 'rental_assets' 
  | 'rental_security_deposits' 
  | 'rental_income' 
  | 'rental_damage_income';

export interface AccountMapping {
  id: number;
  mapping_type: AccountMappingType;
  account_id: number;
  account?: Account;
  company_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface AccountMappingStatus {
  mapping_type: string;
  label: string;
  is_configured: boolean;
  account_id?: number | null;
  account_name?: string | null;
}

export interface CustomerPaymentSummary {
  customer_id: number;
  due_amount: number;
  opening_due_amount?: number | null; // Opening balance - amount customer owes from before
  prepaid_amount: number;
  total_spent: number;
  total_paid: number;
  outstanding_invoices: Array<{
    invoice_id: number;
    invoice_number: string;
    amount: number;
    due_amount: number;
    invoice_date: string;
  }>;
  advance_balance: number;
  advance_transactions: CustomerAdvance[];
}

// Rental Management Types

export interface RentalCategory {
  id: number;
  name: string;
  slug: string;
  serial_alias: string;
  description?: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
}

export interface RentalItem {
  id: number;
  rental_category_id: number;
  rental_category?: RentalCategory;
  name: string;
  sku: string;
  quantity_total: number;
  quantity_available: number;
  cost_price?: number | null;
  rental_price_total: number;
  rental_period_type: "daily" | "weekly" | "monthly" | "custom";
  rental_period_length: number;
  auto_divide_rent: boolean;
  rent_per_period: number;
  security_deposit_amount: number;
  status: "available" | "rented" | "maintenance";
  created_at: string;
  updated_at: string;
}

export interface RentalPaymentScheduleItem {
  period: number;
  due_date: string;
  amount_due: number;
  payment_status: "paid" | "late" | "unpaid";
}

export interface RentalAgreement {
  id: number;
  agreement_number: string;
  customer_id: number;
  customer?: Customer;
  rental_item_id: number;
  rental_item?: RentalItem;
  quantity_rented: number;
  rental_start_date: string;
  rental_end_date: string;
  rental_period_type: "daily" | "weekly" | "monthly" | "custom";
  rental_period_length: number;
  total_rent_amount: number;
  rent_per_period: number;
  security_deposit_amount: number;
  security_deposit_collected: number;
  security_deposit_payment_account_id?: number | null;
  security_deposit_collected_date?: string | null;
  payment_schedule: RentalPaymentScheduleItem[];
  rental_status: "active" | "completed" | "returned" | "overdue";
  outstanding_balance: number;
  payments?: RentalPayment[];
  created_at: string;
  updated_at: string;
}

export interface RentalPayment {
  id: number;
  rental_agreement_id: number;
  rental_agreement?: RentalAgreement;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  payment_date?: string | null;
  payment_status: "paid" | "late" | "unpaid";
  payment_method?: "cash" | "bank_transfer" | "cheque" | "card" | "other" | null;
  period_identifier: string;
  journal_entry_id?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RentalReturn {
  id: number;
  rental_agreement_id: number;
  rental_agreement?: RentalAgreement;
  return_date: string;
  return_condition: "returned_safely" | "damaged" | "lost";
  damage_charge_amount: number;
  security_deposit_refunded: number;
  security_deposit_retained: number;
  damage_description?: string | null;
  return_journal_entry_id?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

// Financial Reports Types
export type ReportPeriod = "monthly" | "quarterly" | "yearly";
export type ComparisonType = "previous_period" | "previous_year" | "none";

export interface ReportFilters {
  company_id: number;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  comparison_type?: ComparisonType;
  comparison_start_date?: string;
  comparison_end_date?: string;
  account_ids?: number[]; // Filter by specific accounts
  root_types?: RootAccountType[]; // Filter by account types
}

export interface TrialBalanceLine {
  account_id: number;
  account_number: string | null;
  account_name: string;
  root_type: RootAccountType;
  debit_balance: number;
  credit_balance: number;
  net_balance: number; // debit - credit (positive = debit, negative = credit)
}

export interface TrialBalanceReport {
  filters: ReportFilters;
  lines: TrialBalanceLine[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  generated_at: string;
}

export type PnLSection = 
  | "income" 
  | "cogs" 
  | "operating_expense" 
  | "non_operating_income" 
  | "non_operating_expense"
  | "tax"
  | "other";

export interface PnLLine {
  account_id: number;
  account_number: string | null;
  account_name: string;
  section: PnLSection;
  category: string | null; // Account category from mapping (if available)
  current_period: number;
  previous_period?: number;
  change_amount?: number;
  change_percentage?: number;
  order: number;
}

export interface PnLSummary {
  total_income: number;
  total_cogs: number;
  gross_profit: number;
  total_operating_expenses: number;
  operating_profit: number;
  total_non_operating_income: number;
  total_non_operating_expenses: number;
  net_profit_before_tax: number;
  tax: number;
  net_profit: number;
}

export interface ProfitLossReport {
  filters: ReportFilters;
  lines: PnLLine[];
  summary: PnLSummary;
  previous_summary?: PnLSummary;
  generated_at: string;
}

export interface ProfitLossDiagnostics {
  company_id: number;
  start_date: string;
  end_date: string;
  income_accounts_count: number;
  income_accounts: Array<{
    id: number;
    name: string;
    number: string | null;
    is_disabled: boolean;
  }>;
  journal_entries_count: number;
  income_transactions_count: number;
  total_income_amount: number;
  sales_revenue_mapping: {
    exists: boolean;
    account_id: number | null;
    account_name: string | null;
    account_number: string | null;
  } | null;
}

export interface FinancialSummaryData {
  company_id: number;
  period: string;
  start_date?: string;
  end_date?: string;
  summary: {
    total_income: number;
    total_expenses: number;
    accounts_receivable: number;
    accounts_payable: number;
  };
  breakdown?: {
    income?: Record<string, number>;
    expenses?: Record<string, number>;
  };
  generated_at: string;
}

export type BalanceSheetSection = 
  | "current_assets"
  | "fixed_assets"
  | "intangible_assets"
  | "other_assets"
  | "current_liabilities"
  | "long_term_liabilities"
  | "other_liabilities"
  | "equity"
  | "retained_earnings";

export interface BalanceSheetLine {
  account_id: number;
  account_number: string | null;
  account_name: string;
  section: BalanceSheetSection;
  category: string;
  current_period: number;
  previous_period?: number;
  change_amount?: number;
  change_percentage?: number;
  order: number;
}

export interface BalanceSheetSummary {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  working_capital: number; // current_assets - current_liabilities
  is_balanced: boolean; // assets = liabilities + equity
}

export interface BalanceSheetReport {
  filters: ReportFilters;
  lines: BalanceSheetLine[];
  summary: BalanceSheetSummary;
  previous_summary?: BalanceSheetSummary;
  generated_at: string;
}

export interface GeneralLedgerLine {
  id: number;
  date: string;
  voucher_type: string;
  reference_number: string | null;
  description: string | null;
  account_id: number;
  account_number: string | null;
  account_name: string;
  debit: number;
  credit: number;
  balance: number; // Running balance
  journal_entry_id: number;
}

export interface GeneralLedgerReport {
  filters: ReportFilters;
  lines: GeneralLedgerLine[];
  total_debit: number;
  total_credit: number;
  generated_at: string;
}

export interface ProfitabilityRatio {
  name: string;
  label: string;
  value: number;
  unit: string; // Always "%" for profitability ratios
  description: string;
  trend: "up" | "down" | "stable" | null; // null if no comparison data
  previous_value: number | null; // null if no comparison data
}

export interface ProfitabilityAnalysis {
  filters: ReportFilters;
  ratios: ProfitabilityRatio[];
  generated_at: string;
}

export interface TrendDataPoint {
  period: string; // "2025-01", "2025-Q1", "2025"
  value: number;
  label: string;
}

export interface TrendAnalysis {
  filters: ReportFilters;
  metric: string; // "revenue" or "expense"
  data_points: TrendDataPoint[];
  trend: "increasing" | "decreasing" | "stable";
  average_growth_rate: number | null; // null if less than 2 data points
  generated_at: string;
}

export interface FinancialAccountMapping {
  id?: number;
  account_id: number;
  pnl_section?: PnLSection;
  pnl_category?: string;
  balance_sheet_section?: BalanceSheetSection;
  is_primary: boolean;
  order: number;
  notes?: string | null;
}

export interface FinancialReportResponse<T> {
  data: T;
  meta?: {
    generated_at: string;
    period: string;
    comparison_period?: string;
  };
}


