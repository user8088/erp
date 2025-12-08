# Purchase Order & Chart of Accounts Integration API Documentation

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

This feature automatically integrates Purchase Orders with the Chart of Accounts system. When stock is received from a purchase order, the system automatically creates journal entries to record the accounting impact.

### Accounting Flow

```
┌─────────────────┐
│ 1. Create PO    │ → NO ACCOUNTING ENTRY
│    Status: Draft│   (Just tracking the order)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Send PO      │ → NO ACCOUNTING ENTRY
│  Status: Sent   │   (Commitment, no transaction yet)
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 3. Receive Stock        │ → ✅ CREATE JOURNAL ENTRY
│    Status: Partial/     │    DR Inventory (Asset ↑)
│            Received      │    CR Accounts Payable (Liability ↑)
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 4. View PO Details      │ → See linked journal entry
│                         │    Review accounting impact
└─────────────────────────┘
```

### Key Principles

1. **PO Creation/Update** = No accounting impact (draft stage)
2. **Goods Receipt** = Automatic journal entry creation
3. **Partial Receipts** = Journal entry updates as more stock arrives
4. **Auto-Detection** = System can automatically find appropriate accounts
5. **Idempotency** = No duplicate entries for the same receipt

---

## Feature Summary

### What's New

✅ **Stock Account Mappings**: Configure which accounts to use for inventory and payables  
✅ **Auto-Detection**: System automatically suggests suitable accounts  
✅ **Automatic Journal Entries**: Created when receiving stock  
✅ **Partial Receipt Support**: Updates journal entry as more stock is received  
✅ **Linked Data**: Purchase orders link to their journal entries  

### Benefits

- **Automated Accounting**: No manual journal entry creation needed
- **Real-time Updates**: Account balances update immediately
- **Audit Trail**: Full traceability from PO to journal entry
- **Flexible Configuration**: Choose your own accounts or use auto-detection
- **Error Prevention**: Validation ensures correct account types

---

## Database Schema

### New Table: `stock_account_mappings`

Stores the account mapping configuration for purchase order accounting.

```sql
CREATE TABLE stock_account_mappings (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    is_singleton BOOLEAN DEFAULT TRUE UNIQUE,
    inventory_account_id BIGINT UNSIGNED NOT NULL,
    accounts_payable_account_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (inventory_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    FOREIGN KEY (accounts_payable_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
);
```

**Key Points:**
- Only **one configuration** can exist (enforced by unique `is_singleton` column)
- Cannot delete accounts that are mapped
- Both accounts must exist in the `accounts` table

### Updated Table: `purchase_orders`

Added column to link purchase orders to their journal entries.

```sql
ALTER TABLE purchase_orders
ADD COLUMN journal_entry_id BIGINT UNSIGNED NULL
ADD FOREIGN KEY (journal_entry_id) REFERENCES journal_entries(id) ON DELETE SET NULL;
```

**Purpose:**
- Links each PO to its accounting entry
- Allows viewing accounting impact from PO detail page
- Prevents duplicate journal entries

---

## API Endpoints

### 1. Get Account Mappings

**Endpoint:** `GET /api/stock/account-mappings`

**Auth Required:** Yes

**Description:** Retrieve current account mappings configuration.

**Response (200 OK):**

```json
{
  "mappings": {
    "id": 1,
    "is_singleton": true,
    "inventory_account_id": 5,
    "inventory_account": {
      "id": 5,
      "number": "1400",
      "name": "Inventory",
      "root_type": "asset"
    },
    "accounts_payable_account_id": 15,
    "accounts_payable_account": {
      "id": 15,
      "number": "2100",
      "name": "Accounts Payable",
      "root_type": "liability"
    },
    "created_at": "2025-12-08T10:00:00.000000Z",
    "updated_at": "2025-12-08T10:00:00.000000Z"
  }
}
```

**Response (404 Not Found)** - No mappings configured:

```json
{
  "mappings": null,
  "message": "No account mappings configured. Please configure accounts in settings."
}
```

---

### 2. Create/Update Account Mappings

**Endpoint:** `POST /api/stock/account-mappings`

**Auth Required:** Yes

**Description:** Configure account mappings. This is a singleton - only one configuration exists. Subsequent calls will update the existing configuration.

**Request Body:**

