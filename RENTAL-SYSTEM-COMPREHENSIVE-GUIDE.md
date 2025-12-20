# Rental System Comprehensive Guide

## Overview

The rental management system is a complete solution for managing equipment/item rentals, tracking payments, and processing returns. It integrates with the accounting system to automatically create journal entries for all financial transactions.

## System Architecture

The rental system consists of **5 main components**:

1. **Rental Categories** - Organize rental items (e.g., "Construction Equipment", "Office Furniture")
2. **Rental Items** - Individual items available for rent with pricing and availability
3. **Rental Agreements** - Contracts between customers and the business for renting items
4. **Rental Payments** - Payment tracking for rental agreements with scheduled payments
5. **Rental Returns** - Processing returns with damage assessment and security deposit handling

---

## Data Models

### RentalCategory
- Organizes rental items into categories
- Fields: `id`, `name`, `slug`, `serial_alias`, `description`, `status` (active/inactive)
- Used for SKU generation (e.g., "CE-000001" where "CE" is the serial_alias)

### RentalItem
- Represents an item that can be rented
- Key fields:
  - `quantity_total`: Total quantity available
  - `quantity_available`: Currently available quantity (decreases when rented)
  - `rental_price_total`: Total price for the rental period
  - `rental_period_type`: daily, weekly, monthly, or custom
  - `rental_period_length`: Number of periods
  - `rent_per_period`: Calculated as `rental_price_total / rental_period_length` (if auto_divide_rent is true)
  - `security_deposit_amount`: Required security deposit per unit
  - `status`: available, rented, or maintenance

### RentalAgreement
- Contract between customer and business
- Key fields:
  - `agreement_number`: Auto-generated (format: `RENT-{YYYYMMDD}-{XXX}`)
  - `customer_id`: Reference to customer
  - `rental_item_id`: Reference to rental item
  - `quantity_rented`: How many units are rented
  - `rental_start_date` / `rental_end_date`: Rental period
  - `total_rent_amount`: Total rent for entire period
  - `rent_per_period`: Rent amount per period
  - `security_deposit_amount`: Total security deposit (item deposit × quantity)
  - `security_deposit_collected`: Amount collected
  - `payment_schedule`: JSON array of payment periods with due dates
  - `rental_status`: active, completed, returned, or overdue
  - `outstanding_balance`: Calculated as `total_rent_amount - sum(amount_paid)`

### RentalPayment
- Individual payment records for each payment period
- Key fields:
  - `due_date`: When payment is due
  - `amount_due`: Amount required for this period
  - `amount_paid`: Amount actually paid
  - `payment_date`: When payment was received
  - `payment_status`: paid, late, or unpaid (auto-calculated)
  - `period_identifier`: e.g., "Period 1", "Period 2"
  - `journal_entry_id`: Link to accounting entry

### RentalReturn
- Records when items are returned
- Key fields:
  - `return_date`: When item was returned
  - `return_condition`: returned_safely, damaged, or lost
  - `damage_charge_amount`: Charges for damage/loss
  - `security_deposit_refunded`: Amount refunded to customer
  - `security_deposit_retained`: Amount kept (equals damage charges)
  - `damage_description`: Description of damage
  - `return_journal_entry_id`: Link to accounting entry

---

## Complete Workflow

### 1. Setup Phase

#### Configure Account Mappings
**Location**: `/rental/settings`

Before using the rental system, you must configure account mappings that link rental operations to Chart of Accounts:

| Mapping Type | Account Type | Required | Description |
|--------------|--------------|----------|-------------|
| `rental_cash` | Asset | Yes | Cash account for rental payments |
| `rental_bank` | Asset | No | Bank account for rental payments |
| `rental_ar` | Asset | Yes | Accounts Receivable for rentals |
| `rental_assets` | Asset | Yes | Rental Assets account |
| `rental_security_deposits` | Liability | Yes | Security Deposits (Customers) |
| `rental_income` | Income | Yes | Rental Income |
| `rental_damage_income` | Income | No | Damage Charges Income (optional) |

**Frontend Implementation**: `app/rental/settings/page.tsx`
- Loads all accounts from Chart of Accounts
- Filters by account type (asset, liability, income)
- Saves mappings via `/api/account-mappings` endpoint
- Shows configuration status for each mapping

