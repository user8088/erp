# Customer Invoice Payment Using Advance Balance - Backend Requirements

## Overview

The frontend now supports paying customer invoices using the customer's advance balance/credit. This document specifies the backend API requirements for implementing this feature.

## Feature Description

When recording an invoice payment, users can now choose to pay using the customer's existing advance balance instead of requiring a payment account. This allows customers to use their prepaid/advance credits to settle invoices.

## API Changes

### Update `POST /api/customers/{customer_id}/payments` Endpoint

#### Request Payload Updates

The endpoint should accept a new `use_advance` boolean field for invoice payments.

**Updated Request Payload Structure:**

```json
{
  "customer_id": number (required),
  "payment_type": "invoice_payment" | "advance_payment" | "refund" (required),
  "invoice_id": number (required if payment_type is "invoice_payment"),
  "amount": number (required, > 0),
  "payment_method": "cash" | "bank_transfer" | "cheque" | "card" | "other" (optional),
  "payment_account_id": number (required if use_advance is false or not provided),
  "use_advance": boolean (optional, default: false, only valid for invoice_payment),
  "payment_date": string (required, format: YYYY-MM-DD),
  "reference_number": string (optional),
  "notes": string (optional)
}
```

**Validation Rules:**

1. **Payment Mode Selection:**
   - If `use_advance` is `true`:
     - `payment_type` must be `"invoice_payment"`
     - `payment_account_id` is NOT required (should be ignored if provided)
     - `invoice_id` is required
   - If `use_advance` is `false` or not provided:
     - `payment_account_id` is required
     - Normal payment processing applies

2. **Advance Balance Validation:**
   - Customer must have sufficient advance balance
   - `amount` must be <= customer's available advance balance
   - If insufficient balance, return error: `"Insufficient advance balance. Available: PKR {balance}"`
   - Status: 422 Unprocessable Entity

3. **Invoice Validation:**
   - Invoice must exist and belong to the customer
   - Invoice must have outstanding balance >= `amount`
   - Invoice status must allow payment (e.g., not cancelled)

## Payment Processing Logic

### When `use_advance = true`:

1. **Validate Advance Balance:**
   - Check customer's current advance balance
   - Ensure `amount <= advance_balance`
   - Return error if insufficient

2. **Process Payment:**
   - Create payment record with:
     - `payment_type = "invoice_payment"`
     - `invoice_id` (from request)
     - `amount` (from request)
     - `payment_account_id = NULL` (no account needed)
     - `use_advance = true` (store this flag for tracking)
   - Update invoice:
     - Reduce invoice outstanding balance by `amount`
     - Update invoice status if fully paid
   - Update customer advance balance:
     - Reduce `customer.advance_balance` by `amount`
     - Create advance transaction record with `transaction_type = "used"`

3. **Accounting Entries:**
   - **Debit:** Accounts Receivable (Customer) - `amount`
   - **Credit:** Customer Advance (Liability Account) - `amount`
   - **Note:** No cash/bank account involved since advance is being used

### When `use_advance = false` (Normal Payment):

- Process as before:
  - Create payment record with `payment_account_id`
  - Update invoice outstanding balance
  - Create journal entry:
    - DR Cash/Bank Account (from `payment_account_id`)
    - CR Accounts Receivable (Customer)

## Database Schema Considerations

### Customer Payments Table

Ensure the `customer_payments` table supports the `use_advance` flag:

```sql
-- Add column if not exists
ALTER TABLE customer_payments 
ADD COLUMN use_advance BOOLEAN DEFAULT FALSE;

-- Add index for querying advance payments
CREATE INDEX idx_customer_payments_use_advance ON customer_payments(use_advance) WHERE use_advance = TRUE;
```

**Business Rules:**
- `use_advance` can only be `true` when `payment_type = 'invoice_payment'`
- When `use_advance = true`, `payment_account_id` should be `NULL`
- When `use_advance = false`, `payment_account_id` is required

### Customer Advance Transactions

Ensure advance transactions are properly tracked:

- When `use_advance = true`, create an advance transaction record:
  - `transaction_type = "used"`
  - `amount = payment amount`
  - `reference_type = "customer_payment"`
  - `reference_id = payment.id`
  - `description = "Used for invoice payment"`

## Response Updates

**Response Structure (unchanged):**