```json
{
  "inventory_account_id": 5,
  "accounts_payable_account_id": 15
}
```

**Validation Rules:**

| Field | Rules |
|-------|-------|
| `inventory_account_id` | required, must exist in accounts table, must be asset type, cannot be a group account |
| `accounts_payable_account_id` | required, must exist in accounts table, must be liability type, cannot be a group account, must be different from inventory account |

**Response (200 OK):**

```json
{
  "mappings": {
    "id": 1,
    "is_singleton": true,
    "inventory_account_id": 5,
    "inventory_account": {
      "id": 5,
      "number": "1400",
      "name": "Inventory",
      "root_type": "asset"
    },
    "accounts_payable_account_id": 15,
    "accounts_payable_account": {
      "id": 15,
      "number": "2100",
      "name": "Accounts Payable",
      "root_type": "liability"
    },
    "created_at": "2025-12-08T10:00:00.000000Z",
    "updated_at": "2025-12-08T10:00:00.000000Z"
  },
  "message": "Account mappings saved successfully"
}
```

**Response (422 Unprocessable Entity):**

```json
{
  "message": "Validation failed",
  "errors": {
    "inventory_account_id": [
      "The selected account must be an asset account."
    ],
    "accounts_payable_account_id": [
      "The selected account must be a liability account."
    ]
  }
}
```

---

### 3. Auto-Detect Accounts

**Endpoint:** `GET /api/stock/account-mappings/auto-detect`

**Auth Required:** Yes

**Description:** Automatically detect suitable accounts based on name, code, or account type.

**Response (200 OK):**

```json
{
  "detected_accounts": {
    "inventory_account": {
      "id": 5,
      "number": "1400",
      "name": "Inventory",
      "root_type": "asset",
      "is_group": false
    },
    "inventory_detection": {
      "confidence": 100,
      "method": "exact_name_match",
      "reason": "Exact match found: \"Inventory\""
    },
    "accounts_payable_account": {
      "id": 15,
      "number": "2100",
      "name": "Accounts Payable",
      "root_type": "liability",
      "is_group": false
    },
    "payable_detection": {
      "confidence": 100,
      "method": "exact_name_match",
      "reason": "Exact match found: \"Accounts Payable\""
    }
  },
  "confidence": "high",
  "message": "Accounts detected successfully. Review and save if correct."
}
```

**Confidence Levels:**

- `high`: Both accounts detected with 80%+ confidence
- `medium`: Both accounts detected with 60%+ confidence  
- `low`: Both accounts detected with lower confidence
- `none`: Could not detect suitable accounts

**Detection Algorithm Priority:**

1. **Exact name match** (100% confidence)
   - Inventory: "Inventory", "Stock", "Merchandise"
   - Payable: "Accounts Payable", "Trade Payables", "Creditors", "Supplier Payables"

2. **Keyword match** (80% confidence)
   - Inventory: Contains "inventory", "stock", or "merchandise"
   - Payable: Contains "payable", "creditor", or "supplier"

3. **Account code range** (60% confidence)
   - Inventory: 1400-1499 or 14000-14999
   - Payable: 2100-2199 or 21000-21999

4. **First account of type** (30% confidence)
   - Inventory: First active asset ledger account
   - Payable: First active liability ledger account

**Response (404 Not Found):**

```json
{
  "detected_accounts": null,
  "confidence": "none",
  "message": "Could not auto-detect suitable accounts. Please configure manually.",
  "suggestions": [
    "Create an 'Inventory' account (Asset type) with code 1400",
    "Create an 'Accounts Payable' account (Liability type) with code 2100"
  ],
  "details": {
    "inventory": {
      "account": null,
      "confidence": 0,
      "method": "none",
      "reason": "No suitable account found"
    },
    "payable": {
      "account": null,
      "confidence": 0,
      "method": "none",
      "reason": "No suitable account found"
    }
  }
}
```

---

### 4. Receive Stock (Updated)

**Endpoint:** `POST /api/purchase-orders/{id}/receive`

**Auth Required:** Yes

**Description:** Receive stock from a purchase order. Now automatically creates a journal entry.

**Request Body:**

```json
{
  "items": [
    {
      "id": 1,
      "quantity_received": 100
    },
    {
      "id": 2,
      "quantity_received": 50
    }
  ]
}
```

**Validation:**