#### Create Rental Categories
**Location**: `/rental/categories`

- Create categories to organize rental items
- Each category has a `serial_alias` used for SKU generation
- Example: "Construction Equipment" with alias "CE" generates SKUs like "CE-000001"

#### Create Rental Items
**Location**: `/rental/items`

When creating a rental item:
1. Select a category
2. Enter item name and details
3. Set `quantity_total` (total units available)
4. Set `rental_price_total` (total price for the period)
5. Set `rental_period_type` (daily/weekly/monthly/custom)
6. Set `rental_period_length` (number of periods)
7. Set `security_deposit_amount` (per unit)
8. If `auto_divide_rent` is true, `rent_per_period` is calculated automatically

**Business Rules**:
- SKU is auto-generated if not provided: `{category_serial_alias}-{6_digit_number}`
- `quantity_available` defaults to `quantity_total` if not specified
- `rent_per_period = rental_price_total / rental_period_length` (if auto_divide_rent)

---

### 2. Creating a Rental Agreement

**Location**: `/rental/agreements/new`

**Step-by-Step Process**:

#### Step 1: Select Customer
- Search and select a customer from the customer list
- Customer must exist in the system

#### Step 2: Select Rental Item & Quantity
- Search and select a rental item
- System shows:
  - Available quantity
  - Rental price per period
  - Security deposit amount
- Enter `quantity_rented` (must be ≤ `quantity_available`)
- System auto-calculates:
  - `rent_per_period = item.rent_per_period × quantity_rented`
  - `total_rent_amount = rent_per_period × rental_period_length`
  - `security_deposit_amount = item.security_deposit_amount × quantity_rented`

#### Step 3: Rental Period
- Set `rental_start_date`
- Select `rental_period_type` (daily/weekly/monthly/custom)
- Enter `rental_period_length`
- System auto-calculates `rental_end_date`:
  - Daily: `start_date + (period_length - 1) days`
  - Weekly: `start_date + (period_length × 7 - 1) days`
  - Monthly: `start_date + period_length months - 1 day`
  - Custom: `start_date + (period_length - 1) days`

#### Step 4: Review & Confirm
- Review all details
- **Security Deposit Collection** (if deposit > 0):
  - Option to collect deposit immediately
  - Select payment account (cash or bank)
  - If collected, creates journal entry: DR Cash/Bank, CR Security Deposits

**Backend Processing** (when agreement is created):

1. **Generate Agreement Number**: `RENT-{YYYYMMDD}-{XXX}` (e.g., "RENT-20251213-001")

2. **Create Payment Schedule**:
   - One payment record per period
   - Due dates calculated based on period type:
     - Period 1: `rental_start_date`
     - Period 2: `rental_start_date + 1 period`
     - Period 3: `rental_start_date + 2 periods`
     - etc.
   - Each payment has `amount_due = rent_per_period`
   - Initial status: `unpaid`

3. **Decrease Available Quantity**:
   - `rental_item.quantity_available -= quantity_rented`

4. **Accounting Entries** (if configured):
   - **If security deposit collected**:
     - DR Cash/Bank Account (from `security_deposit_payment_account_id`)
     - CR Security Deposits (Liability)
   - **Accounts Receivable** (should be created but may be missing in backend):
     - DR Accounts Receivable
     - CR Rental Income (or deferred revenue)

**Frontend Code**: `app/rental/agreements/new/page.tsx`
- Multi-step form with validation
- Real-time calculations
- Account mapping validation
- Error handling with helpful messages

---

### 3. Recording Payments

**Location**: `/rental/agreements` → Click "Record Payment" button

**Process**:

1. **Select Payment Period**:
   - User selects from list of unpaid payment periods
   - System shows: period identifier, due date, amount due, current status

2. **Enter Payment Details**:
   - `amount_paid`: Amount received (typically equals `amount_due` for full payment)
   - `payment_date`: Date payment was received
   - `payment_method`: cash, bank_transfer, cheque, card, or other (optional)
   - `payment_account_id`: Which account received the payment (must be cash or bank account from mappings)
   - `notes`: Optional notes

3. **Validation**:
   - Payment account must be configured (rental_cash or rental_bank)
   - Accounts Receivable account must be configured
   - Payment account must exist and be valid