```json
{
  "payment": {
    "id": number,
    "customer_id": number,
    "payment_type": "invoice_payment",
    "invoice_id": number,
    "amount": number,
    "payment_method": string | null,
    "payment_account_id": number | null,
    "use_advance": boolean,
    "payment_date": "YYYY-MM-DD",
    "reference_number": string | null,
    "notes": string | null,
    "created_at": "YYYY-MM-DD HH:MM:SS",
    "updated_at": "YYYY-MM-DD HH:MM:SS"
  },
  "message": "Payment recorded successfully."
}
```

**Response Notes:**
- Include `use_advance` field in response
- If `use_advance = true`, `payment_account_id` will be `null`
- Include updated customer advance balance in response (optional but recommended)

## Error Handling

Return appropriate validation errors with clear messages:

1. **Insufficient Advance Balance:**
   - Error: `"Insufficient advance balance. Available: PKR {balance}"`
   - Status: 422 Unprocessable Entity

2. **Invalid Payment Type:**
   - Error: `"use_advance can only be used with invoice_payment"`
   - Status: 422 Unprocessable Entity

3. **Missing Invoice:**
   - Error: `"Invoice ID is required when use_advance is true"`
   - Status: 422 Unprocessable Entity

4. **Invalid Invoice:**
   - Error: `"Invoice not found or does not belong to this customer"`
   - Status: 404 Not Found or 422 Unprocessable Entity

## Accounting Integration

### Account Mappings Required

The system requires these account mappings:

| Mapping Type | Account Type | Required | Description |
|--------------|--------------|----------|-------------|
| `customer_advance` | Liability | Yes | Customer Advance/Credit Account |

### Journal Entry Creation

**When `use_advance = true`:**

```
Journal Entry:
  DR Accounts Receivable (Customer) - amount
  CR Customer Advance (Liability Account) - amount
```

**When `use_advance = false` (Normal Payment):**

```
Journal Entry:
  DR Cash/Bank Account (from payment_account_id) - amount
  CR Accounts Receivable (Customer) - amount
```

## Business Rules

1. **Advance Balance Calculation:**
   - Customer advance balance = Sum of all advance payments received - Sum of all advance used - Sum of all advance refunded
   - Must be recalculated after each payment using advance

2. **Payment Priority:**
   - Users can choose to use advance or regular payment
   - Cannot use both simultaneously (either advance OR payment account)

3. **Partial Payments:**
   - Can use partial advance balance if amount > available advance
   - User must pay remaining amount through regular payment account
   - **Note:** Frontend currently doesn't support split payments (advance + cash), but backend should be prepared for this

4. **Advance Transaction Tracking:**
   - Every use of advance must create a transaction record
   - Link transaction to the payment record
   - Maintain audit trail

## Testing Requirements

1. **Unit Tests:**
   - Advance balance validation
   - Payment processing with advance
   - Accounting entry creation
   - Advance transaction recording

2. **Integration Tests:**
   - Full payment flow using advance
   - Insufficient balance handling
   - Multiple payments using advance
   - Advance balance updates

3. **API Tests:**
   - Valid payment with `use_advance = true`
   - Invalid payment (insufficient balance)
   - Invalid payment type with `use_advance = true`
   - Missing invoice with `use_advance = true`

## Example Request/Response

### Example Request (Using Advance)

```json
POST /api/customers/123/payments
{
  "customer_id": 123,
  "payment_type": "invoice_payment",
  "invoice_id": 456,
  "amount": 5000.00,
  "use_advance": true,
  "payment_date": "2025-01-15",
  "notes": "Paid using customer advance balance"
}
```

### Example Response

```json
{
  "payment": {
    "id": 789,
    "customer_id": 123,
    "payment_type": "invoice_payment",
    "invoice_id": 456,
    "amount": 5000.00,
    "payment_method": null,
    "payment_account_id": null,
    "use_advance": true,
    "payment_date": "2025-01-15",
    "reference_number": null,
    "notes": "Paid using customer advance balance",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "customer": {
    "advance_balance": 3000.00
  },
  "message": "Payment recorded successfully using customer advance."
}
```

## Important Notes

### Authentication & CORS

**CRITICAL:** The endpoint should:
- **NOT redirect** unauthenticated requests to `/login` (this causes CORS errors in the frontend)
- Return HTTP status codes instead:
  - `401 Unauthorized` if the user is not authenticated
  - `403 Forbidden` if the user doesn't have permission
- Include proper CORS headers in the response (especially `Access-Control-Allow-Origin`)
- Accept Bearer token authentication via `Authorization: Bearer {token}` header

### Backward Compatibility

