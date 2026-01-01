# Rental System - Complete Overhaul Backend Requirements

## IMPORTANT: This is a Complete System Overhaul

**Status:** The frontend UI has been completely redesigned and simplified. This document outlines the backend requirements for the new, simplified rental system.

**Previous System:** The old rental system was over-engineered with automatic calculations, payment schedules, complex period calculations, and automatic accruals.

**New System:** A simple, manual rental management system that focuses on clarity, ease of use, and proper accounting integration.

---

## Overview

This document specifies the backend API and database requirements for implementing a simple rental management system. The system allows businesses to:

1. Track rental inventory (items owned by the business, not for sale)
2. Create rental agreements with customers
3. Record manual rent payments (no automatic schedules)
4. Handle security deposits (as liabilities)
5. Process returns with damage charges
6. Maintain proper accounting records

**Key Principle:** Keep it simple and manual. No automatic calculations, no complex schedules, no over-engineering.

---

## Database Schema Requirements

### 1. Rental Categories (`rental_categories`)

**Purpose:** Organize rental items into categories (e.g., "Construction Equipment", "Office Furniture")

**Fields:**
- `id` (PK, bigint)
- `company_id` (FK → companies.id, nullable)
- `name` (string, unique, required)
- `slug` (string, unique, nullable - auto-generated from name)
- `serial_alias` (string, max 10 chars, unique, nullable - for SKU generation, e.g., "CE")
- `description` (text, nullable)
- `status` (enum: 'active', 'inactive', default: 'active')
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Business Rules:**
- Cannot delete category if it has associated rental items
- `slug` auto-generated from `name` if not provided
- `serial_alias` must be uppercase alphanumeric only

---

### 2. Rental Items (`rental_items`)

**Purpose:** Items that can be rented to customers (owned by business, not for sale)

**Fields:**
- `id` (PK, bigint)
- `company_id` (FK → companies.id, nullable)
- `rental_category_id` (FK → rental_categories.id, required)
- `name` (string, required)
- `sku` (string, unique, nullable - auto-generated if not provided)
- `quantity_total` (decimal 15,3, required, >= 0)
- `quantity_available` (decimal 15,3, required, >= 0, defaults to quantity_total)
- `cost_price` (decimal 15,2, nullable, >= 0) ⚠️ **NEW FIELD - IMPORTANT**
- `rental_price_total` (decimal 15,2, required, >= 0) - **Note:** Legacy field, may be deprecated
- `rental_period_type` (enum: 'daily', 'weekly', 'monthly', 'custom', default: 'monthly') - **Note:** Legacy field
- `rental_period_length` (integer, default: 1) - **Note:** Legacy field, may be deprecated
- `auto_divide_rent` (boolean, default: false) - **Note:** Legacy field
- `rent_per_period` (decimal 15,2, nullable) - **Note:** Legacy field, may be deprecated
- `security_deposit_amount` (decimal 15,2, nullable, >= 0) - Default security deposit per unit
- `status` (enum: 'available', 'rented', 'maintenance', default: 'available')
- `created_at` (timestamp)
- `updated_at` (timestamp)

**CRITICAL: Cost Price Field**
- `cost_price` represents the original purchase cost of the item
- Must be treated as an **ASSET** in Chart of Accounts, NOT an expense
- When item is purchased/added, create accounting entry:
  - DR Rental Assets (or Fixed Assets - Rental Equipment)
  - CR Cash/Bank/Payable (depending on payment method)
- `cost_price` is for tracking/accounting purposes only
- It does NOT affect rental pricing or calculations

**SKU Generation:**
- Format: `{category_serial_alias}-{6_digit_number}` (e.g., "CE-000001")
- Auto-generate if not provided
- Must be unique

**Business Rules:**
- Cannot delete item if it has active rental agreements
- `quantity_available` cannot exceed `quantity_total`
- `quantity_available` decreases when items are rented (agreement created)
- `quantity_available` increases when items are returned

---

### 3. Rental Agreements (`rental_agreements`)

**Purpose:** Contracts between customers and business for renting items

