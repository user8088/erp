# Module Relationships & Data Flow

## Overview

This document maps the relationships between all ERP modules and their data dependencies.

## Module Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              ERP SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │  Accounting │◄───│    Stock    │    │   Selling   │                   │
│  │   Module    │    │   Module    │◄───│   Module    │                   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                   │
│         │                  │                  │                          │
│         │ GL Entries       │ Inventory        │ Sales                    │
│         │                  │ Journal          │ Invoices                 │
│         ▼                  ▼                  ▼                          │
│  ┌─────────────────────────────────────────────────────┐                 │
│  │                    SHARED ENTITIES                   │                 │
│  │  • Accounts (Chart of Accounts)                     │                 │
│  │  • Journal Entries (Double-entry bookkeeping)       │                 │
│  │  • Transactions (General ledger)                    │                 │
│  └─────────────────────────────────────────────────────┘                 │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │  Customers  │    │  Suppliers  │    │    Staff    │                   │
│  │   Module    │    │   Module    │    │   Module    │                   │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                   │
│         │                  │                  │                          │
│         │ Sales            │ Purchases        │ Payroll                  │
│         │ Invoices         │ Orders           │ Journals                 │
│         │ Payments         │ Invoices         │                          │
│         ▼                  ▼                  ▼                          │
│  ┌─────────────────────────────────────────────────────┐                 │
│  │                  RELATIONSHIP MAP                    │                 │
│  └─────────────────────────────────────────────────────┘                 │
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                   │
│  │    Items    │    │   Rental    │    │  Transport  │                   │
│  │   Module    │    │   Module    │    │   Module    │                   │
│  └─────────────┘    └──────┬──────┘    └──────┬──────┘                   │
│                            │                  │                          │
│                            │ Customers        │ Delivery                 │
│                            │ Agreements       │ Orders                   │
│                            ▼                  ▼                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Entity Relationship Map

### 1. Accounting Module Relationships

```
Account
├── has_many :transactions
├── has_many :journal_entry_lines
├── belongs_to :parent_account (self-referential)
└── has_many :child_accounts (self-referential)

JournalEntry
├── has_many :lines (JournalEntryLine)
├── belongs_to :created_by (User)
└── creates :transactions

Transaction
├── belongs_to :account
├── belongs_to :journal_entry
└── references :polymorphic (Invoice, PurchaseOrder, etc.)
```

**Integration Points:**
- Stock → Accounting: Inventory and AP accounts
- Selling → Accounting: AR and Revenue accounts
- Staff → Accounting: Payroll expense accounts
- Rental → Accounting: Rental revenue accounts

### 2. Stock Module Relationships

```
Item
├── belongs_to :category
├── has_one :stock (ItemStock)
├── has_many :batches (ItemStockBatch)
├── has_many :stock_movements
├── has_many :purchase_order_items
├── has_many :invoice_items
├── has_many :rental_items
└── has_and_belongs_to_many :tags

Category
├── has_many :items
└── generates :serial_numbers (ITEM-CAT-XXXXXX)

PurchaseOrder
├── belongs_to :supplier
├── has_many :items (PurchaseOrderItem)
├── has_one :invoice (SupplierInvoice)
└── creates :stock_movements (on receive)

PurchaseOrderItem
├── belongs_to :purchase_order
├── belongs_to :item
└── belongs_to :batch (on receive)

ItemStockBatch
├── belongs_to :item
├── has_many :stock_movements
└── tracks :FIFO/LIFO queue

StockMovement
├── belongs_to :item
├── belongs_to :batch (optional)
└── references :polymorphic (PurchaseOrder, Invoice, Adjustment)
```

**Integration Points:**
- Stock → Suppliers: Purchase orders
- Stock → Accounting: Inventory account mappings
- Stock → Selling: Stock deduction on sales
- Stock → Rental: Separate rental inventory tracking

### 3. Selling Module Relationships

```
Invoice (Sale)
├── belongs_to :customer
├── has_many :items (InvoiceItem)
├── has_one :sale_order (optional)
└── creates :stock_movements

InvoiceItem
├── belongs_to :invoice
├── belongs_to :item
├── belongs_to :batch (for FIFO tracking)
└── tracks :cost_and_revenue

Sale (Sales Order)
├── belongs_to :customer
├── has_many :items (SaleItem)
└── converts_to :invoice

CustomerPayment
├── belongs_to :customer
├── belongs_to :invoice (optional)
└── advances_to :customer_balance

CustomerAdvance
├── belongs_to :customer
└── deducted_from :salary_or_invoice
```