- The endpoint must maintain backward compatibility
- If `use_advance` is not provided or `false`, process as normal payment
- Existing payment records without `use_advance` field should default to `false`

### Chart of Accounts Integration

- Customer advance must be tracked as a liability account
- All advance transactions must be properly recorded
- Journal entries must follow double-entry bookkeeping principles

---

## Advance Payment Auto-Apply to Outstanding Invoices

### Overview

When recording an `advance_payment`, the system should automatically check for outstanding invoices and apply the advance amount to pay them first. Only the remaining amount (after paying invoices) should be added to the customer's advance balance.

### Problem Statement

**Current Issue:** When advance payment is recorded and there are outstanding invoices:
- Backend automatically applies advance to invoices (correct behavior)
- However, remaining advance balance is not calculated correctly
- Example: Adding 3300 advance that clears a 1700 invoice should show 1600 remaining, but currently shows 3300
- Users have no visibility into what happened (which invoices were paid, how much was applied)

### Payment Processing Logic for Advance Payments

#### When `payment_type = "advance_payment"`:

**New Behavior:**

1. **Auto-Apply to Outstanding Invoices:**
   - When advance payment is recorded, automatically check for outstanding invoices
   - Get all outstanding invoices for the customer (ordered by invoice_date ASC or due_date ASC)
   - Apply advance amount to pay invoices sequentially until advance is exhausted or all invoices are paid
   - Only the remaining amount (after paying invoices) should be added to advance balance

2. **Payment Processing Algorithm:**
   ```
   Input: Advance Amount = 3300
   Outstanding Invoices:
     - Invoice #001: 1700 (due)
     - Invoice #002: 500 (due)
   
   Process:
   1. Apply 1700 to Invoice #001 (fully paid)
      - Advance remaining = 3300 - 1700 = 1600
   2. Apply 500 to Invoice #002 (fully paid)
      - Advance remaining = 1600 - 500 = 1100
   3. Remaining advance = 1100
   4. Add 1100 to customer advance balance
   5. Create payment records for each invoice paid (using advance)
   6. Create advance transaction for remaining amount
   ```

3. **Create Multiple Payment Records:**
   - For each invoice paid: Create a payment record with:
     - `payment_type = "invoice_payment"`
     - `invoice_id = {invoice_id}`
     - `amount = {amount_applied_to_invoice}`
     - `use_advance = true`
     - `payment_account_id = NULL`
     - `payment_date = {advance_payment_date}`
     - `payment_method = {from_advance_payment}`
     - `reference_number = {from_advance_payment}`
     - `notes = "Auto-applied from advance payment" or {from_advance_payment}`
   - For remaining advance: Create advance transaction with:
     - `transaction_type = "received"`
     - `amount = {remaining_advance_amount}`
     - `reference_type = "customer_payment"`
     - `reference_id = {advance_payment.id}`
     - `description = "Advance payment (remaining after invoice payments)"`

4. **Invoice Payment Logic:**
   - For each invoice:
     - If `advance_remaining >= invoice_due_amount`:
       - Pay full invoice: `amount_applied = invoice_due_amount`
       - Update invoice: `outstanding_balance = 0`, `status = "paid"`
       - Advance remaining = advance_remaining - invoice_due_amount
     - If `advance_remaining < invoice_due_amount`:
       - Pay partial invoice: `amount_applied = advance_remaining`
       - Update invoice: `outstanding_balance = invoice_due_amount - advance_remaining`, `status = "partially_paid"`
       - Advance remaining = 0

5. **Accounting Entries:**
   - For each invoice paid (using advance):
     - DR Accounts Receivable (Customer) - amount applied
     - CR Customer Advance (Liability Account) - amount applied
   - For remaining advance:
     - DR Cash/Bank Account (from `payment_account_id` of advance payment) - remaining amount
     - CR Customer Advance (Liability Account) - remaining amount

### Updated Response Structure for Advance Payments

**When `payment_type = "advance_payment"`:**

```json
{
  "payment": {
    "id": number,
    "customer_id": number,
    "payment_type": "advance_payment",
    "amount": number,
    "payment_method": string,
    "payment_account_id": number,
    "payment_date": "YYYY-MM-DD",
    "reference_number": string | null,
    "notes": string | null,
    "created_at": "YYYY-MM-DD HH:MM:SS",
    "updated_at": "YYYY-MM-DD HH:MM:SS"
  },
  "auto_applied_payments": [
    {
      "id": number,
      "invoice_id": number,
      "invoice_number": string,
      "amount_applied": number,
      "invoice_status_after": "paid" | "partially_paid",
      "remaining_invoice_balance": number
    }
  ],
  "advance_summary": {
    "total_advance_received": number,
    "amount_applied_to_invoices": number,
    "remaining_advance_balance": number,
    "customer_new_advance_balance": number
  },
  "message": "Advance payment recorded. Applied PKR {amount} to {count} invoice(s). Remaining balance: PKR {remaining}"
}
```