**Fields:**
- `id` (PK, bigint)
- `company_id` (FK → companies.id, nullable)
- `agreement_number` (string, unique, required) - Format: "RENT-{YYYYMMDD}-{XXX}"
- `customer_id` (FK → customers.id, required)
- `rental_item_id` (FK → rental_items.id, required)
- `quantity_rented` (decimal 15,3, required, > 0)
- `rental_start_date` (date, required)
- `rental_period_type` (enum: 'daily', 'weekly', 'monthly', required) ⚠️ **SIMPLIFIED - no 'custom'**
- `rent_amount` (decimal 15,2, required, > 0) ⚠️ **NEW FIELD - manual rent amount per period**
- `security_deposit_amount` (decimal 15,2, nullable, >= 0) - Total deposit for this agreement
- `security_deposit_collected` (decimal 15,2, default: 0) - Amount actually collected
- `security_deposit_collected_date` (date, nullable) - When deposit was collected
- `security_deposit_payment_account_id` (FK → accounts.id, nullable) - Account that received deposit
- `rental_status` (enum: 'active', 'completed', 'returned', 'overdue', default: 'active')
- `outstanding_balance` (decimal 15,2, default: 0) - Calculated: total payments received vs rent due
- `created_by` (FK → users.id, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**REMOVED FIELDS (from old system):**
- `rental_end_date` - Not needed for simple system
- `rental_period_length` - Not needed (no multi-period calculations)
- `total_rent_amount` - Not needed (just track payments)
- `rent_per_period` - Replaced by `rent_amount`

**Agreement Number Generation:**
- Format: `RENT-{YYYYMMDD}-{XXX}`
- Example: "RENT-20251213-001"
- Auto-increment sequence per day
- Must be unique

**Business Rules:**
- Customer must exist and be active
- Rental item must exist and have `quantity_available >= quantity_rented`
- `rent_amount` is manually set (no auto-calculation)
- When agreement created:
  - Decrease `rental_item.quantity_available` by `quantity_rented`
  - Set `rental_item.status = 'rented'` if `quantity_available = 0`
- Cannot delete agreement if status is 'active' or 'overdue'

**Accounting Entries (when agreement created):**
- **Security Deposit Collection** (if collected):
  - DR Cash/Bank Account (from `security_deposit_payment_account_id`)
  - CR Security Deposits (Liability Account)
- **Accounts Receivable** (optional - depends on accounting method):
  - If accrual basis: DR Accounts Receivable, CR Rental Income
  - If cash basis: No entry until payment received

---

### 4. Rental Payments (`rental_payments`)

**Purpose:** Manual payment records for rental agreements (no payment schedules)

**Fields:**
- `id` (PK, bigint)
- `company_id` (FK → companies.id, nullable)
- `rental_agreement_id` (FK → rental_agreements.id, required)
- `amount_paid` (decimal 15,2, required, > 0)
- `payment_date` (date, required)
- `payment_method` (enum: 'cash', 'bank_transfer', 'cheque', 'card', 'other', nullable)
- `payment_account_id` (FK → accounts.id, required) - Account that received payment
- `journal_entry_id` (FK → journal_entries.id, nullable) - Link to accounting entry
- `notes` (text, nullable)
- `created_by` (FK → users.id, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**REMOVED FIELDS (from old system):**
- `due_date` - Not needed (no payment schedules)
- `amount_due` - Not needed (no fixed payment amounts)
- `payment_status` - Not needed (payment is either recorded or not)
- `period_identifier` - Not needed (no period tracking)

**Business Rules:**
- Payment account must be a cash or bank account (asset type)
- When payment recorded:
  - Update `rental_agreement.outstanding_balance` (reduce by `amount_paid`)
  - Update `rental_agreement.rental_status`:
    - If `outstanding_balance <= 0`: status = 'completed'
    - If overdue and balance > 0: status = 'overdue'
    - Otherwise: status = 'active'

**Accounting Entries (when payment recorded):**
- DR Cash/Bank Account (from `payment_account_id`)
- CR Accounts Receivable (if using accrual basis)
- OR
- DR Cash/Bank Account
- CR Rental Income (if using cash basis)

---

### 5. Rental Returns (`rental_returns`)

**Purpose:** Records when rental items are returned, with damage assessment

**Fields:**
- `id` (PK, bigint)
- `company_id` (FK → companies.id, nullable)
- `rental_agreement_id` (FK → rental_agreements.id, required, unique) - One return per agreement
- `return_date` (date, required)
- `return_condition` (enum: 'returned_safely', 'damaged', 'lost', required)
- `damage_charge_amount` (decimal 15,2, default: 0, >= 0)
- `damage_description` (text, nullable)
- `security_deposit_refunded` (decimal 15,2, default: 0, >= 0)
- `security_deposit_retained` (decimal 15,2, default: 0, >= 0)
- `refund_account_id` (FK → accounts.id, nullable) - Account used for refund
- `return_journal_entry_id` (FK → journal_entries.id, nullable)
- `notes` (text, nullable)
- `created_by` (FK → users.id, nullable)
- `created_at` (timestamp)
- `updated_at` (timestamp)

**Business Rules:**
- One return per agreement (enforce uniqueness)
- When return processed:
  - Increase `rental_item.quantity_available` by `rental_agreement.quantity_rented`
  - Update `rental_agreement.rental_status = 'returned'`
  - Calculate refund: `security_deposit_refunded = security_deposit_amount - damage_charge_amount`
  - `security_deposit_retained = damage_charge_amount`

**Accounting Entries (when return processed):**
- DR Security Deposits (Liability) - Full deposit amount (releases liability)
- CR Cash/Bank Account - Refund amount (`security_deposit_refunded`)
- CR Damage Income (or Rental Income) - Damage charges (`damage_charge_amount`)

---

## API Endpoints

### Rental Categories

- `GET /api/rentals/categories` - List categories (with pagination, search, filtering)
- `GET /api/rentals/categories/{id}` - Get category by ID
- `POST /api/rentals/categories` - Create category
- `PATCH /api/rentals/categories/{id}` - Update category
- `DELETE /api/rentals/categories/{id}` - Delete category (if no items)

### Rental Items

- `GET /api/rentals/items` - List items (with pagination, search, filtering by status/category)
- `GET /api/rentals/items/{id}` - Get item by ID
- `POST /api/rentals/items` - Create item
- `PATCH /api/rentals/items/{id}` - Update item
- `DELETE /api/rentals/items/{id}` - Delete item (if no active agreements)

**Request Body (Create/Update):**
```json
{
  "rental_category_id": 1,
  "name": "Excavator Model X-200",
  "sku": "CE-000001", // Optional, auto-generated if not provided
  "quantity_total": 5,
  "quantity_available": 5, // Optional, defaults to quantity_total
  "cost_price": 500000.00, // Optional, treated as asset
  "rental_price_total": 10000.00, // Legacy field, may be deprecated
  "rental_period_type": "monthly", // Legacy field
  "rental_period_length": 1, // Legacy field
  "security_deposit_amount": 5000.00, // Optional
  "status": "available"
}
```

### Rental Agreements

- `GET /api/rentals/agreements` - List agreements (with pagination, search, filtering by customer/status)
- `GET /api/rentals/agreements/{id}` - Get agreement by ID (include payments)
- `POST /api/rentals/agreements` - Create agreement
- `PATCH /api/rentals/agreements/{id}` - Update agreement (limited - cannot change active agreements)
- `DELETE /api/rentals/agreements/{id}` - Delete agreement (only if status allows)

**Request Body (Create):**
```json
{
  "customer_id": 123,
  "rental_item_id": 456,
  "quantity_rented": 2,
  "rental_start_date": "2025-12-13",
  "rental_period_type": "monthly", // "daily", "weekly", or "monthly" only
  "rent_amount": 20000.00, // Manual rent amount per period (required)
  "security_deposit_amount": 10000.00, // Optional
  "collect_security_deposit": true, // Optional, default: false
  "security_deposit_payment_account_id": 789 // Required if collect_security_deposit = true
}
```

**Response (Get Agreement):**
```json
{
  "agreement": {
    "id": 1,
    "agreement_number": "RENT-20251213-001",
    "customer_id": 123,
    "customer": { "id": 123, "name": "ABC Company", ... },
    "rental_item_id": 456,
    "rental_item": { "id": 456, "name": "Excavator", ... },
    "quantity_rented": 2,
    "rental_start_date": "2025-12-13",
    "rental_period_type": "monthly",
    "rent_amount": 20000.00,
    "security_deposit_amount": 10000.00,
    "security_deposit_collected": 10000.00,
    "rental_status": "active",
    "outstanding_balance": 15000.00, // Calculated: total rent due - total payments received
    "payments": [
      {
        "id": 1,
        "amount_paid": 5000.00,
        "payment_date": "2025-12-15",
        "payment_method": "cash",
        ...
      }
    ],
    "created_at": "2025-12-13T10:00:00Z",
    "updated_at": "2025-12-15T14:30:00Z"
  }
}
```

### Rental Payments

- `POST /api/rentals/agreements/{id}/payments` - Record a payment for an agreement

**Request Body:**
```json
{
  "amount_paid": 5000.00, // Required, > 0
  "payment_date": "2025-12-15", // Required
  "payment_account_id": 789, // Required, must be cash/bank account
  "payment_method": "cash", // Optional: "cash", "bank_transfer", "cheque", "card", "other"
  "notes": "Partial payment for December rent" // Optional
}
```

**Response:**
```json
{
  "payment": {
    "id": 1,
    "rental_agreement_id": 1,
    "amount_paid": 5000.00,
    "payment_date": "2025-12-15",
    "payment_method": "cash",
    "journal_entry_id": 123,
    ...
  },
  "message": "Payment recorded successfully."
}
```

### Rental Returns

- `POST /api/rentals/returns` - Process a rental return

**Request Body:**
```json
{
  "rental_agreement_id": 1, // Required
  "return_date": "2026-01-13", // Required
  "return_condition": "damaged", // Required: "returned_safely", "damaged", "lost"
  "damage_charge_amount": 2000.00, // Optional, default: 0, required if condition is "damaged" or "lost"
  "damage_description": "Minor scratches on body", // Optional
  "security_deposit_refunded": 8000.00, // Optional, calculated: deposit - damage_charge
  "refund_account_id": 789, // Required, account to refund from
  "notes": "Item returned with minor damage" // Optional
}
```

**Response:**
```json
{
  "return": {
    "id": 1,
    "rental_agreement_id": 1,
    "return_date": "2026-01-13",
    "return_condition": "damaged",
    "damage_charge_amount": 2000.00,
    "security_deposit_refunded": 8000.00,
    "security_deposit_retained": 2000.00,
    "return_journal_entry_id": 124,
    ...
  },
  "agreement": {
    "rental_status": "returned",
    ...
  },
  "message": "Rental return processed successfully."
}
```

---

## Accounting Integration

### Account Mappings Required

The rental system requires these account mappings to be configured:

| Mapping Type | Account Type | Required | Description |
|--------------|--------------|----------|-------------|
| `rental_cash` | Asset | Yes | Cash account for rental payments |
| `rental_bank` | Asset | No | Bank account for rental payments |
| `rental_ar` | Asset | Yes | Accounts Receivable for rentals |
| `rental_assets` | Asset | Yes | Rental Assets account (for cost_price) |
| `rental_security_deposits` | Liability | Yes | Security Deposits (Customers) |
| `rental_income` | Income | Yes | Rental Income |
| `rental_damage_income` | Income | No | Damage Charges Income (optional, can use rental_income) |

**Validation:** All APIs must validate required mappings exist before operations.

### Accounting Entries

#### 1. Agreement Creation (with Security Deposit)

**When:** `POST /api/rentals/agreements` with `collect_security_deposit = true`

**Entries:**
```
Journal Entry:
  DR Cash/Bank Account (from security_deposit_payment_account_id)
  CR Security Deposits (Liability Account)
```

**Optional (Accrual Basis):**
```
Journal Entry:
  DR Accounts Receivable (Customer)
  CR Rental Income
```

#### 2. Payment Recording

**When:** `POST /api/rentals/agreements/{id}/payments`

**Entries (Cash Basis):**
```
Journal Entry:
  DR Cash/Bank Account (from payment_account_id)
  CR Rental Income
```

**Entries (Accrual Basis):**
```
Journal Entry:
  DR Cash/Bank Account (from payment_account_id)
  CR Accounts Receivable (Customer)
```

#### 3. Return Processing

**When:** `POST /api/rentals/returns`

**Entries:**
```
Journal Entry:
  DR Security Deposits (Liability) - Full deposit amount
  CR Cash/Bank Account (from refund_account_id) - Refund amount
  CR Rental Income (or Damage Income) - Damage charges
```

#### 4. Cost Price (Asset Purchase)

**When:** Rental item is purchased/added with `cost_price`

**Note:** This should be handled by a separate purchase/asset acquisition process, but the rental system should track `cost_price` for accounting purposes.

**Entries (Example):**
```
Journal Entry:
  DR Rental Assets (Asset Account from rental_assets mapping)
  CR Cash/Bank/Payable (depending on payment method)
```

---

## Business Logic Requirements

### 1. Quantity Management

- When agreement created: `quantity_available -= quantity_rented`
- When return processed: `quantity_available += quantity_rented`
- Cannot create agreement if `quantity_available < quantity_rented`
- Update item status: If `quantity_available = 0`, set status to 'rented'

### 2. Outstanding Balance Calculation

- `outstanding_balance = total_rent_due - total_payments_received`
- `total_rent_due`: Sum of all `rent_amount` for the rental period (manual calculation or simple logic)
- **Note:** For simple system, outstanding balance can be calculated manually or simplified

### 3. Agreement Status Updates

- `active`: Default status
- `completed`: All payments received (outstanding_balance <= 0)
- `overdue`: Past due date and balance > 0 (requires due date logic - may be simplified)
- `returned`: Item has been returned

### 4. Payment Validation

- Payment account must be cash or bank account (asset type)
- Payment account must match `rental_cash` or `rental_bank` mapping (recommended)
- Amount must be > 0

### 5. Return Processing

- Can only return once per agreement (enforce uniqueness)
- Calculate: `security_deposit_refunded = security_deposit_amount - damage_charge_amount`
- Validate: `security_deposit_refunded >= 0`
- Refund account must be cash or bank account

---

## Data Validation Rules

### Rental Items

- `name`: Required, max 255 chars
- `rental_category_id`: Required, must exist
- `quantity_total`: Required, >= 1
- `quantity_available`: >= 0, <= quantity_total
- `cost_price`: Optional, >= 0
- `security_deposit_amount`: Optional, >= 0

### Rental Agreements

- `customer_id`: Required, customer must exist
- `rental_item_id`: Required, item must exist and have `quantity_available >= quantity_rented`
- `quantity_rented`: Required, > 0
- `rental_start_date`: Required, valid date
- `rental_period_type`: Required, must be 'daily', 'weekly', or 'monthly' (no 'custom')
- `rent_amount`: Required, > 0
- `security_deposit_amount`: Optional, >= 0
- `collect_security_deposit`: If true, `security_deposit_payment_account_id` required

### Rental Payments

- `rental_agreement_id`: Required, agreement must exist
- `amount_paid`: Required, > 0
- `payment_date`: Required, valid date
- `payment_account_id`: Required, account must exist and be asset type (cash/bank)
- `payment_method`: Optional

### Rental Returns

- `rental_agreement_id`: Required, agreement must exist and not already returned (unique)
- `return_date`: Required, valid date, >= rental_start_date
- `return_condition`: Required, must be 'returned_safely', 'damaged', or 'lost'
- `damage_charge_amount`: Required if condition is 'damaged' or 'lost', >= 0
- `refund_account_id`: Required, account must exist and be asset type (cash/bank)

---

## Error Handling

All APIs must return appropriate HTTP status codes and error messages:

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `422 Unprocessable Entity`: Validation errors
- `500 Internal Server Error`: Server error

**Error Response Format:**
```json
{
  "message": "Validation failed.",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

---

## Migration Notes

**From Old System to New System:**

1. Existing agreements with payment schedules: Need migration strategy (may need to convert to simple payments)
2. Legacy fields (`rental_period_length`, `total_rent_amount`, etc.): Keep in database but deprecate, don't use in new code
3. Payment schedules: Remove or convert existing schedules to simple payment records
4. Outstanding balance: Recalculate based on new simple payment model

**Backward Compatibility:**

- Keep old fields in database schema for migration period
- New API endpoints should not require old fields
- Frontend will only send new simplified fields

---

## Implementation Priority

### Phase 1: Core Functionality (Critical)

1. ✅ Database schema updates (add `cost_price`, `rent_amount` fields)
2. ✅ Rental Items CRUD APIs (with cost_price)
3. ✅ Rental Agreements CRUD APIs (simplified, manual rent_amount)
4. ✅ Rental Payments API (simple, no schedules)
5. ✅ Rental Returns API
6. ✅ Basic accounting entries (security deposits, payments, returns)

### Phase 2: Accounting Integration (High Priority)

7. Account mapping validation
8. Complete accounting entry creation for all operations
9. Cost price asset tracking
10. Rental income recognition
11. Security deposit liability handling

### Phase 3: Business Logic (Medium Priority)

12. Outstanding balance calculation
13. Agreement status automation
14. Quantity management automation
15. Validation and error handling improvements

---

## Testing Requirements

1. **Unit Tests:**
   - Quantity management logic
   - Outstanding balance calculation
   - Agreement status updates
   - Payment validation

2. **Integration Tests:**
   - Full rental lifecycle (create → pay → return)
   - Accounting entry creation
   - Account mapping validation
   - Error handling

3. **API Tests:**
   - All endpoints with valid/invalid data
   - Edge cases (zero amounts, negative quantities, etc.)
   - Permission checks

---

## Summary

This simplified rental system removes all complex features (payment schedules, automatic calculations, period lengths) and focuses on:

- **Manual rent amounts** - User sets rent when creating agreement
- **Simple payments** - Just record amount, date, account (no schedules)
- **Proper accounting** - Cost price as asset, security deposits as liability, rental income tracking
- **Easy to use** - Clean, straightforward workflow
- **Accounting-safe** - All transactions properly recorded in Chart of Accounts

The system is designed to be simple, maintainable, and easily expandable in the future if needed.
