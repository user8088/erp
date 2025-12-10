# Point of Sale (POS) System - API Documentation

## Overview

This document describes the complete API implementation for the Point of Sale (POS) system, including sales, customer payments, advances, and Chart of Accounts (COA) integration.

### Implementation Status: ✅ Complete

All features described in `TODO.mdc` have been implemented and are ready to use.

---

## Table of Contents

1. [Database Schema](#database-schema)
2. [Sales API](#sales-api)
3. [Customer Payments API](#customer-payments-api)
4. [Account Mappings API](#account-mappings-api)
5. [Customer Payment Summary API](#customer-payment-summary-api)
6. [Error Handling](#error-handling)
7. [Frontend Integration Guide](#frontend-integration-guide)

---

## Database Schema

### Tables Created

1. **`vehicles`** - Delivery vehicles
2. **`sales`** - Sales transactions (walk-in and delivery)
3. **`sale_items`** - Items in each sale
4. **`customer_payments`** - Customer payments (invoice payments, advances, refunds)
5. **`customer_advances`** - Customer advance balance tracking
6. **`account_mappings`** - COA account mappings for POS operations

### Schema Updates

- **`invoices`** table: Added `customer_id` column for customer invoices

---

## Sales API

### Base URL
```
/api/sales
```

All endpoints require authentication (`auth:sanctum` middleware) and `module.selling` permissions.

### 1. Create Sale (Draft)

**Endpoint:** `POST /api/sales`

**Permissions Required:** `module.selling,read-write`

**Request Body:**
```json
{
    "sale_type": "walk-in" | "delivery",
    "customer_id": 1,
    "vehicle_id": null,
    "delivery_address": "123 Main St",
    "expected_delivery_date": "2025-12-15",
    "items": [
        {
            "item_id": 1,
            "quantity": 5,
            "unit_price": 150.00,
            "discount_percentage": 10,
            "delivery_charge": 50.00
        }
    ],
    "notes": "Optional notes"
}
```

**Response (201 Created):**
```json
{
    "id": 1,
    "sale_number": "SALE-20251210-000001",
    "sale_type": "walk-in",
    "customer_id": 1,
    "customer": {
        "id": 1,
        "name": "John Doe",
        "serial_number": "CUST-20251208-001",
        "email": "john@example.com",
        "phone": "+1234567890"
    },
    "subtotal": 675.00,
    "total_discount": 75.00,
    "total_delivery_charges": 0.00,
    "tax_amount": 0.00,
    "total_amount": 675.00,
    "payment_status": "unpaid",
    "amount_paid": 0.00,
    "amount_due": 675.00,
    "advance_used": 0.00,
    "status": "draft",
    "items": [
        {
            "id": 1,
            "item_id": 1,
            "item": {
                "id": 1,
                "name": "Product A",
                "serial_number": "ITEM-001",
                "selling_price": 150.00
            },
            "quantity": 5.0000,
            "unit": "piece",
            "unit_price": 150.00,
            "original_price": 150.00,
            "discount_percentage": 10.00,
            "discount_amount": 75.00,
            "delivery_charge": 0.00,
            "subtotal": 675.00,
            "total": 675.00
        }
    ],
    "created_at": "2025-12-10T10:00:00.000000Z"
}
```

### 2. List Sales

**Endpoint:** `GET /api/sales`

**Permissions Required:** `module.selling,read`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (default: 15) |
| `customer_id` | integer | No | Filter by customer ID |
| `sale_type` | string | No | Filter by type: `walk-in` or `delivery` |
| `status` | string | No | Filter by status: `draft`, `completed`, `cancelled` |
| `payment_status` | string | No | Filter by payment status: `paid`, `unpaid`, `partial` |
| `start_date` | date | No | Filter from date (YYYY-MM-DD) |
| `end_date` | date | No | Filter to date (YYYY-MM-DD) |
| `search` | string | No | Search by sale number or customer name |

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": 1,
            "sale_number": "SALE-20251210-000001",
            ...
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 5,
        "per_page": 15,
        "total": 75
    }
}
```

### 3. Get Sale

**Endpoint:** `GET /api/sales/{id}`

**Permissions Required:** `module.selling,read`

**Response (200 OK):**
```json
{
    "id": 1,
    "sale_number": "SALE-20251210-000001",
    "sale_type": "walk-in",
    "customer_id": 1,
    "customer": { ... },
    "items": [ ... ],
    "invoice": {
        "id": 1,
        "invoice_number": "SAL-20251210-000001",
        "status": "paid"
    },
    ...
}
```

### 4. Process Sale

**Endpoint:** `POST /api/sales/{id}/process`

**Permissions Required:** `module.selling,read-write`

**Description:** Processes a draft sale. This will:
- Create an invoice
- Deduct stock
- Create COA journal entries
- Handle payment (if walk-in with immediate payment)

**Request Body (Optional - for walk-in immediate payment):**
```json
{
    "payment_method": "cash",
    "payment_account_id": 5,
    "amount_paid": 675.00,
    "use_advance": false,
    "notes": "Payment notes"
}
```

**Response (200 OK):**
```json
{
    "sale": {
        "id": 1,
        "sale_number": "SALE-20251210-000001",
        "status": "completed",
        "payment_status": "paid",
        ...
    },
    "invoice": {
        "id": 1,
        "invoice_number": "SAL-20251210-000001",
        "invoice_type": "sale",
        "total_amount": 675.00,
        "status": "paid"
    },
    "payment": {
        "id": 1,
        "payment_number": "PAY-20251210-000001",
        "amount": 675.00,
        ...
    },
    "journal_entries": [
        {
            "id": 1,
            "voucher_type": "sale",
            "reference_number": "SALE-20251210-000001",
            ...
        }
    ],
    "stock_movements": [
        {
            "id": 1,
            "movement_type": "sale",
            "quantity": -5.0000,
            ...
        }
    ]
}
```

### 5. Cancel Sale

**Endpoint:** `POST /api/sales/{id}/cancel`

**Permissions Required:** `module.selling,read-write`

**Description:** Cancels a sale. This will:
- Restore stock
- Reverse COA journal entries
- Cancel the invoice

**Response (200 OK):**
```json
{
    "id": 1,
    "sale_number": "SALE-20251210-000001",
    "status": "cancelled",
    ...
}
```

---

## Customer Payments API

### Base URL
```
/api/customer-payments
```

All endpoints require authentication (`auth:sanctum` middleware) and `module.customer` permissions.

### 1. Create Payment

**Endpoint:** `POST /api/customer-payments`

**Permissions Required:** `module.customer,read-write`

**Request Body:**

#### Invoice Payment
```json
{
    "customer_id": 1,
    "payment_type": "invoice_payment",
    "invoice_id": 123,
    "amount": 1000.00,
    "payment_method": "cash",
    "payment_account_id": 5,
    "payment_date": "2025-12-10",
    "reference_number": "CHQ-12345",
    "notes": "Payment notes"
}
```

#### Advance Payment
```json
{
    "customer_id": 1,
    "payment_type": "advance_payment",
    "amount": 2000.00,
    "payment_method": "bank_transfer",
    "payment_account_id": 6,
    "payment_date": "2025-12-10",
    "notes": "Advance payment"
}
```

#### Refund
```json
{
    "customer_id": 1,
    "payment_type": "refund",
    "amount": 500.00,
    "payment_method": "cash",
    "payment_account_id": 5,
    "payment_date": "2025-12-10",
    "notes": "Refund advance"
}
```

**Response (201 Created):**
```json
{
    "payment": {
        "id": 1,
        "payment_number": "PAY-20251210-000001",
        "customer_id": 1,
        "customer": {
            "id": 1,
            "name": "John Doe",
            "serial_number": "CUST-20251208-001"
        },
        "payment_type": "invoice_payment",
        "invoice_id": 123,
        "invoice": {
            "id": 123,
            "invoice_number": "SAL-20251210-000001",
            "total_amount": 1000.00
        },
        "amount": 1000.00,
        "payment_method": "cash",
        "payment_account_id": 5,
        "payment_account": {
            "id": 5,
            "name": "Cash in Hand",
            "number": "1001"
        },
        "payment_date": "2025-12-10",
        "status": "completed",
        "created_at": "2025-12-10T10:00:00.000000Z"
    },
    "journal_entries": [
        {
            "id": 1,
            "voucher_type": "payment",
            "reference_number": "PAY-20251210-000001",
            ...
        }
    ],
    "advance_transaction": null
}
```

### 2. List Payments

**Endpoint:** `GET /api/customer-payments`

**Permissions Required:** `module.customer,read`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number |
| `per_page` | integer | No | Items per page |
| `customer_id` | integer | No | Filter by customer ID |
| `payment_type` | string | No | Filter by type: `invoice_payment`, `advance_payment`, `refund` |
| `start_date` | date | No | Filter from date |
| `end_date` | date | No | Filter to date |
| `search` | string | No | Search by payment number or customer name |

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": 1,
            "payment_number": "PAY-20251210-000001",
            ...
        }
    ],
    "meta": {
        "current_page": 1,
        "last_page": 5,
        "per_page": 15,
        "total": 75
    }
}
```

### 3. Get Payment

**Endpoint:** `GET /api/customer-payments/{id}`

**Permissions Required:** `module.customer,read`

**Response (200 OK):**
```json
{
    "id": 1,
    "payment_number": "PAY-20251210-000001",
    "customer": { ... },
    "invoice": { ... },
    "payment_account": { ... },
    ...
}
```

---

## Customer Payment Summary API

### Get Payment Summary

**Endpoint:** `GET /api/customers/{id}/payment-summary`

**Permissions Required:** `module.customer,read`

**Response (200 OK):**
```json
{
    "customer_id": 1,
    "due_amount": 5000.00,
    "prepaid_amount": 2000.00,
    "total_spent": 50000.00,
    "total_paid": 45000.00,
    "outstanding_invoices": [
        {
            "invoice_id": 123,
            "invoice_number": "SAL-20251210-000001",
            "amount": 3000.00,
            "due_amount": 3000.00,
            "invoice_date": "2025-12-10"
        }
    ],
    "advance_balance": 2000.00,
    "advance_transactions": [
        {
            "id": 1,
            "amount": 2000.00,
            "balance": 2000.00,
            "transaction_type": "received",
            "transaction_date": "2025-12-10",
            ...
        }
    ]
}
```

---

## Account Mappings API

### Base URL
```
/api/account-mappings
```

All endpoints require authentication (`auth:sanctum` middleware).

### 1. List Account Mappings

**Endpoint:** `GET /api/account-mappings`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mapping_type` | string | No | Filter by mapping type |
| `company_id` | integer | No | Filter by company ID |

**Response (200 OK):**
```json
{
    "data": [
        {
            "id": 1,
            "mapping_type": "pos_cash",
            "account_id": 5,
            "account": {
                "id": 5,
                "name": "Cash in Hand",
                "number": "1001"
            },
            "company_id": null
        }
    ]
}
```

### 2. Get Mapping Status

**Endpoint:** `GET /api/account-mappings/status`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `company_id` | integer | No | Filter by company ID |

**Response (200 OK):**
```json
{
    "data": [
        {
            "mapping_type": "pos_cash",
            "label": "Cash in Hand",
            "is_configured": true,
            "account_id": 5,
            "account_name": "Cash in Hand"
        },
        {
            "mapping_type": "pos_bank",
            "label": "Bank Account",
            "is_configured": false,
            "account_id": null,
            "account_name": null
        },
        ...
    ]
}
```

### 3. Create/Update Account Mapping

**Endpoint:** `POST /api/account-mappings`

**Permissions Required:** `module.accounting,read-write`

**Request Body:**
```json
{
    "mapping_type": "pos_cash",
    "account_id": 5,
    "company_id": null
}
```

**Mapping Types:**
- `pos_cash` - Cash in Hand account
- `pos_bank` - Bank Account
- `pos_ar` - Accounts Receivable (Customers)
- `pos_advance` - Customer Advances (Liability)
- `pos_sales_revenue` - Sales Revenue
- `pos_delivery_revenue` - Delivery Charges Revenue
- `pos_discount` - Discounts Given (Contra Revenue)

**Response (201 Created):**
```json
{
    "id": 1,
    "mapping_type": "pos_cash",
    "account_id": 5,
    "account": {
        "id": 5,
        "name": "Cash in Hand",
        "number": "1001"
    },
    "company_id": null
}
```

### 4. Delete Account Mapping

**Endpoint:** `DELETE /api/account-mappings/{id}`

**Permissions Required:** `module.accounting,read-write`

**Response (200 OK):**
```json
{
    "message": "Account mapping deleted successfully."
}
```

---

## Error Handling

### Validation Errors (400 Bad Request)

```json
{
    "message": "The given data was invalid.",
    "errors": {
        "customer_id": ["The customer id field is required."],
        "items": ["Insufficient stock for item: Product A. Available: 10, Required: 15"]
    }
}
```

### Business Logic Errors (400 Bad Request)

```json
{
    "message": "Sale can only be processed if it is in draft status."
}
```

```json
{
    "message": "Account mapping not configured for: pos_sales_revenue"
}
```

### Common Error Scenarios

1. **Insufficient Stock:** Return 400 with message "Insufficient stock for item: {item_name}"
2. **Invalid Customer:** Return 404 with message "Customer not found"
3. **Invalid Account Mapping:** Return 400 with message "Account mapping not configured for: {mapping_type}"
4. **Invoice Already Paid:** Return 400 with message "Invoice is already fully paid"
5. **Advance Insufficient:** Return 400 with message "Insufficient advance balance"

---

## Frontend Integration Guide

### Complete Sale Flow (Walk-In, Paid)

1. **Create Sale (Draft)**
   ```javascript
   POST /api/sales
   {
       "sale_type": "walk-in",
       "customer_id": 1,
       "items": [...]
   }
   ```

2. **Process Sale with Payment**
   ```javascript
   POST /api/sales/{id}/process
   {
       "payment_method": "cash",
       "payment_account_id": 5,
       "amount_paid": 675.00,
       "use_advance": false
   }
   ```

3. **Response includes:**
   - Updated sale (status: completed, payment_status: paid)
   - Created invoice
   - Payment record
   - Journal entries
   - Stock movements

### Complete Sale Flow (Delivery, Unpaid)

1. **Create Sale (Draft)**
   ```javascript
   POST /api/sales
   {
       "sale_type": "delivery",
       "customer_id": 1,
       "vehicle_id": 1,
       "delivery_address": "123 Main St",
       "items": [...]
   }
   ```

2. **Process Sale**
   ```javascript
   POST /api/sales/{id}/process
   ```

3. **Response includes:**
   - Updated sale (status: completed, payment_status: unpaid)
   - Created invoice (status: issued)
   - Journal entries (DR Accounts Receivable, CR Sales Revenue)
   - Stock movements

### Payment Flow (Invoice Payment)

1. **Get Customer Payment Summary**
   ```javascript
   GET /api/customers/{id}/payment-summary
   ```

2. **Create Payment**
   ```javascript
   POST /api/customer-payments
   {
       "customer_id": 1,
       "payment_type": "invoice_payment",
       "invoice_id": 123,
       "amount": 1000.00,
       "payment_method": "cash",
       "payment_account_id": 5
   }
   ```

3. **Response includes:**
   - Payment record
   - Journal entries (DR Cash, CR Accounts Receivable)
   - Updated invoice status (if fully paid)

### Payment Flow (Advance Payment)

1. **Create Advance Payment**
   ```javascript
   POST /api/customer-payments
   {
       "customer_id": 1,
       "payment_type": "advance_payment",
       "amount": 2000.00,
       "payment_method": "bank_transfer",
       "payment_account_id": 6
   }
   ```

2. **Response includes:**
   - Payment record
   - Advance transaction
   - Journal entries (DR Cash/Bank, CR Customer Advances)

### Sale Using Advance

1. **Process Sale with Advance**
   ```javascript
   POST /api/sales/{id}/process
   {
       "use_advance": true
   }
   ```

2. **System automatically:**
   - Checks customer advance balance
   - Uses advance (full or partial)
   - Creates advance transaction
   - Creates journal entries (DR Customer Advances, CR Sales Revenue)

### Account Mapping Setup

1. **Check Mapping Status**
   ```javascript
   GET /api/account-mappings/status
   ```

2. **Configure Mappings**
   ```javascript
   POST /api/account-mappings
   {
       "mapping_type": "pos_sales_revenue",
       "account_id": 10
   }
   ```

3. **Required Mappings:**
   - `pos_sales_revenue` (required)
   - `pos_cash` (for cash payments)
   - `pos_bank` (for bank payments)
   - `pos_ar` (for unpaid sales)
   - `pos_advance` (for customer advances)
   - `pos_delivery_revenue` (optional, for delivery charges)
   - `pos_discount` (optional, for discounts)

---

## Notes

1. **All operations are transactional** - If any step fails, the entire operation rolls back
2. **Stock validation** - Stock is validated before processing sale
3. **Auto-create journal entries** - Journal entries are automatically created for all sales and payments
4. **Customer balances** - Tracked via AR (Accounts Receivable) and Advances accounts
5. **Invoice generation** - Invoices are automatically generated when sales are processed
6. **PDF generation** - Invoice PDFs are automatically generated

---

## Permissions

The following permissions control access to the APIs:

### Sales
- `module.selling,read` - View sales (list, show)
- `module.selling,read-write` - Create, process, cancel sales

### Customer Payments
- `module.customer,read` - View payments and payment summary
- `module.customer,read-write` - Create payments

### Account Mappings
- `module.accounting,read-write` - Create, update, delete account mappings

---

## Conclusion

This POS system integrates:
- ✅ POS sales (walk-in and delivery)
- ✅ Customer invoices
- ✅ Customer payments and advances
- ✅ Stock management
- ✅ Chart of Accounts (automatic journal entries)

All operations are atomic (transactional) and maintain data consistency across all systems.