**Response Fields:**

- `auto_applied_payments`: Array of payment records created for invoices paid using advance
  - Only included if invoices were paid
  - Empty array if no outstanding invoices or advance was insufficient
- `advance_summary`: Summary of advance application
  - `total_advance_received`: Original advance payment amount
  - `amount_applied_to_invoices`: Sum of all amounts applied to invoices
  - `remaining_advance_balance`: Amount added to customer advance balance
  - `customer_new_advance_balance`: Customer's new total advance balance after this transaction

### Business Rules

1. **Invoice Priority:**
   - Apply advance to invoices in order: oldest first (by `invoice_date` ASC)
   - Or by due date if available (earliest due date first)
   - Continue until advance is exhausted or all invoices are paid

2. **Advance Balance Calculation:**
   - Customer advance balance = Previous balance + Remaining advance (after invoice payments)
   - Remaining advance = Total advance received - Sum of all invoice payments
   - Must be recalculated accurately after each advance payment

3. **Payment Records:**
   - Each invoice payment using advance creates a separate payment record
   - All payment records should be linked to the original advance payment (via notes or reference)
   - Maintain audit trail of which advance payment paid which invoices

4. **Partial Invoice Payments:**
   - If advance is insufficient to pay an invoice fully, pay partial amount
   - Invoice status should be updated to "partially_paid"
   - Remaining invoice balance should be tracked correctly

5. **No Outstanding Invoices:**
   - If no outstanding invoices exist, entire advance amount goes to advance balance
   - `auto_applied_payments` will be empty array
   - `amount_applied_to_invoices` will be 0

### Database Considerations

- Ensure all payment records are created in a single transaction
- Update invoice statuses atomically
- Recalculate customer advance balance correctly
- Maintain referential integrity between payments and invoices
- Track which payments were auto-applied vs manually created

### Error Handling

1. **No Outstanding Invoices:**
   - Process normally: Add entire amount to advance balance
   - Return response with empty `auto_applied_payments` array
   - Status: 200 OK

2. **Insufficient Advance for All Invoices:**
   - Apply advance to invoices until exhausted
   - Pay partial amount to last invoice if needed
   - Add 0 to advance balance (all used)
   - Return response with details of what was paid

3. **Database Transaction Failure:**
   - Rollback all changes if any part fails
   - Return error: `"Failed to process advance payment. Please try again."`
   - Status: 500 Internal Server Error

### Example Request/Response

#### Example Request (Advance Payment with Outstanding Invoices)

```json
POST /api/customers/123/payments
{
  "customer_id": 123,
  "payment_type": "advance_payment",
  "amount": 3300.00,
  "payment_method": "cash",
  "payment_account_id": 5,
  "payment_date": "2025-01-15",
  "notes": "Customer advance payment"
}
```

#### Example Response (With Auto-Applied Payments)

```json
{
  "payment": {
    "id": 789,
    "customer_id": 123,
    "payment_type": "advance_payment",
    "amount": 3300.00,
    "payment_method": "cash",
    "payment_account_id": 5,
    "payment_date": "2025-01-15",
    "reference_number": null,
    "notes": "Customer advance payment",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "auto_applied_payments": [
    {
      "id": 790,
      "invoice_id": 456,
      "invoice_number": "INV-20250110-001",
      "amount_applied": 1700.00,
      "invoice_status_after": "paid",
      "remaining_invoice_balance": 0.00
    }
  ],
  "advance_summary": {
    "total_advance_received": 3300.00,
    "amount_applied_to_invoices": 1700.00,
    "remaining_advance_balance": 1600.00,
    "customer_new_advance_balance": 1600.00
  },
  "message": "Advance payment recorded. Applied PKR 1,700.00 to 1 invoice(s). Remaining balance: PKR 1,600.00"
}
```

#### Example Response (No Outstanding Invoices)