**Integration Points:**
- Selling → Customers: Payments and balances
- Selling → Stock: Stock deduction
- Selling → Accounting: Revenue and AR entries
- Selling → Items: Sales analytics

### 4. Customers Module Relationships

```
Customer
├── has_many :invoices
├── has_many :payments (CustomerPayment)
├── has_many :advances (CustomerAdvance)
├── has_many :sales_orders
├── has_many :rental_agreements
├── has_many :delivery_orders (via Transport)
├── has_and_belongs_to_many :tags
└── has_one :balance_summary

CustomerTag
├── has_and_belongs_to_many :customers
└── color_coded :for_visual_organization
```

**Integration Points:**
- Customers → Selling: Invoices and payments
- Customers → Rental: Rental agreements
- Customers → Transport: Delivery orders
- Customers → Reports: Profitability analysis

### 5. Suppliers Module Relationships

```
Supplier
├── has_many :purchase_orders
├── has_many :payments (SupplierPayment)
└── has_one :balance_summary

SupplierPayment
├── belongs_to :supplier
└── reduces :outstanding_balance
```

**Integration Points:**
- Suppliers → Stock: Purchase orders
- Suppliers → Accounting: AP entries
- Suppliers → Reports: Purchase analytics

### 6. Staff Module Relationships

```
StaffMember
├── belongs_to :user (optional - ERP login)
├── has_many :attendance_entries
├── has_many :salary_runs
├── has_many :advances (StaffAdvance)
├── has_and_belongs_to_many :tags
└── receives :monthly_payroll

AttendanceEntry
├── belongs_to :staff_member
├── tracks :daily_status
└── calculates :payable_days

StaffSalaryRun
├── belongs_to :staff_member
├── generates :invoice (for payment)
├── deducts :advances
└── creates :journal_entries

StaffAdvance
├── belongs_to :staff_member
├── belongs_to :salary_run (when deducted)
└── tracks :remaining_balance
```

**Integration Points:**
- Staff → Accounting: Payroll journal entries
- Staff → Invoices: Salary payment invoices
- Staff → Auth: User account linking

### 7. Rental Module Relationships

```
RentalItem
├── belongs_to :category (RentalCategory)
├── has_many :agreements (RentalAgreement)
├── tracks :availability_status
└── separate_from :regular_stock

RentalAgreement
├── belongs_to :customer
├── belongs_to :rental_item
├── has_many :payments (RentalPayment)
├── has_many :returns (RentalReturn)
├── has_many :payment_schedule_items
└── tracks :security_deposit

RentalPayment
├── belongs_to :agreement
└── applies_to :payment_schedule

RentalReturn
├── belongs_to :agreement
├── assesses :condition
└── calculates :damage/late_charges
```

**Integration Points:**
- Rental → Customers: Agreements and payments
- Rental → Accounting: Rental revenue entries
- Rental → Items: Separate rental inventory

### 8. Transport Module Relationships

```
Vehicle
├── has_many :delivery_orders
├── has_many :maintenance_records
└── tracks :profitability

VehicleDeliveryOrder
├── belongs_to :vehicle
├── belongs_to :customer
├── calculates :revenue_and_cost
└── tracks :delivery_status

VehicleMaintenance
├── belongs_to :vehicle
└── tracks :maintenance_costs
```

**Integration Points:**
- Transport → Customers: Delivery orders
- Transport → Accounting: Vehicle expense entries
- Transport → Staff: Driver assignment

### 9. Items Module Relationships

```
Item (Product)
├── belongs_to :category
├── has_one :stock (ItemStock)
├── has_many :batches (ItemStockBatch)
├── tracks :pricing_history
├── has_and_belongs_to_many :tags
└── generates :analytics

ItemTag
├── has_and_belongs_to_many :items
└── color_coded :for_visual_organization

Category
├── has_many :items
├── defines :alias_for_serial_numbers
└── organizes :product_catalog
```

**Integration Points:**
- Items → Stock: Inventory tracking
- Items → Selling: Sales and pricing
- Items → Purchase Orders: Procurement
- Items → Reports: Profitability analysis

## Data Flow Diagrams

### Purchase to Payment Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Supplier │────►│ Purchase │────►│  Stock   │────►│   GL     │
│          │     │  Order   │     │ Receive  │     │  Entry   │
└──────────┘     └────┬─────┘     └────┬─────┘     └──────────┘
                      │                │
                      ▼                ▼
               ┌──────────┐     ┌──────────┐
               │ Supplier │     │  Item    │
               │ Invoice  │     │  Batch   │
               └──────────┘     └──────────┘
                      │
                      ▼
               ┌──────────┐
               │  Payment │
               │  to Supp │
               └──────────┘