**Backend Processing** (when payment is recorded):

1. **Update Payment Record**:
   - `amount_paid = amount_paid + new_payment`
   - `payment_date = payment_date`
   - Recalculate `payment_status`:
     - `paid`: if `amount_paid >= amount_due`
     - `late`: if overdue (`due_date < today`) and not fully paid
     - `unpaid`: otherwise

2. **Update Agreement Status**:
   - `completed`: if all payments are `paid`
   - `overdue`: if any payment is `late`
   - `active`: otherwise

3. **Accounting Entries** (should be created):
   - DR Cash/Bank Account (from `payment_account_id`)
   - CR Accounts Receivable (reduction)
   - **Note**: Rental Income recognition may be missing in current backend implementation

**Frontend Code**: `app/components/Rentals/RentalAgreements/RecordPaymentModal.tsx`
- Fetches full agreement details to get payment records
- Validates account mappings before submission
- Shows helpful error messages if accounts not configured

---

### 4. Processing Returns

**Location**: `/rental/agreements` → Click "Return Rental" button

**Process**:

1. **Enter Return Details**:
   - `return_date`: Date item was returned
   - `return_condition`: returned_safely, damaged, or lost
   - `damage_charge_amount`: If damaged/lost, enter charge amount
   - `damage_description`: Description of damage (if applicable)
   - `refund_account_id`: Account to refund from (cash or bank)
   - `notes`: Optional notes

2. **Security Deposit Calculation**:
   - System auto-calculates: `security_deposit_refunded = security_deposit_amount - damage_charge_amount`
   - User can adjust if needed
   - `security_deposit_retained = damage_charge_amount`

3. **Validation**:
   - Refund account must be configured
   - Security deposits account must be configured
   - Rental income account must be configured

**Backend Processing** (when return is processed):

1. **Create Return Record**:
   - Store return details
   - Calculate refund amount

2. **Increase Available Quantity**:
   - `rental_item.quantity_available += quantity_rented`

3. **Update Agreement Status**:
   - `rental_status = "returned"`

4. **Accounting Entries** (should be created):
   - **DR Security Deposits** (full deposit amount - releases liability)
   - **CR Cash/Bank** (refund amount)
   - **CR Rental Income or Damage Income** (if damage charges > 0)

**Frontend Code**: `app/components/Rentals/RentalAgreements/ReturnRentalModal.tsx`
- Auto-calculates refund amount
- Validates account mappings
- Shows damage charge fields conditionally

---

## Payment Schedule Generation

Payment schedules are automatically generated when creating a rental agreement:

### Period Calculation:
- **Daily**: Each period = 1 day
- **Weekly**: Each period = 1 week (7 days)
- **Monthly**: Each period = 1 calendar month
- **Custom**: Assumes days (1 period = 1 day)

### Due Date Calculation:
- Period 1 due date = `rental_start_date`
- Period 2 due date = `rental_start_date + 1 period`
- Period 3 due date = `rental_start_date + 2 periods`
- etc.

### Amount Calculation:
- Each payment's `amount_due = rent_per_period`
- Last payment may have a small adjustment to account for rounding

**Example**:
- Start date: 2025-12-13
- Period type: monthly
- Period length: 3
- Rent per period: 33,333.33
- Payment schedule:
  - Period 1: Due 2025-12-13, Amount: 33,333.33
  - Period 2: Due 2026-01-13, Amount: 33,333.33
  - Period 3: Due 2026-02-13, Amount: 33,333.34 (rounding adjustment)

---

## Payment Status Logic

Payment status is automatically calculated:

### `paid`
- Condition: `amount_paid >= amount_due`
- All required amount has been received

### `late`
- Condition: Payment is overdue (`due_date < today`) AND not fully paid
- OR: Partial payment received after due date

### `unpaid`
- Condition: No payment received and not yet overdue
- Default status for new payments

### Agreement Status Updates:
- **`completed`**: All payments are `paid`
- **`overdue`**: At least one payment is `late`
- **`active`**: Otherwise (default)
- **`returned`**: Item has been returned

---

## Quantity Management

### When Agreement is Created:
- `rental_item.quantity_available -= quantity_rented`
- Prevents over-renting (validation checks available quantity)