```json
{
  "payment": {
    "id": 791,
    "customer_id": 123,
    "payment_type": "advance_payment",
    "amount": 5000.00,
    "payment_method": "bank_transfer",
    "payment_account_id": 8,
    "payment_date": "2025-01-15",
    "reference_number": "TXN-12345",
    "notes": "Customer advance payment",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "auto_applied_payments": [],
  "advance_summary": {
    "total_advance_received": 5000.00,
    "amount_applied_to_invoices": 0.00,
    "remaining_advance_balance": 5000.00,
    "customer_new_advance_balance": 5000.00
  },
  "message": "Advance payment recorded. No outstanding invoices. Added PKR 5,000.00 to advance balance."
}
```

#### Example Response (Multiple Invoices Paid)

```json
{
  "payment": {
    "id": 792,
    "customer_id": 123,
    "payment_type": "advance_payment",
    "amount": 5000.00,
    "payment_method": "cash",
    "payment_account_id": 5,
    "payment_date": "2025-01-15",
    "reference_number": null,
    "notes": "Customer advance payment",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "auto_applied_payments": [
    {
      "id": 793,
      "invoice_id": 456,
      "invoice_number": "INV-20250110-001",
      "amount_applied": 1700.00,
      "invoice_status_after": "paid",
      "remaining_invoice_balance": 0.00
    },
    {
      "id": 794,
      "invoice_id": 457,
      "invoice_number": "INV-20250112-002",
      "amount_applied": 500.00,
      "invoice_status_after": "paid",
      "remaining_invoice_balance": 0.00
    },
    {
      "id": 795,
      "invoice_id": 458,
      "invoice_number": "INV-20250114-003",
      "amount_applied": 2000.00,
      "invoice_status_after": "partially_paid",
      "remaining_invoice_balance": 500.00
    }
  ],
  "advance_summary": {
    "total_advance_received": 5000.00,
    "amount_applied_to_invoices": 4200.00,
    "remaining_advance_balance": 800.00,
    "customer_new_advance_balance": 800.00
  },
  "message": "Advance payment recorded. Applied PKR 4,200.00 to 3 invoice(s). Remaining balance: PKR 800.00"
}
```

### Testing Scenarios

1. **Advance payment with no outstanding invoices:**
   - All amount goes to advance balance
   - `auto_applied_payments` is empty array
   - `amount_applied_to_invoices` is 0

2. **Advance payment that fully pays one invoice:**
   - Invoice is fully paid
   - Remaining advance goes to advance balance
   - `auto_applied_payments` contains one entry

3. **Advance payment that partially pays invoice:**
   - Invoice is partially paid
   - No remaining advance (all used)
   - `remaining_advance_balance` is 0

4. **Advance payment that pays multiple invoices:**
   - All invoices paid (fully or partially)
   - Remaining advance goes to advance balance
   - `auto_applied_payments` contains multiple entries

5. **Advance payment larger than all invoices:**
   - All invoices fully paid
   - Large remaining advance balance
   - Verify correct calculation

### Important Notes

- All operations must be atomic (use database transactions)
- Invoice status updates must be accurate
- Customer advance balance must be recalculated correctly
- Payment records must be properly linked and auditable
- Response must provide clear visibility into what happened

---

## Advance Transaction Details Enhancement

### Overview

The frontend now displays detailed information about advance transactions, including which invoices were paid and what items were purchased. The backend must ensure that advance transaction responses include all necessary related data.

### API Response Requirements

#### `GET /api/customers/{customer_id}/payment-summary` Endpoint

**Updated Response Structure:**

The `advance_transactions` array in the payment summary response must include full details:

```json
{
  "payment_summary": {
    "advance_transactions": [
      {
        "id": number,
        "customer_id": number,
        "payment_id": number | null,
        "payment": {
          "id": number,
          "payment_type": "invoice_payment" | "advance_payment" | "refund",
          "invoice_id": number | null,
          "invoice": {
            "id": number,
            "invoice_number": string,
            "sale": {
              "id": number,
              "sale_type": "walk-in" | "delivery",
              "items": [
                {
                  "id": number,
                  "item_name": string,
                  "quantity": number,
                  "unit_price": number,
                  "total_price": number
                }
              ]
            }
          } | null
        } | null,
        "sale_id": number | null,
        "sale": {
          "id": number,
          "sale_type": "walk-in" | "delivery",
          "items": [
            {
              "id": number,
              "item_name": string,
              "quantity": number,
              "unit_price": number,
              "total_price": number
            }
          ]
        } | null,
        "amount": number,
        "balance": number,
        "transaction_type": "received" | "used" | "refunded",
        "reference": string | null,
        "transaction_date": "YYYY-MM-DD",
        "notes": string | null,
        "created_at": "YYYY-MM-DD HH:MM:SS",
        "updated_at": "YYYY-MM-DD HH:MM:SS"
      }
    ]
  }
}
```