| Field | Rules |
|-------|-------|
| `items` | required, array, min:1 |
| `items.*.id` | required, must exist in purchase_order_items |
| `items.*.quantity_received` | required, numeric, min:0, cannot exceed remaining quantity |

**Response (200 OK):**

```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251208-001",
    "supplier_id": 5,
    "supplier_name": "Alpha Supplier",
    "order_date": "2025-12-08",
    "status": "received",
    "total": "125000.00",
    "journal_entry_id": 42,
    "items": [
      {
        "id": 1,
        "item_id": 9,
        "item": {
          "id": 9,
          "name": "Cement Bags",
          "primary_unit": "bag"
        },
        "quantity_ordered": "100.0000",
        "quantity_received": "100.0000",
        "unit_price": "850.00",
        "total": "85000.00"
      }
    ],
    "journal_entry": {
      "id": 42,
      "date": "2025-12-08",
      "voucher_type": "purchase_order",
      "reference_number": "PO-20251208-001",
      "description": "Goods Receipt - PO-20251208-001 from Alpha Supplier - Received from Alpha Supplier - PO PO-20251208-001",
      "is_posted": true
    }
  },
  "journal_entry": {
    "id": 42,
    "date": "2025-12-08",
    "voucher_type": "purchase_order",
    "reference_number": "PO-20251208-001",
    "description": "Goods Receipt - PO-20251208-001 from Alpha Supplier - Received from Alpha Supplier - PO PO-20251208-001",
    "is_posted": true,
    "lines": [
      {
        "id": 84,
        "account_id": 5,
        "account_number": "1400",
        "account_name": "Inventory",
        "debit": "125000.00",
        "credit": "0.00",
        "description": "Stock received: 100 bag Cement Bags + 50 piece Steel Rebar"
      },
      {
        "id": 85,
        "account_id": 15,
        "account_number": "2100",
        "account_name": "Accounts Payable",
        "debit": "0.00",
        "credit": "125000.00",
        "description": "Payable to Alpha Supplier"
      }
    ]
  },
  "stock_movements": [
    {
      "id": 150,
      "item_id": 9,
      "movement_type": "purchase",
      "quantity": "100.0000",
      "previous_stock": "24.0000",
      "new_stock": "124.0000",
      "reference_type": "purchase_order",
      "reference_id": 1,
      "performed_by": 1,
      "created_at": "2025-12-08T10:30:00.000000Z"
    }
  ],
  "message": "Stock received successfully. Journal entry created. 2 items updated."
}
```

**Important Notes:**

1. **First Receipt**: Creates a new journal entry
2. **Partial Receipt**: Updates the existing journal entry with new totals
3. **Accounting Not Configured**: Stock receipt still works, but no journal entry is created (warning logged)
4. **PO Status Updates**:
   - `partial`: Some items received but not all
   - `received`: All items fully received

**Response (422 Unprocessable Entity):**

```json
{
  "message": "Account mappings not configured. Please configure accounts in Stock Settings before receiving stock."
}
```

---

### 5. Get Purchase Order (Updated)

**Endpoint:** `GET /api/purchase-orders/{id}`

**Auth Required:** Yes

**Description:** Get purchase order details including linked journal entry.

**Response (200 OK):**

```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251208-001",
    "supplier_id": 5,
    "supplier_name": "Alpha Supplier",
    "order_date": "2025-12-08",
    "expected_delivery_date": "2025-12-15",
    "received_date": "2025-12-08",
    "status": "received",
    "subtotal": "100000.00",
    "tax_percentage": "0.00",
    "tax_amount": "0.00",
    "discount": "0.00",
    "total": "100000.00",
    "notes": null,
    "journal_entry_id": 42,
    "created_by": 1,
    "created_at": "2025-12-08T09:00:00.000000Z",
    "updated_at": "2025-12-08T10:30:00.000000Z",
    "items": [...],
    "journal_entry": {
      "id": 42,
      "date": "2025-12-08",
      "voucher_type": "purchase_order",
      "reference_number": "PO-20251208-001",
      "description": "Goods Receipt - PO-20251208-001 from Alpha Supplier",
      "is_posted": true,
      "created_at": "2025-12-08T10:30:00.000000Z",
      "lines": [
        {
          "id": 84,
          "account_id": 5,
          "account": {
            "id": 5,
            "number": "1400",
            "name": "Inventory",
            "root_type": "asset"
          },
          "debit": "100000.00",
          "credit": "0.00",
          "description": "Stock received: 20 bag Cement"
        },
        {
          "id": 85,
          "account_id": 15,
          "account": {
            "id": 15,
            "number": "2100",
            "name": "Accounts Payable",
            "root_type": "liability"
          },
          "debit": "0.00",
          "credit": "100000.00",
          "description": "Payable to Alpha Supplier"
        }
      ]
    }
  }
}
```