### When Item is Returned:
- `rental_item.quantity_available += quantity_rented`
- Makes items available for new rentals

### Business Rules:
- Cannot create agreement if `quantity_available < quantity_rented`
- Cannot delete rental item if it has active agreements
- Cannot delete category if it has associated items

---

## Accounting Integration

### Account Mappings Required

The system uses account mappings to link rental operations to Chart of Accounts:

**Frontend Hook**: `app/components/Rentals/Shared/useRentalAccountMappings.ts`
- Loads all rental account mappings
- Provides helper functions: `getPaymentAccounts()`, `getRefundAccounts()`
- Checks configuration status: `isConfigured.cash`, `isConfigured.ar`, etc.

### Accounting Entries Created

#### 1. Agreement Creation
**When**: Security deposit is collected during agreement creation

**Entries**:
- DR Cash/Bank Account (from `security_deposit_payment_account_id`)
- CR Security Deposits (Liability)

**Status**: ✅ Frontend supports this, ⚠️ Backend implementation may be incomplete

#### 2. Payment Recording
**When**: Payment is received for a rental period

**Expected Entries**:
- DR Cash/Bank Account (from `payment_account_id`)
- CR Accounts Receivable (reduction)
- CR Rental Income (revenue recognition)

**Current Status**: ⚠️ May only create DR Cash/Bank, CR AR (missing income recognition)

#### 3. Return Processing
**When**: Item is returned

**Expected Entries**:
- DR Security Deposits (full deposit - releases liability)
- CR Cash/Bank (refund amount)
- CR Rental Income or Damage Income (if damage charges > 0)

**Status**: ⚠️ Backend implementation may be incomplete

### Account Mapping Validation

**Frontend Validation** (before operations):
- Agreement creation: Checks AR and Security Deposits accounts
- Payment recording: Checks Cash/Bank and AR accounts
- Return processing: Checks Security Deposits, Income, and Cash/Bank accounts

**Error Messages**: Clear, actionable messages directing users to Rental Settings

---

## Frontend Components

### Main Pages

1. **`app/rental/agreements/page.tsx`**
   - Lists all rental agreements
   - Filtering by status, customer, search
   - Actions: View Details, Record Payment, Return Rental

2. **`app/rental/agreements/new/page.tsx`**
   - Multi-step form for creating agreements
   - Real-time calculations
   - Account validation

3. **`app/rental/items/page.tsx`**
   - Lists all rental items
   - Create, edit, delete items

4. **`app/rental/categories/page.tsx`**
   - Lists all rental categories
   - Create, edit, delete categories

5. **`app/rental/settings/page.tsx`**
   - Configure account mappings
   - Required before using rental system

### Key Components

1. **`RentalAgreementsTable.tsx`**
   - Displays agreements in table format
   - Shows payment status, outstanding balance
   - Action buttons

2. **`RecordPaymentModal.tsx`**
   - Modal for recording payments
   - Payment period selection
   - Account selection from mappings

3. **`ReturnRentalModal.tsx`**
   - Modal for processing returns
   - Damage assessment
   - Refund calculation

4. **`RentalAgreementDetailModal.tsx`**
   - Shows full agreement details
   - Payment schedule
   - Payment history

5. **`useRentalAccountMappings.ts`**
   - Hook for loading account mappings
   - Helper functions for account selection
   - Configuration status checking

6. **`RentalAccountingStatusBanner.tsx`**
   - Shows warning if accounts not configured
   - Links to settings page

---

## API Endpoints

### Categories
- `GET /api/rentals/categories` - List categories
- `GET /api/rentals/categories/{id}` - Get category
- `POST /api/rentals/categories` - Create category
- `PATCH /api/rentals/categories/{id}` - Update category
- `DELETE /api/rentals/categories/{id}` - Delete category

### Items
- `GET /api/rentals/items` - List items
- `GET /api/rentals/items/{id}` - Get item
- `POST /api/rentals/items` - Create item
- `PATCH /api/rentals/items/{id}` - Update item
- `DELETE /api/rentals/items/{id}` - Delete item

### Agreements
- `GET /api/rentals/agreements` - List agreements
- `GET /api/rentals/agreements/{id}` - Get agreement
- `POST /api/rentals/agreements` - Create agreement
  - Body includes: `collect_security_deposit`, `security_deposit_payment_account_id`