### Backend Requirements

1. **Include Related Data:**
   - When returning `advance_transactions`, include:
     - `payment` object with full details (if `payment_id` exists)
     - `payment.invoice` object with invoice details (if `invoice_id` exists)
     - `payment.invoice.sale` object with sale details (if sale exists)
     - `sale` object with full details (if `sale_id` exists directly on transaction)
     - `sale.items` array with item details

2. **Transaction Description:**
   - For "used" transactions: Include invoice number and sale items in `notes` or ensure invoice/sale data is available
   - For "received" transactions: Include payment method and reference if available
   - For "refunded" transactions: Include refund reason if available

3. **Performance Considerations:**
   - Use efficient joins/selects to avoid N+1 queries
   - Consider caching if transaction data doesn't change frequently
   - Limit the number of transactions returned (e.g., last 10-20 transactions)

### Frontend Display Logic

The frontend will display:

- **For "Used" transactions:**
  - Transaction type: "Used"
  - Invoice number badge (if invoice exists)
  - Description: "Used to pay Invoice #{invoice_number} - {item descriptions}"
  - Example: "Used to pay Invoice #INV-001 - 1 bag fauji cement, 2 bags portland cement"

- **For "Received" transactions:**
  - Transaction type: "Received"
  - Description: "Advance payment received" or custom notes
  - Payment method and reference if available

- **For "Refunded" transactions:**
  - Transaction type: "Refunded"
  - Description: "Advance refunded" or custom notes

### Example Response

```json
{
  "payment_summary": {
    "advance_transactions": [
      {
        "id": 123,
        "customer_id": 456,
        "payment_id": 789,
        "payment": {
          "id": 789,
          "payment_type": "invoice_payment",
          "invoice_id": 101,
          "invoice": {
            "id": 101,
            "invoice_number": "INV-20250115-001",
            "sale": {
              "id": 202,
              "sale_type": "delivery",
              "items": [
                {
                  "id": 301,
                  "item_name": "fauji cement",
                  "quantity": 1,
                  "unit_price": 1700.00,
                  "total_price": 1700.00
                }
              ]
            }
          }
        },
        "amount": -1700.00,
        "balance": 1600.00,
        "transaction_type": "used",
        "reference": null,
        "transaction_date": "2025-01-15",
        "notes": "Used for invoice payment",
        "created_at": "2025-01-15T10:30:00Z",
        "updated_at": "2025-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Database Considerations

- Ensure foreign key relationships are properly maintained:
  - `advance_transactions.payment_id` → `customer_payments.id`
  - `customer_payments.invoice_id` → `invoices.id`
  - `invoices.sale_id` → `sales.id`
  - `sales.id` → `sale_items.sale_id`

- Use proper JOIN queries to fetch all related data in a single query
- Consider adding indexes on foreign key columns for performance

---

## Advance Transactions Download Feature

### Overview

Users need to download a PDF record of all advance transactions for a customer, showing when advance was paid by the customer and when it was used.

### API Endpoint

#### `GET /api/customers/{customer_id}/advance-transactions/download`

**Purpose:**
Generate and download a PDF document containing all advance transactions for a specific customer.

**Request:**
- Method: `GET`
- Path: `/api/customers/{customer_id}/advance-transactions/download`
- Headers:
  - `Authorization: Bearer {token}` (required)
  - `Accept: application/pdf`

**Response:**
- Content-Type: `application/pdf`
- Body: PDF file binary data
- Filename suggestion: `advance-transactions-{customer_serial_number}-{date}.pdf`

### PDF Document Requirements

#### Document Structure

1. **Header Section:**
   - Company/Business name and logo (if available)
   - Document title: "Advance Transactions Record"
   - Customer information:
     - Customer name
     - Customer serial number
     - Customer contact (phone, email if available)
   - Generated date and time
   - Report period (if applicable)

2. **Summary Section:**
   - Total advance received (sum of all "received" transactions)
   - Total advance used (sum of all "used" transactions)
   - Total advance refunded (sum of all "refunded" transactions)
   - Current advance balance
   - Number of transactions

3. **Transactions Table:**
   - Columns:
     - **Date**: Transaction date (formatted: DD/MM/YYYY or DD MMM YYYY)
     - **Type**: "Received", "Used", or "Refunded"
     - **Description**: 
       - For "Received": "Advance payment received" + payment method + reference number (if available)
       - For "Used": "Used to pay Invoice #{invoice_number}" + item descriptions (if available)
       - For "Refunded": "Advance refunded" + reason (if available)
     - **Amount**: Transaction amount (with + or - sign, formatted as currency)
     - **Balance**: Running balance after transaction
     - **Reference**: Invoice number (for "Used"), Payment reference (for "Received")

4. **Transaction Details (for "Used" transactions):**
   - Invoice number
   - Invoice date
   - Items purchased (if available):
     - Item name
     - Quantity and unit
     - Unit price
     - Total price

5. **Footer Section:**
   - Page numbers (if multiple pages)
   - Generated by: User name
   - Notes: Any additional information

### Data Requirements

The endpoint should return all advance transactions for the customer, including:

- All transaction fields (id, amount, balance, transaction_type, transaction_date, notes, reference)
- Payment details (if payment_id exists):
  - Payment method
  - Payment account
  - Reference number
  - Payment date
- Invoice details (if invoice_id exists):
  - Invoice number
  - Invoice date
  - Invoice amount
  - Sale details (if available):
    - Sale items with names, quantities, units, prices
    - Sale type (walk-in/delivery)

### PDF Formatting Requirements

1. **Layout:**
   - Professional business document format
   - Clear sections with proper spacing
   - Table with borders and alternating row colors for readability
   - Proper page breaks if content exceeds one page

2. **Styling:**
   - Company branding (logo, colors) if available
   - Clear typography (readable fonts, appropriate sizes)
   - Color coding:
     - Green for "Received" transactions
     - Red for "Used" transactions
     - Blue for "Refunded" transactions

3. **Currency Formatting:**
   - All amounts in PKR (Pakistani Rupees)
   - Format: `PKR 1,234.56`
   - Use thousand separators
   - Two decimal places

4. **Date Formatting:**
   - Consistent date format throughout
   - Example: "15 Jan 2025" or "15/01/2025"

### Example PDF Content Structure

```
┌─────────────────────────────────────────────────────────┐
│ [Company Logo]                                          │
│                                                         │
│ ADVANCE TRANSACTIONS RECORD                            │
│                                                         │
│ Customer: John Doe                                      │
│ Serial Number: CUST-20250101-001                       │
│ Phone: +92 300 1234567                                  │
│                                                         │
│ Generated: 15 Jan 2025, 10:30 AM                       │
└─────────────────────────────────────────────────────────┘

