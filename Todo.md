# Cheque Handling System Documentation

## Overview
The Cheque Handling System manages the lifecycle of cheque payments from initial receipt to final clearance or bouncing. It ensures that financial records (COA) and customer balances are updated only when funds are actually realized.

## Database Schema
### `customer_cheques` Table
Tracks individual cheque details.
- `id`: BIGINT (PK)
- `customer_payment_id`: BIGINT (FK -> customer_payments)
- `customer_id`: BIGINT (FK -> customers)
- `cheque_number`: VARCHAR(50)
- `bank_name`: VARCHAR(100)
- `cheque_date`: DATE
- `amount`: DECIMAL(15, 2)
- `status`: ENUM('pending', 'cleared', 'bounced', 'returned')
- `cleared_at`: DATETIME
- `bounced_at`: DATETIME
- `image_front_path`: VARCHAR(255)
- `image_back_path`: VARCHAR(255)

### `customer_payments` Table Updates
- `status`: ENUM('completed', 'pending_clearance', 'failed')
  - `completed`: Cash/Card/Bank Transfer or Cleared Cheque.
  - `pending_clearance`: Newly recorded cheque.
  - `failed`: Bounced cheque.

## Implemented APIs

### 1. Record Cheque Payment
**Endpoint:** `POST /api/customer-payments`

**Payload:**
```json
{
    "customer_id": 1,
    "payment_type": "invoice_payment", // or "advance_payment"
    "invoice_id": 101, // Required if invoice_payment
    "amount": 5000,
    "payment_method": "cheque",
    "cheque_number": "CHQ-123456",
    "bank_name": "HBL",
    "cheque_date": "2024-03-20",
    "image_front": (file), // Optional
    "image_back": (file)   // Optional
}
```

**Behavior:**
- Creates a `CustomerPayment` with status `pending_clearance`.
- Creates a `CustomerCheque` with status `pending`.
- **Does NOT** update invoice status (remains Unpaid/Partial).
- **Does NOT** create Journal Entries (no financial impact yet).
- **Does NOT** update Customer Balance (amount is still due).

**Response:**
```json
{
    "message": "Payment recorded successfully",
    "payment": { ... },
    "cheque": { ... }
}
```

### 2. Clear Cheque
**Endpoint:** `POST /api/cheques/{id}/clear`

**Payload:**
```json
{
    "deposit_account_id": 5, // Bank Account ID where funds were deposited
    "cleared_date": "2024-03-22"
}
```

**Behavior:**
- Updates `CustomerCheque` status to `cleared`.
- Updates `CustomerPayment` status to `completed` and sets `payment_account_id`.
- **For Invoice Payments:**
  - Updates Invoice status (Paid/Partial).
  - Creates Journal Entry: `Dr. Bank (deposit_account_id) / Cr. Accounts Receivable`.
  - Updates associated Sale status.
- **For Advance Payments:**
  - Creates Journal Entry: `Dr. Bank / Cr. Advance`.
  - Records "Received" transaction in `CustomerAdvance`.
  - Auto-applies advance to opening due and outstanding invoices.

**Response:**
```json
{
    "message": "Cheque cleared successfully.",
    "data": {
        "payment": { ... },
        "cheque": { ... },
        "journal_entries": [ ... ]
    }
}
```

### 3. Bounce Cheque
**Endpoint:** `POST /api/cheques/{id}/bounce`

**Payload:**
```json
{
    "notes": "Insufficient funds",
    "bounced_date": "2024-03-23" // Optional, defaults to now
}
```

**Behavior:**
- Updates `CustomerCheque` status to `bounced`.
- Updates `CustomerPayment` status to `failed`.
- Appends bounce reason to payment notes.
- **No Financial Impact:** Since the payment was never "completed", no reversal is needed. The invoice remains unpaid.

**Response:**
```json
{
    "message": "Cheque marked as bounced.",
    "data": {
        "payment": { ... },
        "cheque": { ... },
        "message": "Cheque marked as bounced."
    }
}
```

## Logic Flow Summary
- **Pending Stage:** Cheque is just a record. No accounting entries. Invoice is NOT paid.
- **Cleared Stage:** Money is realized. Accounting entries are made. Invoice is paid. Customer balance reduces.
- **Bounced Stage:** Payment failed. No accounting entries. Invoice remains unpaid. Customer balance unchanged.
