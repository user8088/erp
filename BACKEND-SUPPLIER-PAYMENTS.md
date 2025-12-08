# Supplier Payment Management API Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Feature Summary](#feature-summary)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Workflows](#workflows)
6. [Error Handling](#error-handling)
7. [Frontend Integration Guide](#frontend-integration-guide)

---

## Overview

### Purpose

This feature allows businesses to record payments made to suppliers for received goods. The system automatically creates journal entries that:
- **Reduce Accounts Payable** (Liability decreases)
- **Reduce Cash/Bank/Payment Account** (Asset decreases)

### Accounting Flow

```
┌──────────────────────┐
│ 1. Receive Stock     │ → Journal Entry Created
│    (from PO)         │    DR Inventory ↑
│                      │    CR Accounts Payable ↑
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 2. Supplier Sends    │ → No Accounting Entry
│    Invoice           │    (Optional documentation)
│    (Optional)        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ 3. Make Payment      │ → ✅ Journal Entry Created
│    to Supplier       │    DR Accounts Payable ↓
│                      │    CR Cash/Bank ↓
└──────────────────────┘
```

### Key Features

✅ **Flexible Payment Sources**: Cash, Bank, JazzCash, EasyPaisa, or any Asset account  
✅ **Optional Invoice Tracking**: Link payments to supplier invoices  
✅ **Automatic Journal Entries**: Reduces liability and cash/bank balances  
✅ **Partial Payments**: Pay full amount or partial with tracking  
✅ **Outstanding Balance Tracking**: Real-time calculation of what's owed  
✅ **Payment History**: Complete audit trail of all payments  
✅ **Auto-Detection**: System can suggest appropriate payment accounts  

---

## Feature Summary

### What's New

✅ **Supplier Payments Module**: Record payments made to suppliers  
✅ **Outstanding Balance Calculation**: Automatic tracking of supplier balances  
✅ **Payment Account Auto-Detection**: Smart suggestions for payment accounts  
✅ **Journal Entry Integration**: Automatic accounting when payments are made  
✅ **Payment History**: View all payments made to each supplier  

### Benefits

- **Automated Accounting**: Journal entries created automatically
- **Real-time Balances**: Always know what you owe suppliers
- **Complete Audit Trail**: Track every payment with full details
- **Flexible Payment Methods**: Support for cash, bank, and digital wallets
- **Validation**: Prevents overpayment and ensures proper accounting

---

## Database Schema

### New Table: `supplier_payments`

Records all payments made to suppliers.

```sql
CREATE TABLE supplier_payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE NOT NULL, -- PAY-YYYYMMDD-XXX
    supplier_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_account_id BIGINT UNSIGNED NOT NULL, -- Cash, Bank, etc.
    invoice_number VARCHAR(100) NULL, -- Supplier's invoice (optional)
    notes TEXT NULL,
    journal_entry_id BIGINT UNSIGNED NULL, -- Link to journal entry
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (payment_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),

    INDEX idx_supplier_payment_date (supplier_id, payment_date),
    INDEX idx_payment_number (payment_number)
);
```

**Key Points:**
- `payment_number` is auto-generated: `PAY-YYYYMMDD-XXX`
- `payment_account_id` must be an Asset account (Cash, Bank, etc.)
- `invoice_number` is optional
- Each payment creates a journal entry automatically

### Updated Table: `suppliers`

Added optional field for caching outstanding balance.

```sql
ALTER TABLE suppliers
ADD COLUMN outstanding_balance DECIMAL(12, 2) DEFAULT 0 AFTER notes;
ADD INDEX idx_outstanding_balance (outstanding_balance);
```

**Note:** This is a cached/computed field. Balance can also be calculated dynamically:
```
Outstanding Balance = (Total Received from POs) - (Total Payments Made)
```

---

## API Endpoints

### 1. Get Supplier Payment History

**Endpoint:** `GET /api/suppliers/{supplierId}/payments`

**Auth Required:** Yes

**Description:** Get all payments made to a specific supplier with pagination and filters.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Page number |
| `per_page` | integer | No | 15 | Items per page (max 100) |
| `from_date` | date | No | - | Filter from date (YYYY-MM-DD) |
| `to_date` | date | No | - | Filter to date (YYYY-MM-DD) |
| `sort_by` | string | No | payment_date | Sort field |
| `sort_order` | string | No | desc | `asc` or `desc` |

**Example Request:**

```bash
GET /api/suppliers/2/payments?from_date=2025-12-01&per_page=20
Authorization: Bearer {token}
```

**Response (200 OK):**

```json
{
  "payments": [
    {
      "id": 1,
      "payment_number": "PAY-20251208-001",
      "supplier_id": 2,
      "supplier": {
        "id": 2,
        "name": "Alpha Supplier",
        "serial_number": "SUPP-20251201-001"
      },
      "amount": "50000.00",
      "payment_date": "2025-12-08",
      "payment_account_id": 8,
      "payment_account": {
        "id": 8,
        "number": "1110",
        "name": "Cash in Hand",
        "root_type": "asset"
      },
      "invoice_number": "INV-2025-001",
      "notes": "Partial payment for PO-20251208-001",
      "journal_entry_id": 55,
      "journal_entry": {
        "id": 55,
        "date": "2025-12-08",
        "voucher_type": "supplier_payment",
        "reference_number": "PAY-20251208-001"
      },
      "created_by": 1,
      "creator": {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe"
      },
      "created_at": "2025-12-08T14:30:00.000000Z",
      "updated_at": "2025-12-08T14:30:00.000000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 15,
    "total": 1,
    "last_page": 1
  },
  "summary": {
    "total_paid": "50000.00",
    "total_received": "105000.00",
    "outstanding_balance": "55000.00"
  }
}
```

---

### 2. Create Supplier Payment

**Endpoint:** `POST /api/suppliers/{supplierId}/payments`

**Auth Required:** Yes

**Description:** Record a payment made to a supplier. This creates a journal entry and updates account balances automatically.

**Request Body:**

```json
{
  "amount": 50000,
  "payment_date": "2025-12-08",
  "payment_account_id": 8,
  "invoice_number": "INV-2025-001",
  "notes": "Payment via bank transfer",
  "skip_invoice": false
}
```

**Field Descriptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | number | Yes | Payment amount (must be > 0) |
| `payment_date` | date | Yes | Date of payment (cannot be future, format: YYYY-MM-DD) |
| `payment_account_id` | integer | Yes | ID of payment account (must be Asset type) |
| `invoice_number` | string | No | Supplier's invoice number (max 100 chars) |
| `notes` | string | No | Additional notes (max 1000 chars) |
| `skip_invoice` | boolean | No | Set to `true` to skip invoice field |

**Validation Rules:**

- `amount`: Required, numeric, minimum 0.01, cannot exceed outstanding balance
- `payment_date`: Required, valid date, cannot be in the future
- `payment_account_id`: Required, must exist in accounts table, must be Asset type, must be ledger account (not group)
- `invoice_number`: Optional, string, max 100 characters
- `notes`: Optional, string, max 1000 characters

**Response (200 OK):**

```json
{
  "payment": {
    "id": 1,
    "payment_number": "PAY-20251208-001",
    "supplier_id": 2,
    "supplier": {
      "id": 2,
      "name": "Alpha Supplier"
    },
    "amount": "50000.00",
    "payment_date": "2025-12-08",
    "payment_account_id": 8,
    "payment_account": {
      "id": 8,
      "number": "1110",
      "name": "Cash in Hand",
      "root_type": "asset"
    },
    "invoice_number": "INV-2025-001",
    "notes": "Payment via bank transfer",
    "journal_entry_id": 55,
    "created_by": 1,
    "created_at": "2025-12-08T14:30:00.000000Z",
    "updated_at": "2025-12-08T14:30:00.000000Z"
  },
  "journal_entry": {
    "id": 55,
    "date": "2025-12-08",
    "voucher_type": "supplier_payment",
    "reference_number": "PAY-20251208-001",
    "description": "Payment to Alpha Supplier - Invoice INV-2025-001",
    "is_posted": true,
    "lines": [
      {
        "id": 110,
        "account_id": 15,
        "account_number": "2100",
        "account_name": "Accounts Payable",
        "debit": "50000.00",
        "credit": "0.00",
        "description": "Payment to Alpha Supplier"
      },
      {
        "id": 111,
        "account_id": 8,
        "account_number": "1110",
        "account_name": "Cash in Hand",
        "debit": "0.00",
        "credit": "50000.00",
        "description": "Payment made via Cash in Hand"
      }
    ]
  },
  "outstanding_balance": "55000.00",
  "message": "Payment recorded successfully. Journal entry PAY-20251208-001 created."
}
```

**Response (400 Bad Request)** - Amount exceeds balance:

```json
{
  "message": "Payment amount (PKR 60,000.00) exceeds outstanding balance (PKR 55,000.00)"
}
```

**Response (400 Bad Request)** - No outstanding balance:

```json
{
  "message": "No outstanding balance for this supplier. Nothing to pay."
}
```

**Response (400 Bad Request)** - Account mappings not configured:

```json
{
  "message": "Account mappings not configured. Please configure accounts in Stock Settings before making payments."
}
```

**Response (400 Bad Request)** - Invalid payment account type:

```json
{
  "message": "Payment account must be an asset account (Cash, Bank, etc.)"
}
```

---

### 3. Get Supplier Outstanding Balance

**Endpoint:** `GET /api/suppliers/{supplierId}/balance`

**Auth Required:** Yes

**Description:** Get the outstanding balance and detailed breakdown for a supplier.

**Response (200 OK):**

```json
{
  "supplier_id": 2,
  "supplier_name": "Alpha Supplier",
  "total_purchased": "105000.00",
  "total_paid": "50000.00",
  "outstanding_balance": "55000.00",
  "breakdown": {
    "received_orders_count": 2,
    "payments_count": 1,
    "last_payment_date": "2025-12-08",
    "last_payment_amount": "50000.00"
  }
}
```

**Calculation Logic:**

- `total_purchased`: Sum of all received/partial POs that have journal entries
- `total_paid`: Sum of all payments made to supplier
- `outstanding_balance`: total_purchased - total_paid (minimum 0)

---

### 4. Auto-Detect Payment Account

**Endpoint:** `GET /api/suppliers/payment-account/auto-detect`

**Auth Required:** Yes

**Description:** Automatically detect the most suitable payment account (Cash, Bank, etc.) based on account names and types.

**Response (200 OK):**

```json
{
  "detected_account": {
    "id": 8,
    "number": "1110",
    "name": "Cash in Hand",
    "root_type": "asset",
    "is_group": false,
    "is_disabled": false
  },
  "confidence": "high",
  "method": "exact_name_match",
  "reason": "Exact match found: \"Cash in Hand\"",
  "message": "Payment account detected successfully"
}
```

**Confidence Levels:**

- `high`: Exact name match found
- `medium`: Keyword match found (bank, payment service)
- `low`: Using first available asset account
- `none`: No suitable account found

**Detection Algorithm Priority:**

1. **"Cash in Hand"** (exact match) → high confidence
2. **"Cash"** (exact match) → high confidence
3. **Contains "bank", "jazzcash", "easypaisa"** (keyword match) → medium confidence
4. **First active asset ledger account** → low confidence

**Response (404 Not Found):**

```json
{
  "detected_account": null,
  "confidence": "none",
  "message": "No suitable payment account found",
  "suggestions": [
    "Create a 'Cash in Hand' account (Asset type) with code 1110",
    "Create a 'Bank Account' account (Asset type) with code 1120"
  ]
}
```

---

## Workflows

### Workflow 1: Making a Payment to Supplier

**Scenario:** Pay PKR 50,000 to Alpha Supplier for received goods worth PKR 105,000

**Step 1: Check outstanding balance**

```javascript
const getOutstandingBalance = async (supplierId) => {
  const response = await fetch(`/api/suppliers/${supplierId}/balance`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  console.log('Outstanding:', data.outstanding_balance);
  return data;
};

// Example: Outstanding: 105000.00
```

**Step 2: Auto-detect payment account**

```javascript
const autoDetectPaymentAccount = async () => {
  const response = await fetch('/api/suppliers/payment-account/auto-detect', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.detected_account) {
    console.log('Detected:', data.detected_account.name);
    return data.detected_account;
  } else {
    console.log('No account found. Please select manually.');
    return null;
  }
};

// Example: Detected: Cash in Hand
```

**Step 3: Create payment**

```javascript
const createPayment = async (supplierId, paymentData) => {
  const response = await fetch(`/api/suppliers/${supplierId}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(paymentData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};

// Usage
try {
  const result = await createPayment(2, {
    amount: 50000,
    payment_date: '2025-12-08',
    payment_account_id: 8,
    invoice_number: 'INV-2025-001',
    notes: 'Partial payment',
    skip_invoice: false
  });
  
  console.log('Payment created:', result.payment.payment_number);
  console.log('New outstanding:', result.outstanding_balance);
  
  // Display journal entry details
  if (result.journal_entry) {
    console.log('Journal Entry:', result.journal_entry.reference_number);
    result.journal_entry.lines.forEach(line => {
      console.log(`${line.account_name}: DR ${line.debit}, CR ${line.credit}`);
    });
  }
} catch (error) {
  console.error('Payment failed:', error.message);
}
```

**Step 4: Display confirmation**

```javascript
// Show success message with:
// - Payment number
// - Amount paid
// - New outstanding balance
// - Journal entry details
// - Updated supplier balance
```

---

### Workflow 2: Viewing Payment History

```javascript
const getPaymentHistory = async (supplierId, filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`/api/suppliers/${supplierId}/payments?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  // Display payments table
  data.payments.forEach(payment => {
    console.log(`${payment.payment_date} - ${payment.payment_number}`);
    console.log(`  Amount: PKR ${payment.amount}`);
    console.log(`  Account: ${payment.payment_account.name}`);
    console.log(`  Invoice: ${payment.invoice_number || 'N/A'}`);
  });
  
  // Display summary
  console.log('\nSummary:');
  console.log(`Total Purchased: PKR ${data.summary.total_received}`);
  console.log(`Total Paid: PKR ${data.summary.total_paid}`);
  console.log(`Outstanding: PKR ${data.summary.outstanding_balance}`);
  
  return data;
};

// Usage
await getPaymentHistory(2, {
  from_date: '2025-12-01',
  to_date: '2025-12-31',
  per_page: 20
});
```

---

## Error Handling

### Error 1: No Account Mappings

**When:** User tries to make payment without configuring account mappings

**Response:**

```json
{
  "message": "Account mappings not configured. Please configure accounts in Stock Settings before making payments."
}
```

**Frontend Action:**
1. Show user-friendly error message
2. Provide link to Stock Settings
3. Guide user to configure accounts

**Example:**

```javascript
try {
  await createPayment(supplierId, paymentData);
} catch (error) {
  if (error.message.includes('Account mappings not configured')) {
    showError('Please configure accounting settings first', {
      action: 'Go to Settings',
      link: '/settings/stock-accounting'
    });
  }
}
```

---

### Error 2: Payment Exceeds Balance

**When:** Payment amount is greater than outstanding balance

**Response:**

```json
{
  "message": "Payment amount (PKR 60,000.00) exceeds outstanding balance (PKR 55,000.00)"
}
```

**Frontend Action:**
1. Display error with both amounts
2. Show maximum allowed payment
3. Pre-fill form with maximum amount option

**Example:**

```javascript
if (error.message.includes('exceeds outstanding balance')) {
  const matches = error.message.match(/PKR ([\d,]+\.\d+)/g);
  const maxAmount = parseFloat(matches[1].replace('PKR ', '').replace(',', ''));
  
  showError('Payment amount exceeds outstanding balance', {
    suggestion: `Maximum allowed: PKR ${maxAmount}`,
    action: 'Pay Maximum',
    onClick: () => setAmount(maxAmount)
  });
}
```

---

### Error 3: No Outstanding Balance

**When:** Trying to pay supplier with zero outstanding balance

**Response:**

```json
{
  "message": "No outstanding balance for this supplier. Nothing to pay."
}
```

**Frontend Action:**
1. Disable payment button
2. Show message: "No outstanding balance"
3. Display payment history instead

---

### Error 4: Invalid Payment Account

**When:** Selected account is not an asset type

**Response:**

```json
{
  "message": "Payment account must be an asset account (Cash, Bank, etc.)"
}
```

**Frontend Action:**
1. Filter account dropdown to show only asset accounts
2. Display account type in dropdown
3. Show inline validation

---

## Frontend Integration Guide

### Payment Modal Component

**File:** `src/components/Suppliers/PaymentModal.tsx`

```typescript
import { useState, useEffect } from 'react';

interface PaymentModalProps {
  supplier: Supplier;
  outstandingBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierPaymentModal({ 
  supplier, 
  outstandingBalance, 
  onClose, 
  onSuccess 
}: PaymentModalProps) {
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_date: new Date().toISOString().split('T')[0],
    payment_account_id: null,
    invoice_number: '',
    notes: '',
    skip_invoice: false
  });
  
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    loadPaymentAccounts();
    autoDetectAccount();
  }, []);
  
  const loadPaymentAccounts = async () => {
    const response = await fetch('/api/accounts?root_type=asset');
    const data = await response.json();
    setPaymentAccounts(data.accounts.filter(a => !a.is_group));
  };
  
  const autoDetectAccount = async () => {
    try {
      const response = await fetch('/api/suppliers/payment-account/auto-detect');
      const data = await response.json();
      
      if (data.detected_account) {
        setPaymentData(prev => ({
          ...prev,
          payment_account_id: data.detected_account.id
        }));
      }
    } catch (error) {
      console.error('Auto-detect failed:', error);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`/api/suppliers/${supplier.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      const result = await response.json();
      alert(result.message);
      onSuccess();
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Make Payment to {supplier.name}</h2>
      
      <div className="mb-4">
        <label>Outstanding Balance</label>
        <input 
          type="text" 
          value={`PKR ${outstandingBalance.toLocaleString()}`} 
          disabled 
          className="font-bold"
        />
      </div>
      
      <div className="mb-4">
        <label>Amount to Pay *</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          max={outstandingBalance}
          value={paymentData.amount}
          onChange={(e) => setPaymentData({
            ...paymentData,
            amount: parseFloat(e.target.value)
          })}
          required
        />
        <button 
          type="button"
          onClick={() => setPaymentData({...paymentData, amount: outstandingBalance})}
        >
          Pay Full Amount
        </button>
      </div>
      
      <div className="mb-4">
        <label>Payment Date *</label>
        <input
          type="date"
          max={new Date().toISOString().split('T')[0]}
          value={paymentData.payment_date}
          onChange={(e) => setPaymentData({
            ...paymentData,
            payment_date: e.target.value
          })}
          required
        />
      </div>
      
      <div className="mb-4">
        <label>Payment Account *</label>
        <select
          value={paymentData.payment_account_id || ''}
          onChange={(e) => setPaymentData({
            ...paymentData,
            payment_account_id: parseInt(e.target.value)
          })}
          required
        >
          <option value="">Select Account</option>
          {paymentAccounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.number} - {account.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="mb-4">
        <label>
          <input
            type="checkbox"
            checked={paymentData.skip_invoice}
            onChange={(e) => setPaymentData({
              ...paymentData,
              skip_invoice: e.target.checked
            })}
          />
          Skip Invoice Number
        </label>
      </div>
      
      {!paymentData.skip_invoice && (
        <div className="mb-4">
          <label>Invoice Number</label>
          <input
            type="text"
            maxLength={100}
            value={paymentData.invoice_number}
            onChange={(e) => setPaymentData({
              ...paymentData,
              invoice_number: e.target.value
            })}
          />
        </div>
      )}
      
      <div className="mb-4">
        <label>Notes</label>
        <textarea
          maxLength={1000}
          rows={3}
          value={paymentData.notes}
          onChange={(e) => setPaymentData({
            ...paymentData,
            notes: e.target.value
          })}
        />
      </div>
      
      <div className="flex gap-2">
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Make Payment'}
        </button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

---

## Summary

### What We Built

✅ Complete supplier payment management system  
✅ Automatic journal entry creation  
✅ Outstanding balance tracking  
✅ Payment history with full audit trail  
✅ Auto-detection of payment accounts  
✅ Comprehensive error handling  

### API Endpoints Created

1. `GET /api/suppliers/{supplierId}/payments` - Get payment history
2. `POST /api/suppliers/{supplierId}/payments` - Create payment
3. `GET /api/suppliers/{supplierId}/balance` - Get outstanding balance
4. `GET /api/suppliers/payment-account/auto-detect` - Auto-detect payment account

### Database Changes

1. New table: `supplier_payments`
2. Updated table: `suppliers` (added `outstanding_balance`)

### Key Files Created/Modified

**New Files:**
- `app/Models/SupplierPayment.php`
- `app/Services/SupplierPaymentService.php`
- `app/Suppliers/Http/Controllers/SupplierPaymentController.php`
- `database/migrations/2025_12_08_000300_create_supplier_payments_table.php`
- `database/migrations/2025_12_08_000400_add_outstanding_balance_to_suppliers_table.php`

**Modified Files:**
- `app/Models/Supplier.php`
- `routes/api.php`

---

**Documentation Version:** 1.0  
**Last Updated:** December 8, 2025  
**API Version:** 1.0
