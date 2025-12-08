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