---

### 6. Get Accounts List

**Endpoint:** `GET /api/accounts`

**Auth Required:** Yes

**Description:** Get all accounts for dropdown selection in settings.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `root_type` | string | No | Filter by type: `asset`, `liability`, `equity`, `income`, `expense` |

**Example Requests:**

```bash
# Get all asset accounts (for Inventory dropdown)
GET /api/accounts?root_type=asset

# Get all liability accounts (for Accounts Payable dropdown)
GET /api/accounts?root_type=liability
```

**Response (200 OK):**

```json
{
  "accounts": [
    {
      "id": 5,
      "number": "1400",
      "name": "Inventory",
      "root_type": "asset",
      "is_group": false,
      "parent_id": null,
      "is_disabled": false
    },
    {
      "id": 6,
      "number": "1410",
      "name": "Raw Materials",
      "root_type": "asset",
      "is_group": false,
      "parent_id": 5,
      "is_disabled": false
    }
  ]
}
```

---

## Workflows

### Workflow 1: Initial Setup (First Time)

**Step 1: Check if accounts are configured**

```javascript
// Check current mappings
const checkMappings = async () => {
  const response = await fetch('/api/stock/account-mappings', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (response.status === 404) {
    // Not configured, proceed to auto-detect
    return null;
  }
  
  const data = await response.json();
  return data.mappings;
};
```

**Step 2: Try auto-detection**

```javascript
const autoDetect = async () => {
  const response = await fetch('/api/stock/account-mappings/auto-detect', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (data.confidence === 'high' || data.confidence === 'medium') {
    // Show detected accounts to user for confirmation
    return data.detected_accounts;
  } else {
    // Show manual selection form
    return null;
  }
};
```

**Step 3: Save configuration**

```javascript
const saveMappings = async (inventoryAccountId, payableAccountId) => {
  const response = await fetch('/api/stock/account-mappings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      inventory_account_id: inventoryAccountId,
      accounts_payable_account_id: payableAccountId
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
};
```

---

### Workflow 2: Receiving Stock from Purchase Order

**Step 1: Display PO receive form**

```javascript
// Get PO details
const po = await fetch(`/api/purchase-orders/${poId}`).then(r => r.json());

// Show items with remaining quantities
po.purchase_order.items.forEach(item => {
  const remaining = item.quantity_ordered - item.quantity_received;
  console.log(`${item.item.name}: ${remaining} remaining`);
});
```

**Step 2: Receive stock**

```javascript
const receiveStock = async (poId, items) => {
  const response = await fetch(`/api/purchase-orders/${poId}/receive`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ items })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  const data = await response.json();
  
  // Check if journal entry was created
  if (data.journal_entry) {
    console.log('Journal entry created:', data.journal_entry);
  } else {
    console.warn('Stock received but no journal entry created. Check account mappings.');
  }
  
  return data;
};

// Example usage
await receiveStock(1, [
  { id: 1, quantity_received: 100 },
  { id: 2, quantity_received: 50 }
]);
```

**Step 3: Display confirmation**

```javascript
// Show success message with:
// - Updated stock quantities
// - Journal entry details (if created)
// - Updated PO status
```

---

### Workflow 3: Viewing Purchase Order with Journal Entry