### Payments
- `POST /api/rentals/agreements/{id}/payments` - Record payment
  - Body: `payment_id`, `amount_paid`, `payment_date`, `payment_account_id`, `payment_method`, `notes`

### Returns
- `POST /api/rentals/returns` - Process return
  - Body: `rental_agreement_id`, `return_date`, `return_condition`, `damage_charge_amount`, `security_deposit_refunded`, `refund_account_id`, `notes`

**API Client**: `app/lib/apiClient.ts` - `rentalApi` object

---

## Business Rules Summary

1. **Quantity Management**:
   - Available quantity decreases when agreement created
   - Available quantity increases when item returned
   - Cannot rent more than available

2. **Payment Schedule**:
   - Auto-generated based on period type and length
   - One payment per period
   - Due dates calculated from start date

3. **Payment Status**:
   - Auto-calculated based on due date and amount paid
   - Updates agreement status automatically

4. **Agreement Status**:
   - `active`: Default
   - `completed`: All payments paid
   - `overdue`: At least one payment late
   - `returned`: Item returned

5. **Security Deposit**:
   - Collected optionally when agreement created
   - Refunded when item returned (minus damage charges)
   - Damage charges retained as income

6. **SKU Generation**:
   - Format: `{category_serial_alias}-{6_digit_number}`
   - Auto-generated if not provided

7. **Rent Calculation**:
   - If `auto_divide_rent`: `rent_per_period = rental_price_total / rental_period_length`
   - Total rent: `rent_per_period × rental_period_length × quantity_rented`

---

## Known Issues & Backend Requirements

### Frontend Status: ✅ COMPLETE
All frontend issues have been resolved. The system has:
- Account mapping configuration UI
- Proper account selection using mappings
- Security deposit collection interface
- Accounting status indicators
- Improved error handling

### Backend Status: ⚠️ INCOMPLETE

**Critical Issues**:

1. **Account Mapping Types**: Backend `AccountMapping` model may not accept rental mapping types
2. **Security Deposit Collection**: API may not handle deposit collection during agreement creation
3. **Rental Income Recognition**: Missing when payments are recorded (should credit Rental Income)
4. **Return Accounting**: Accounting entries for returns may be incomplete
5. **Validation**: Missing validation for required account mappings before operations

**See**: `RENTAL-SYSTEM-ANALYSIS.md` for detailed backend requirements

---

## User Workflow Example

### Complete Rental Lifecycle

1. **Setup** (One-time):
   - Go to `/rental/settings`
   - Configure all required account mappings
   - Create rental categories
   - Create rental items

2. **Create Agreement**:
   - Go to `/rental/agreements/new`
   - Select customer
   - Select item and quantity
   - Set rental period
   - Optionally collect security deposit
   - Submit

3. **Record Payments** (as they come in):
   - Go to `/rental/agreements`
   - Find agreement
   - Click "Record Payment"
   - Select payment period
   - Enter amount and payment account
   - Submit

4. **Process Return** (when item returned):
   - Go to `/rental/agreements`
   - Find agreement
   - Click "Return Rental"
   - Enter return date and condition
   - Enter damage charges (if any)
   - Select refund account
   - Submit

---

## Key Files Reference

### Frontend
- **Pages**: `app/rental/*/page.tsx`
- **Components**: `app/components/Rentals/**/*.tsx`
- **Types**: `app/lib/types.ts` (lines 777-873)
- **API Client**: `app/lib/apiClient.ts` (rentalApi object)
- **Hooks**: `app/components/Rentals/**/use*.ts`

### Documentation
- **API Docs**: `rental-apis.md`
- **Analysis**: `RENTAL-SYSTEM-ANALYSIS.md`
- **This Guide**: `RENTAL-SYSTEM-COMPREHENSIVE-GUIDE.md`

---

## Summary

The rental system is a comprehensive solution for managing equipment/item rentals with:
- ✅ Complete frontend implementation
- ✅ Account mapping configuration
- ✅ Payment schedule management
- ✅ Return processing with damage assessment
- ⚠️ Backend accounting integration needs completion

The system follows standard accounting practices and integrates with the Chart of Accounts through account mappings, ensuring all rental transactions are properly recorded in the accounting system.