SUMMARY
─────────────────────────────────────────────────────────
Total Advance Received:    PKR 10,000.00
Total Advance Used:        PKR 7,000.00
Total Advance Refunded:    PKR 0.00
Current Advance Balance:  PKR 3,000.00
Total Transactions:       5

TRANSACTIONS
─────────────────────────────────────────────────────────
Date       Type      Description                    Amount        Balance
─────────────────────────────────────────────────────────────────────────
15/01/2025 Received  Advance payment received        +PKR 5,000.00  PKR 5,000.00
           (Cash)
           
10/01/2025 Used      Used to pay Invoice #INV-001  -PKR 1,700.00  PKR 3,300.00
                     - 1 bag fauji cement
                     
05/01/2025 Received  Advance payment received      +PKR 5,000.00  PKR 5,000.00
           (Bank Transfer, Ref: TXN-12345)
           
02/01/2025 Used      Used to pay Invoice #INV-002  -PKR 2,500.00  PKR 2,500.00
                     - 2 bags portland cement
                     
01/01/2025 Used      Used to pay Invoice #INV-003  -PKR 2,800.00  PKR 2,800.00
                     - 1 bag fauji cement, 1 bag
                       portland cement
```

### Backend Implementation Notes

1. **Data Fetching:**
   - Fetch all advance transactions for the customer
   - Include related payment, invoice, and sale data
   - Order by transaction_date DESC (newest first) or ASC (oldest first)
   - No pagination needed (all transactions should be included)

2. **PDF Generation:**
   - Use a PDF library (e.g., PDFKit, ReportLab, iText, etc.)
   - Ensure proper encoding for special characters
   - Handle long descriptions with text wrapping
   - Support multiple pages if needed

3. **Performance:**
   - Consider caching if transactions don't change frequently
   - Optimize database queries to avoid N+1 problems
   - Stream PDF generation for large datasets

4. **Error Handling:**
   - Return 404 if customer not found
   - Return 401 if user not authenticated
   - Return 403 if user doesn't have permission
   - Return 500 with error message if PDF generation fails

### Authentication & Authorization

- User must be authenticated
- User must have permission to view customer payment information
- User must have permission to download reports/documents

### Example Request/Response

**Request:**
```
GET /api/customers/123/advance-transactions/download
Authorization: Bearer {token}
Accept: application/pdf
```

**Response:**
```
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="advance-transactions-CUST-20250101-001-2025-01-15.pdf"