```javascript
const viewPOWithAccounting = async (poId) => {
  const response = await fetch(`/api/purchase-orders/${poId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const { purchase_order } = await response.json();
  
  // Display PO details
  console.log('PO:', purchase_order.po_number);
  console.log('Status:', purchase_order.status);
  console.log('Total:', purchase_order.total);
  
  // Display journal entry if exists
  if (purchase_order.journal_entry) {
    console.log('\nAccounting Entry:');
    console.log('Entry Date:', purchase_order.journal_entry.date);
    console.log('Description:', purchase_order.journal_entry.description);
    
    purchase_order.journal_entry.lines.forEach(line => {
      console.log(`  ${line.account.name} (${line.account.number})`);
      console.log(`    Debit: ${line.debit}, Credit: ${line.credit}`);
    });
  }
};
```

---

## Error Handling

### Error 1: Account Mappings Not Configured

**When:** User tries to receive stock without configuring accounts

**Response:**

```json
{
  "message": "Account mappings not configured. Please configure accounts in Stock Settings before receiving stock."
}
```

**Frontend Action:**
1. Show user-friendly error message
2. Provide link to settings page
3. Offer to auto-detect accounts

**Example:**

```javascript
try {
  await receiveStock(poId, items);
} catch (error) {
  if (error.message.includes('Account mappings not configured')) {
    // Redirect to settings with helpful message
    showError('Please configure accounting settings first', {
      action: 'Configure Now',
      link: '/settings/stock-accounting'
    });
  }
}
```

---

### Error 2: Invalid Account Types

**When:** User selects wrong account types

**Response:**

```json
{
  "message": "Validation failed",
  "errors": {
    "inventory_account_id": ["The selected account must be an asset account."],
    "accounts_payable_account_id": ["The selected account must be a liability account."]
  }
}
```

**Frontend Action:**
1. Display field-specific errors
2. Filter account dropdowns by type
3. Provide inline validation

---

### Error 3: Exceeding Ordered Quantity

**When:** Trying to receive more than ordered

**Response:**

```json
{
  "message": "Cannot receive more than ordered. Item: Cement, Remaining: 50, Attempting to receive: 100"
}
```

**Frontend Action:**
1. Show remaining quantity for each item
2. Validate input before submission
3. Display clear error message

---

### Error 4: PO Status Invalid

**When:** Trying to receive stock from draft or cancelled PO

**Response:**

```json
{
  "message": "Purchase order must be in sent or partial status to receive stock"
}
```

**Frontend Action:**
1. Disable receive button for invalid statuses
2. Show helpful message about PO status
3. Provide action to change status if needed

---

## Frontend Integration Guide

### Settings Page Implementation

**File:** `src/pages/Settings/StockAccounting.tsx` (or similar)

```typescript
import { useState, useEffect } from 'react';

interface AccountMapping {
  id: number;
  inventory_account_id: number;
  accounts_payable_account_id: number;
  inventory_account: Account;
  accounts_payable_account: Account;
}

interface Account {
  id: number;
  number: string;
  name: string;
  root_type: string;
}

export function StockAccountingSettings() {
  const [mappings, setMappings] = useState<AccountMapping | null>(null);
  const [assetAccounts, setAssetAccounts] = useState<Account[]>([]);
  const [liabilityAccounts, setLiabilityAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load current mappings
      const mappingsRes = await fetch('/api/stock/account-mappings');
      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setMappings(data.mappings);
      }

      // Load asset accounts for dropdown
      const assetsRes = await fetch('/api/accounts?root_type=asset');
      const assetsData = await assetsRes.json();
      setAssetAccounts(assetsData.accounts.filter(a => !a.is_group));

      // Load liability accounts for dropdown
      const liabilitiesRes = await fetch('/api/accounts?root_type=liability');
      const liabilitiesData = await liabilitiesRes.json();
      setLiabilityAccounts(liabilitiesData.accounts.filter(a => !a.is_group));

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  };

  const handleAutoDetect = async () => {
    try {
      const response = await fetch('/api/stock/account-mappings/auto-detect');
      const data = await response.json();

      if (data.confidence === 'high' || data.confidence === 'medium') {
        // Show confirmation dialog
        if (confirm(`Auto-detected accounts:\n\nInventory: ${data.detected_accounts.inventory_account.name}\nAccounts Payable: ${data.detected_accounts.accounts_payable_account.name}\n\nUse these accounts?`)) {
          await saveMappings(
            data.detected_accounts.inventory_account.id,
            data.detected_accounts.accounts_payable_account.id
          );
        }
      } else {
        alert('Could not auto-detect accounts. Please select manually.');
      }
    } catch (error) {
      console.error('Error auto-detecting:', error);
    }
  };

  const saveMappings = async (inventoryId: number, payableId: number) => {
    try {
      const response = await fetch('/api/stock/account-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_account_id: inventoryId,
          accounts_payable_account_id: payableId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      setMappings(data.mappings);
      alert('Account mappings saved successfully!');
    } catch (error) {
      alert(error.message);
    }
  };

  // Render UI with dropdowns and auto-detect button
  // ...
}
```

---

### Purchase Order Receive Stock Component

**File:** `src/components/PurchaseOrders/ReceiveStockModal.tsx`

```typescript
import { useState } from 'react';