```

### Sale to Payment Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Customer │────►│   Sale   │────►│ Invoice  │────►│  Stock   │
│          │     │  Order   │     │          │     │  Deduct  │
└──────────┘     └──────────┘     └────┬─────┘     └────┬─────┘
                                        │                │
                                        ▼                ▼
                                 ┌──────────┐     ┌──────────┐
                                 │  Payment │     │   GL     │
                                 │ Received │     │  Entry   │
                                 └──────────┘     └──────────┘
```

### Payroll Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   Staff  │────►│ Attendance│────►│  Salary  │────►│  Invoice │
│  Member  │     │  Entry   │     │  Calc    │     │  (Pay)   │
└──────────┘     └──────────┘     └────┬─────┘     └────┬─────┘
                                        │                │
                                        │                ▼
                                        │          ┌──────────┐
                                        │          │   GL     │
                                        │          │  Entry   │
                                        ▼          └──────────┘
                                 ┌──────────┐
                                 │  Advance │
                                 │ Deduction│
                                 └──────────┘
```

### Rental Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Rental  │────►│  Rental  │────►│ Payment  │────►│  Return  │
│   Item   │     │ Agreement│     │ Schedule │     │          │
└──────────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
                      │                │                │
                      ▼                ▼                ▼
               ┌──────────┐     ┌──────────┐     ┌──────────┐
               │ Customer │     │  Rental  │     │  GL      │
               │          │     │  Payment │     │  Entry   │
               └──────────┘     └──────────┘     └──────────┘
```

## Cross-Module Data Dependencies

### Critical Dependencies

1. **Stock → Accounting**
   - Stock account mappings required for PO receiving
   - Automatic GL entries on stock movements

2. **Selling → Stock**
   - Stock validation before sale
   - Batch allocation for FIFO

3. **Staff → Accounting**
   - Salary expense accounts for payroll
   - Advance liability tracking

4. **Rental → Customers**
   - Customer selection for agreements
   - Payment tracking per customer

5. **All Modules → Auth**
   - Permission checks for all operations
   - User activity logging

### Cascade Delete Rules

```
Customer
├── Delete: Set invoices customer_id to NULL (keep history)
├── Delete: Cascade delete payments (or keep as orphan)
└── Delete: Prevent if active rentals exist

Supplier
├── Delete: Set POs supplier_id to NULL
├── Delete: Cascade delete payments
└── Delete: Prevent if unpaid invoices exist

Item
├── Delete: Prevent if stock exists
├── Delete: Set PO items to inactive
└── Delete: Archive rather than hard delete

Staff
├── Delete: Archive rather than hard delete
├── Delete: Keep attendance/payroll history
└── Delete: Unlink user account

Account (Chart of Accounts)
├── Delete: Prevent if transactions exist
├── Delete: Require reallocation of child accounts
└── Delete: Soft delete (mark disabled)
```

### Data Consistency Rules

1. **Stock Consistency**
   ```
   ItemStock.quantity_on_hand = SUM(batches.remaining_qty)
   ```

2. **Customer Balance**
   ```
   Balance = Total Invoiced - Total Paid - Total Advance
   ```

3. **Supplier Balance**
   ```
   Balance = Total PO Amount - Total Paid
   ```

4. **Account Balance**
   ```
   Balance = SUM(debits) - SUM(credits)
   ```

5. **Rental Availability**
   ```
   Available = Total Quantity - Rented Quantity
   ```

## Module API Dependencies

```typescript
// Accounting Module APIs Used By Other Modules
const accountingDependencies = {
  stock: ['accountsApi.getAccounts', 'stockAccountMappingsApi.*'],
  selling: ['accountsApi.getAccounts'],
  staff: ['accountsApi.getAccounts'],
  rental: ['accountsApi.getAccounts'],
};

// Stock Module APIs Used By Other Modules
const stockDependencies = {
  selling: ['itemsApi.getStock', 'itemsApi.getBatchQueue'],
  purchaseOrders: ['itemsApi.*', 'purchaseOrdersApi.*'],
};

// Customer Module APIs Used By Other Modules
const customerDependencies = {
  selling: ['customersApi.getCustomers', 'customersApi.recordPayment'],
  rental: ['customersApi.getCustomers'],
  transport: ['customersApi.getCustomers'],
};
```

## Related Documentation
- [Type System](./04-type-system.md) - Entity type definitions
- [API Client](./03-api-client.md) - API implementation
- [Individual Module Docs](./06-modules-accounting.md) - Module-specific relationships