[PDF Binary Data]
```

### Testing Requirements

1. **Unit Tests:**
   - PDF generation with various transaction counts
   - PDF generation with missing data (no invoices, no sales)
   - Currency formatting
   - Date formatting
   - Text wrapping for long descriptions

2. **Integration Tests:**
   - Full download flow
   - Authentication/authorization checks
   - Error handling
   - File download verification

3. **Manual Tests:**
   - Download PDF and verify content accuracy
   - Verify formatting and layout
   - Test with customers having many transactions
   - Test with customers having no transactions
   - Verify filename format

---

# Purchase Order Delivery Charge - Backend Implementation Tasks

## Overview

The frontend now supports adding delivery charges when receiving purchase orders. Delivery charges increase the amount owed to the supplier (unlike "other costs" which reduce the amount owed). This section lists the backend implementation tasks required.

## Backend Tasks

### 1. Database Migration

- [ ] Create migration to add `delivery_charge` column to `purchase_orders` table
  - Column: `delivery_charge DECIMAL(15, 2) DEFAULT 0.00`
  - Position: After `other_costs_total`
  - Add comment: "Delivery charge from supplier (increases amount owed)"
  - Include rollback in `down()` method

### 2. API Endpoint Updates

- [ ] Update `POST /api/purchase-orders/{id}/receive` endpoint
  - [ ] Accept `delivery_charge` in request payload (optional, numeric, min:0)
  - [ ] Handle `delivery_charge` in both JSON and FormData requests
  - [ ] Validate `delivery_charge >= 0`
  - [ ] Default `delivery_charge` to 0.00 if not provided
  - [ ] Include `delivery_charge` in response

### 3. Business Logic Updates

- [ ] Update final total calculation
  - [ ] Formula: `final_total = items_subtotal - other_costs_total + delivery_charge`
  - [ ] Save `delivery_charge` to `purchase_orders.delivery_charge`
  - [ ] Update `purchase_orders.final_total` with new calculation
  - [ ] Ensure backward compatibility (handle NULL delivery_charge as 0.00)

### 4. Supplier Invoice Creation

- [ ] Include delivery charge in supplier invoice
  - [ ] Add `delivery_charge` to invoice metadata
  - [ ] Include delivery charge as separate line item in invoice
  - [ ] Update invoice `total_amount` to include delivery charge
  - [ ] Show clear breakdown: items_subtotal - other_costs + delivery_charge = final_total

### 5. Accounting/Journal Entries

- [ ] Update journal entry creation
  - [ ] Include delivery charge in Accounts Payable calculation
  - [ ] Credit Accounts Payable: `items_subtotal - other_costs_total + delivery_charge`
  - [ ] Verify delivery charge doesn't affect inventory or expense accounts
  - [ ] Update journal entry description if needed

### 6. Testing

- [ ] Unit tests
  - [ ] Test delivery charge = 0 (backward compatibility)
  - [ ] Test delivery charge > 0
  - [ ] Test delivery charge with other costs
  - [ ] Test final_total calculation
  - [ ] Test validation (negative values should fail)
  
- [ ] Integration tests
  - [ ] Full receiving flow with delivery charge
  - [ ] Delivery charge with FormData (file upload)
  - [ ] Delivery charge with JSON (no file upload)
  - [ ] Supplier invoice creation with delivery charge
  - [ ] Accounting entries with delivery charge

- [ ] Manual tests
  - [ ] Receive stock with delivery charge
  - [ ] Verify delivery charge increases final_total
  - [ ] Verify delivery charge in supplier invoice
  - [ ] Verify accounting entries are correct

### 7. Documentation

- [ ] Update API documentation with delivery_charge field
- [ ] Update database schema documentation
- [ ] Document calculation formula in code comments

## Reference

See `docs/PURCHASE-ORDER-DELIVERY-CHARGE-BACKEND-REQUIREMENTS.md` for detailed requirements and specifications.