interface ReceiveStockModalProps {
  purchaseOrder: PurchaseOrder;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveStockModal({ purchaseOrder, onClose, onSuccess }: ReceiveStockModalProps) {
  const [items, setItems] = useState(
    purchaseOrder.items.map(item => ({
      id: item.id,
      quantity_received: 0,
      remaining: item.quantity_ordered - item.quantity_received
    }))
  );

  const handleReceive = async () => {
    try {
      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.filter(i => i.quantity_received > 0)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      
      // Show success with journal entry info
      let message = data.message;
      if (data.journal_entry) {
        message += `\n\nJournal Entry #${data.journal_entry.reference_number} created`;
      }
      
      alert(message);
      onSuccess();
      onClose();
    } catch (error) {
      if (error.message.includes('Account mappings not configured')) {
        if (confirm('Accounting is not configured. Configure now?')) {
          // Redirect to settings
          window.location.href = '/settings/stock-accounting';
        }
      } else {
        alert(error.message);
      }
    }
  };

  // Render UI with item inputs and receive button
  // ...
}
```

---

### Purchase Order Detail Page

**File:** `src/pages/PurchaseOrders/Detail.tsx`

```typescript
export function PurchaseOrderDetail({ id }: { id: number }) {
  const [po, setPO] = useState<PurchaseOrder | null>(null);

  useEffect(() => {
    loadPO();
  }, [id]);

  const loadPO = async () => {
    const response = await fetch(`/api/purchase-orders/${id}`);
    const data = await response.json();
    setPO(data.purchase_order);
  };

  return (
    <div>
      {/* PO Details */}
      <h2>{po?.po_number}</h2>
      <p>Status: {po?.status}</p>
      <p>Total: {po?.total}</p>

      {/* Journal Entry Section (if exists) */}
      {po?.journal_entry && (
        <div className="mt-6 p-4 border rounded">
          <h3 className="font-bold">Accounting Entry</h3>
          <p>Reference: {po.journal_entry.reference_number}</p>
          <p>Date: {po.journal_entry.date}</p>
          <p>Description: {po.journal_entry.description}</p>
          
          <table className="mt-4 w-full">
            <thead>
              <tr>
                <th>Account</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>
              {po.journal_entry.lines.map(line => (
                <tr key={line.id}>
                  <td>{line.account_name} ({line.account_number})</td>
                  <td>{line.debit}</td>
                  <td>{line.credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

---

## Summary

### What We Built

✅ Complete COA integration with Purchase Orders  
✅ Automatic journal entry creation on goods receipt  
✅ Account mapping configuration with auto-detection  
✅ Support for partial receipts  
✅ Full audit trail and traceability  
✅ Comprehensive error handling  

### API Endpoints Created

1. `GET /api/stock/account-mappings` - Get current mappings
2. `POST /api/stock/account-mappings` - Save/update mappings
3. `GET /api/stock/account-mappings/auto-detect` - Auto-detect accounts
4. `POST /api/purchase-orders/{id}/receive` - Receive stock (updated)
5. `GET /api/purchase-orders/{id}` - Get PO details (updated)

### Database Changes

1. New table: `stock_account_mappings`
2. Updated table: `purchase_orders` (added `journal_entry_id`)

### Key Files Created/Modified

**New Files:**
- `app/Models/StockAccountMapping.php`
- `app/Services/StockAccountingService.php`
- `app/Http/Controllers/StockAccountMappingController.php`
- `database/migrations/2025_12_08_000100_create_stock_account_mappings_table.php`
- `database/migrations/2025_12_08_000200_add_journal_entry_id_to_purchase_orders_table.php`

**Modified Files:**
- `app/Models/PurchaseOrder.php`
- `app/Stock/Services/PurchaseOrderService.php`
- `app/Stock/Http/Controllers/PurchaseOrderController.php`
- `routes/api.php`

---

**Documentation Version:** 1.0  
**Last Updated:** December 8, 2025  
**API Version:** 1.0
