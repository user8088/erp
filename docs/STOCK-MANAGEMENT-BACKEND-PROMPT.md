# Stock Management System - Frontend Integration Documentation

## Overview

This document provides comprehensive details for integrating the **Stock Management System** with the frontend application. It covers all API endpoints, request/response formats, business logic, validation rules, and implementation examples.

---

## Table of Contents

1. [Authentication & Permissions](#authentication--permissions)
2. [Base URL & Headers](#base-url--headers)
3. [Data Models](#data-models)
4. [Stock Management APIs](#stock-management-apis)
5. [Purchase Order APIs](#purchase-order-apis)
6. [Stock Movement APIs](#stock-movement-apis)
7. [Error Handling](#error-handling)
8. [Business Logic & Workflows](#business-logic--workflows)
9. [Unit System](#unit-system)
10. [Implementation Examples](#implementation-examples)

---

## Authentication & Permissions

All endpoints require authentication using Laravel Sanctum tokens.

### Required Permissions

| Operation | Permission | Description |
|-----------|-----------|-------------|
| View stock & POs | `stock.view` | View inventory and purchase orders |
| Create PO/Adjust stock | `stock.create` | Create purchase orders and adjust stock |
| Edit PO/Reorder levels | `stock.edit` | Edit draft POs and update reorder levels |
| Delete draft POs | `stock.delete` | Delete draft purchase orders |

### Authentication Header

```
Authorization: Bearer {token}
```

### Permission Check Response

If user lacks permission:

```json
{
  "message": "Unauthorized"
}
```

**HTTP Status:** `403 Forbidden`

---

## Base URL & Headers

### Base URL

```
https://your-api-domain.com/api
```

### Required Headers

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

---

## Data Models

### ItemStock

Represents current stock levels for an item.

```typescript
interface ItemStock {
  id: number;
  item_id: number;
  item: Item;
  quantity_on_hand: string; // Decimal(15,4) - in primary unit
  reorder_level: string; // Decimal(15,4)
  stock_value: string; // Decimal(15,2) - calculated from selling price
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock';
  last_restocked_at: string | null; // ISO 8601 timestamp
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

### PurchaseOrder

Represents a purchase order from a supplier.

```typescript
interface PurchaseOrder {
  id: number;
  po_number: string; // Format: PO-YYYYMMDD-XXX
  supplier_id: number | null;
  supplier_name: string;
  order_date: string; // YYYY-MM-DD
  expected_delivery_date: string | null; // YYYY-MM-DD
  received_date: string | null; // YYYY-MM-DD
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  subtotal: string; // Decimal(15,2)
  tax_percentage: string; // Decimal(5,2)
  tax_amount: string; // Decimal(15,2)
  discount: string; // Decimal(15,2)
  total: string; // Decimal(15,2)
  notes: string | null;
  created_by: number;
  created_by_name: string;
  items: PurchaseOrderItem[];
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

### PurchaseOrderItem

Represents a line item in a purchase order.

```typescript
interface PurchaseOrderItem {
  id: number;
  item_id: number;
  item: {
    id: number;
    serial_number: string;
    name: string;
    primary_unit: string;
    picture_url: string | null;
  };
  quantity_ordered: string; // Decimal(15,4)
  quantity_received: string; // Decimal(15,4)
  remaining_quantity: number; // Calculated
  unit_price: string; // Decimal(15,2)
  total: string; // Decimal(15,2)
  is_fully_received: boolean;
  is_partially_received: boolean;
}
```

### StockMovement

Audit log entry for stock changes.

```typescript
interface StockMovement {
  id: number;
  item_id: number;
  item: {
    id: number;
    serial_number: string;
    name: string;
    primary_unit: string;
    picture_url: string | null;
  };
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return';
  quantity: string; // Decimal(15,4) - positive for in, negative for out
  previous_stock: string; // Decimal(15,4)
  new_stock: string; // Decimal(15,4)
  reference_type: string | null; // 'purchase_order', 'invoice', 'adjustment'
  reference_id: number | null;
  notes: string | null;
  performed_by: number;
  performed_by_name: string;
  created_at: string; // ISO 8601 timestamp
}
```

### Item (Extended)

Items now include unit tracking fields:

```typescript
interface Item {
  // ... existing fields
  selling_price: string; // Decimal(15,2) - used for stock value calculation
  primary_unit: string; // e.g., "bag", "box", "piece"
  secondary_unit: string | null; // e.g., "kg", "liter"
  conversion_rate: string | null; // Decimal(10,4) - how many secondary units in one primary unit
}
```

---

## Stock Management APIs

### 1. Get Stock List

Get paginated list of stock items with filtering and sorting.

**Endpoint:** `GET /api/stock`

**Permission:** `stock.view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| per_page | integer | No | 15 | Items per page (max 100) |
| search | string | No | - | Search item name or serial number |
| category_id | integer | No | - | Filter by category |
| status | enum | No | - | Filter by stock status: `in_stock`, `low_stock`, `out_of_stock` |
| sort_by | string | No | item_name | Sort field: `item_name`, `quantity_on_hand`, `stock_value` |
| sort_order | string | No | asc | Sort order: `asc`, `desc` |

**Example Request:**

```bash
GET /api/stock?page=1&per_page=20&status=low_stock&sort_by=quantity_on_hand&sort_order=asc
```

**Response (200 OK):**

```json
{
  "stock": [
    {
      "id": 1,
      "item_id": 1,
      "item": {
        "id": 1,
        "serial_number": "CONST-000001",
        "name": "Portland Cement 50kg",
        "brand": "Fauji",
        "category_id": 1,
        "category": {
          "id": 1,
          "name": "Construction Material",
          "alias": "CONST"
        },
        "picture_url": "https://example.com/storage/cement.jpg",
        "last_purchase_price": "850.00",
        "selling_price": "1200.00",
        "primary_unit": "bag",
        "secondary_unit": "kg",
        "conversion_rate": "50.0000"
      },
      "quantity_on_hand": "450.0000",
      "reorder_level": "200.0000",
      "stock_value": "540000.00",
      "stock_status": "in_stock",
      "last_restocked_at": "2025-12-05T10:30:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-12-05T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "last_page": 3
  }
}
```

**Stock Status Logic:**
- `in_stock`: `quantity_on_hand > reorder_level`
- `low_stock`: `quantity_on_hand <= reorder_level AND quantity_on_hand > 0`
- `out_of_stock`: `quantity_on_hand = 0`

---

### 2. Get Stock for Single Item

Get stock details for a specific item.

**Endpoint:** `GET /api/stock/item/{item_id}`

**Permission:** `stock.view`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| item_id | integer | Item ID |

**Example Request:**

```bash
GET /api/stock/item/1
```

**Response (200 OK):**

```json
{
  "stock": {
    "id": 1,
    "item_id": 1,
    "item": { /* full item details */ },
    "quantity_on_hand": "450.0000",
    "reorder_level": "200.0000",
    "stock_value": "540000.00",
    "stock_status": "in_stock",
    "last_restocked_at": "2025-12-05T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-05T10:30:00Z"
  },
  "note": "Stock value calculation: 450.0000 bag × PKR 1200.00/bag (selling price) = PKR 540000.00"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 404 Not Found | `{ "message": "Item stock not found" }` |

---

### 3. Adjust Stock Manually

Manually adjust stock quantity (add or subtract).

**Endpoint:** `POST /api/stock/adjust`

**Permission:** `stock.create`

**Request Body:**

```json
{
  "item_id": 1,
  "quantity": -10.5000,  // Positive to add, negative to subtract (in primary unit)
  "notes": "Damaged stock write-off"
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| item_id | required, exists:items | Item must exist |
| quantity | required, numeric, not zero | Adjustment quantity (cannot be 0) |
| notes | nullable, string, max:500 | Optional notes |

**Business Logic:**

1. Validates new stock won't be negative: `new_stock = current_stock + quantity >= 0`
2. Updates `quantity_on_hand`
3. Recalculates `stock_value = new_stock × selling_price` (uses **selling price**)
4. Updates `last_restocked_at` if adding stock
5. Creates audit log entry in `stock_movements`

**Response (200 OK):**

```json
{
  "stock": {
    "id": 1,
    "item_id": 1,
    "item": { /* full item details */ },
    "quantity_on_hand": "439.5000",
    "reorder_level": "200.0000",
    "stock_value": "527400.00",
    "stock_status": "in_stock",
    "last_restocked_at": "2025-12-05T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-07T14:30:00Z"
  },
  "movement": {
    "id": 123,
    "item_id": 1,
    "item": {
      "id": 1,
      "serial_number": "CONST-000001",
      "name": "Portland Cement 50kg",
      "primary_unit": "bag",
      "picture_url": "https://example.com/storage/cement.jpg"
    },
    "movement_type": "adjustment",
    "quantity": "-10.5000",
    "previous_stock": "450.0000",
    "new_stock": "439.5000",
    "notes": "Damaged stock write-off",
    "performed_by": 1,
    "performed_by_name": "Admin User",
    "created_at": "2025-12-07T14:30:00Z"
  },
  "message": "Stock adjusted successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Insufficient stock. Cannot adjust to negative quantity." }` |
| 422 Unprocessable Entity | `{ "message": "Quantity cannot be zero.", "errors": { ... } }` |

---

### 4. Update Reorder Level

Update the reorder level (low stock alert threshold) for an item.

**Endpoint:** `PATCH /api/stock/item/{item_id}/reorder-level`

**Permission:** `stock.edit`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| item_id | integer | Item ID |

**Request Body:**

```json
{
  "reorder_level": 100.0000
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| reorder_level | required, numeric, min:0 | New reorder level |

**Response (200 OK):**

```json
{
  "stock": {
    "id": 1,
    "item_id": 1,
    "item": { /* full item details */ },
    "quantity_on_hand": "450.0000",
    "reorder_level": "100.0000",
    "stock_value": "540000.00",
    "stock_status": "in_stock",
    "last_restocked_at": "2025-12-05T10:30:00Z",
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-12-07T15:00:00Z"
  },
  "message": "Reorder level updated successfully"
}
```

---

### 5. Get Low Stock Alerts

Get items that are low on stock or out of stock.

**Endpoint:** `GET /api/stock/alerts`

**Permission:** `stock.view`

**Response (200 OK):**

```json
{
  "low_stock": [
    {
      "id": 5,
      "item_id": 5,
      "item": { /* item details */ },
      "quantity_on_hand": "15.0000",
      "reorder_level": "20.0000",
      "stock_value": "18000.00",
      "stock_status": "low_stock",
      "last_restocked_at": "2025-11-20T10:00:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-11-20T10:00:00Z"
    }
  ],
  "out_of_stock": [
    {
      "id": 8,
      "item_id": 8,
      "item": { /* item details */ },
      "quantity_on_hand": "0.0000",
      "reorder_level": "50.0000",
      "stock_value": "0.00",
      "stock_status": "out_of_stock",
      "last_restocked_at": "2025-10-15T08:30:00Z",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-12-01T14:20:00Z"
    }
  ],
  "low_stock_count": 3,
  "out_of_stock_count": 2
}
```

**UI Implementation:**
- Display badge/notification with alert counts
- Show separate lists for low stock vs out of stock
- Highlight urgency with colors (yellow for low, red for out)

---

## Purchase Order APIs

### 6. Get Purchase Orders List

Get paginated list of purchase orders with filtering.

**Endpoint:** `GET /api/purchase-orders`

**Permission:** `stock.view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| per_page | integer | No | 15 | Items per page (max 100) |
| search | string | No | - | Search PO number or supplier name |
| status | enum | No | - | Filter by status: `draft`, `sent`, `partial`, `received`, `cancelled` |
| supplier_id | integer | No | - | Filter by supplier (future feature) |
| from_date | date | No | - | Filter POs created after date (YYYY-MM-DD) |
| to_date | date | No | - | Filter POs created before date (YYYY-MM-DD) |
| sort_by | string | No | order_date | Sort field: `order_date`, `total`, `created_at` |
| sort_order | string | No | desc | Sort order: `asc`, `desc` |

**Example Request:**

```bash
GET /api/purchase-orders?status=sent&from_date=2025-12-01&sort_by=order_date&sort_order=desc
```

**Response (200 OK):**

```json
{
  "purchase_orders": [
    {
      "id": 1,
      "po_number": "PO-20251207-001",
      "supplier_id": null,
      "supplier_name": "ABC Suppliers",
      "order_date": "2025-12-07",
      "expected_delivery_date": "2025-12-15",
      "received_date": null,
      "status": "sent",
      "subtotal": "109000.00",
      "tax_percentage": "18.00",
      "tax_amount": "19620.00",
      "discount": "0.00",
      "total": "128620.00",
      "notes": "Urgent order for construction project",
      "created_by": 1,
      "created_by_name": "Admin User",
      "items": [
        {
          "id": 1,
          "item_id": 1,
          "item": {
            "id": 1,
            "serial_number": "CONST-000001",
            "name": "Portland Cement 50kg",
            "primary_unit": "bag",
            "picture_url": "https://example.com/storage/cement.jpg"
          },
          "quantity_ordered": "100.0000",
          "quantity_received": "0.0000",
          "remaining_quantity": 100,
          "unit_price": "850.00",
          "total": "85000.00",
          "is_fully_received": false,
          "is_partially_received": false
        },
        {
          "id": 2,
          "item_id": 2,
          "item": {
            "id": 2,
            "serial_number": "CONST-000002",
            "name": "Steel Rebar 12mm",
            "primary_unit": "piece",
            "picture_url": null
          },
          "quantity_ordered": "200.0000",
          "quantity_received": "0.0000",
          "remaining_quantity": 200,
          "unit_price": "120.00",
          "total": "24000.00",
          "is_fully_received": false,
          "is_partially_received": false
        }
      ],
      "created_at": "2025-12-07T10:30:00Z",
      "updated_at": "2025-12-07T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 15,
    "total": 25,
    "last_page": 2
  }
}
```

---

### 7. Get Single Purchase Order

Get detailed information for a specific purchase order.

**Endpoint:** `GET /api/purchase-orders/{id}`

**Permission:** `stock.view`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Purchase Order ID |

**Example Request:**

```bash
GET /api/purchase-orders/1
```

**Response (200 OK):**

Same format as single item in list response above.

**Error Responses:**

| Status | Response |
|--------|----------|
| 404 Not Found | `{ "message": "Purchase order not found" }` |

---

### 8. Create Purchase Order

Create a new purchase order.

**Endpoint:** `POST /api/purchase-orders`

**Permission:** `stock.create`

**Request Body:**

```json
{
  "supplier_name": "ABC Suppliers",
  "order_date": "2025-12-07",
  "expected_delivery_date": "2025-12-15",
  "tax_percentage": 18.00,
  "discount": 0.00,
  "notes": "Urgent order for construction project",
  "items": [
    {
      "item_id": 1,
      "quantity_ordered": 100.0000,
      "unit_price": 850.00
    },
    {
      "item_id": 2,
      "quantity_ordered": 200.0000,
      "unit_price": 120.00
    }
  ]
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| supplier_name | required, string, max:255 | Supplier name |
| supplier_id | nullable, integer | Future: Link to suppliers table |
| order_date | required, date | Order date |
| expected_delivery_date | nullable, date, after_or_equal:order_date | Expected delivery date |
| tax_percentage | required, numeric, 0-100 | Tax percentage |
| discount | nullable, numeric, min:0 | Discount amount |
| notes | nullable, string, max:1000 | Optional notes |
| items | required, array, min:1 | At least one item required |
| items.*.item_id | required, exists:items | Item must exist |
| items.*.quantity_ordered | required, numeric, gt:0 | Must be greater than 0 |
| items.*.unit_price | required, numeric, min:0 | Price per primary unit |

**Business Logic:**

1. **Auto-generates PO number** in format: `PO-YYYYMMDD-XXX`
   - Uses MySQL named lock to prevent duplicates
   - Sequence resets daily
2. **Calculates totals:**
   - `subtotal = sum(items.quantity_ordered × items.unit_price)`
   - `tax_amount = subtotal × (tax_percentage / 100)`
   - `total = subtotal + tax_amount - discount`
3. **Sets status** to `draft`
4. **Records creator** as `created_by`

**Response (201 Created):**

```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251207-001",
    "supplier_name": "ABC Suppliers",
    "order_date": "2025-12-07",
    "expected_delivery_date": "2025-12-15",
    "received_date": null,
    "status": "draft",
    "subtotal": "109000.00",
    "tax_percentage": "18.00",
    "tax_amount": "19620.00",
    "discount": "0.00",
    "total": "128620.00",
    "notes": "Urgent order for construction project",
    "created_by": 1,
    "created_by_name": "Admin User",
    "items": [ /* items array */ ],
    "created_at": "2025-12-07T10:30:00Z",
    "updated_at": "2025-12-07T10:30:00Z"
  },
  "message": "Purchase order created successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | Validation errors |

---

### 9. Update Purchase Order

Update an existing purchase order (draft only).

**Endpoint:** `PATCH /api/purchase-orders/{id}`

**Permission:** `stock.edit`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Purchase Order ID |

**Request Body:**

Same format as create, but all fields are optional (partial update).

**Validation:**
- Can only update POs with `status = 'draft'`
- Same validation rules as create endpoint

**Response (200 OK):**

```json
{
  "purchase_order": { /* updated PO with items */ },
  "message": "Purchase order updated successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Only draft purchase orders can be edited" }` |

---

### 10. Update Purchase Order Status

Update the status of a purchase order.

**Endpoint:** `PATCH /api/purchase-orders/{id}/status`

**Permission:** `stock.edit`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Purchase Order ID |

**Request Body:**

```json
{
  "status": "sent"
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| status | required, in:draft,sent,cancelled | Allowed status values |

**Business Rules:**
- Cannot change from `received` or `partial` status (use receive endpoint)
- Cannot change to `received` or `partial` (auto-set by system)

**Response (200 OK):**

```json
{
  "purchase_order": { /* updated PO */ },
  "message": "Purchase order status updated to sent"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Cannot change status of received or partially received orders." }` |

---

### 11. Receive Stock from Purchase Order

Record receipt of stock from a purchase order (full or partial).

**Endpoint:** `POST /api/purchase-orders/{id}/receive`

**Permission:** `stock.create`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Purchase Order ID |

**Request Body:**

```json
{
  "items": [
    {
      "id": 1,  // PO item ID (not item_id)
      "quantity_received": 100.0000
    },
    {
      "id": 2,
      "quantity_received": 150.0000  // Partial receipt (if ordered 200)
    }
  ]
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| items | required, array, min:1 | At least one item required |
| items.*.id | required, exists:purchase_order_items | PO item must exist |
| items.*.quantity_received | required, numeric, gt:0 | Must be greater than 0 |

**Business Logic (Critical):**

This is the main stock update logic. For each item being received:

1. **Update Purchase Order Item:**
   - `quantity_received += new_quantity_received`

2. **Update Item Stock:**
   - `quantity_on_hand += new_quantity_received`
   - `stock_value = quantity_on_hand × item.selling_price` (uses **selling price**, not purchase price)
   - `last_restocked_at = now()`

3. **Update Item Purchase Prices:**
   - `last_purchase_price = po_item.unit_price`
   - If `lowest_purchase_price` is NULL or `unit_price < lowest_purchase_price`:
     - `lowest_purchase_price = unit_price`
   - If `highest_purchase_price` is NULL or `unit_price > highest_purchase_price`:
     - `highest_purchase_price = unit_price`

4. **Create Stock Movement Record:**
   - `movement_type = 'purchase'`
   - `quantity = +new_quantity_received`
   - `reference_type = 'purchase_order'`
   - `reference_id = po.id`
   - `notes = "Received from {supplier_name} - PO {po_number}"`

5. **Update Purchase Order Status:**
   - If ALL items fully received: `status = 'received'`, `received_date = now()`
   - Else if ANY item partially received: `status = 'partial'`
   - Else: remains `'sent'`

**All operations run in a database transaction.**

**Response (200 OK):**

```json
{
  "purchase_order": {
    "id": 1,
    "po_number": "PO-20251207-001",
    "status": "partial",
    "items": [
      {
        "id": 1,
        "quantity_ordered": "100.0000",
        "quantity_received": "100.0000",
        "remaining_quantity": 0,
        "is_fully_received": true
      },
      {
        "id": 2,
        "quantity_ordered": "200.0000",
        "quantity_received": "150.0000",
        "remaining_quantity": 50,
        "is_partially_received": true
      }
    ]
  },
  "stock_movements": [
    {
      "id": 45,
      "item_id": 1,
      "movement_type": "purchase",
      "quantity": "100.0000",
      "previous_stock": "450.0000",
      "new_stock": "550.0000",
      "notes": "Received from ABC Suppliers - PO PO-20251207-001",
      "performed_by": 1,
      "performed_by_name": "Admin User",
      "created_at": "2025-12-07T16:00:00Z"
    },
    {
      "id": 46,
      "item_id": 2,
      "movement_type": "purchase",
      "quantity": "150.0000",
      "previous_stock": "80.0000",
      "new_stock": "230.0000",
      "notes": "Received from ABC Suppliers - PO PO-20251207-001",
      "performed_by": 1,
      "performed_by_name": "Admin User",
      "created_at": "2025-12-07T16:00:00Z"
    }
  ],
  "message": "Stock received successfully. 2 items updated."
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Cannot receive more than ordered. Item: Portland Cement, Remaining: 0, Attempting to receive: 10" }` |
| 422 Unprocessable Entity | `{ "message": "Purchase order must be in sent or partial status to receive stock" }` |

---

### 12. Delete Purchase Order

Delete a purchase order (draft only).

**Endpoint:** `DELETE /api/purchase-orders/{id}`

**Permission:** `stock.delete`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Purchase Order ID |

**Validation:**
- Can only delete POs with `status = 'draft'`

**Response (200 OK):**

```json
{
  "message": "Purchase order deleted successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Only draft purchase orders can be deleted" }` |

---

## Stock Movement APIs

### 13. Get Stock Movements

Get audit log of all stock changes with filtering.

**Endpoint:** `GET /api/stock/movements`

**Permission:** `stock.view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| per_page | integer | No | 15 | Items per page (max 100) |
| item_id | integer | No | - | Filter by specific item |
| movement_type | enum | No | - | Filter by type: `purchase`, `sale`, `adjustment`, `return` |
| from_date | date | No | - | Filter movements after date (YYYY-MM-DD) |
| to_date | date | No | - | Filter movements before date (YYYY-MM-DD) |
| sort_by | string | No | created_at | Sort field |
| sort_order | string | No | desc | Sort order: `asc`, `desc` |

**Example Request:**

```bash
GET /api/stock/movements?item_id=1&movement_type=purchase&from_date=2025-12-01
```

**Response (200 OK):**

```json
{
  "movements": [
    {
      "id": 1,
      "item_id": 1,
      "item": {
        "id": 1,
        "serial_number": "CONST-000001",
        "name": "Portland Cement 50kg",
        "primary_unit": "bag",
        "picture_url": "https://example.com/storage/cement.jpg"
      },
      "movement_type": "purchase",
      "quantity": "100.0000",
      "previous_stock": "350.0000",
      "new_stock": "450.0000",
      "reference_type": "purchase_order",
      "reference_id": 1,
      "notes": "Received from ABC Suppliers - PO PO-20251207-001",
      "performed_by": 1,
      "performed_by_name": "Admin User",
      "created_at": "2025-12-07T10:30:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 15,
    "total": 150,
    "last_page": 10
  }
}
```

**Notes:**
- This is a **read-only** audit log
- No update or delete endpoints
- Movements are automatically created by the system
- Immutable records for compliance and auditing

---

## Error Handling

### Standard Error Response Format

```json
{
  "message": "Error description",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### Common HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| 200 OK | Success | Request completed successfully |
| 201 Created | Created | Resource created successfully |
| 400 Bad Request | Invalid request | Malformed request body |
| 401 Unauthorized | Not authenticated | Missing or invalid token |
| 403 Forbidden | No permission | User lacks required permission |
| 404 Not Found | Not found | Resource doesn't exist |
| 422 Unprocessable Entity | Validation error | Request validation failed |
| 500 Internal Server Error | Server error | Unexpected server error |

### Validation Errors Example

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "supplier_name": ["Supplier name is required."],
    "items.0.quantity_ordered": ["Quantity must be greater than 0."],
    "items.1.item_id": ["Item not found."]
  }
}
```

### Business Logic Errors Example

```json
{
  "message": "Insufficient stock. Cannot adjust to negative quantity."
}
```

---

## Business Logic & Workflows

### Workflow 1: Create and Receive Purchase Order

**Step 1: Create PO (Draft)**

```javascript
const response = await fetch('/api/purchase-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    supplier_name: 'ABC Suppliers',
    order_date: '2025-12-07',
    expected_delivery_date: '2025-12-15',
    tax_percentage: 18,
    discount: 0,
    items: [
      { item_id: 1, quantity_ordered: 100, unit_price: 850 },
      { item_id: 2, quantity_ordered: 200, unit_price: 120 }
    ]
  })
});
// Creates PO-20251207-001 with status='draft'
```

**Step 2: Send to Supplier**

```javascript
const response = await fetch('/api/purchase-orders/1/status', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ status: 'sent' })
});
// Updates status to 'sent'
```

**Step 3: Receive Stock (Full or Partial)**

```javascript
const response = await fetch('/api/purchase-orders/1/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    items: [
      { id: 1, quantity_received: 100 },  // Full
      { id: 2, quantity_received: 150 }   // Partial (if ordered 200)
    ]
  })
});
// Updates stock, prices, creates movements, updates PO status
```

---

### Workflow 2: Manual Stock Adjustment

**Example: Write off damaged stock**

```javascript
const response = await fetch('/api/stock/adjust', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    item_id: 1,
    quantity: -10.5,  // Negative to subtract
    notes: 'Damaged stock write-off'
  })
});
// Reduces stock, recalculates value, creates audit log
```

---

### Workflow 3: Low Stock Alert

**Check for low stock items**

```javascript
const response = await fetch('/api/stock/alerts', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { low_stock, out_of_stock, low_stock_count, out_of_stock_count } = await response.json();

// Display notifications/badges
if (low_stock_count > 0 || out_of_stock_count > 0) {
  showNotification(`${low_stock_count} items low, ${out_of_stock_count} out of stock`);
}
```

---

## Unit System

### How It Works

- **All quantities stored in PRIMARY UNIT** in the database
- Frontend can display/input in secondary unit
- Backend always receives quantities already converted to primary unit

### Example Item Setup

```json
{
  "name": "Portland Cement",
  "primary_unit": "bag",
  "secondary_unit": "kg",
  "conversion_rate": 50
}
```

**Conversion Formula:**

```
secondary_quantity = primary_quantity × conversion_rate
primary_quantity = secondary_quantity ÷ conversion_rate
```

### Display Example

```
Database: 450 bags
Display: 
  - Primary: 450 bags
  - Secondary: 22,500 kg (450 × 50)
```

### Frontend Input Example

**User enters in kg:**

```javascript
const userInput = 1000; // kg
const conversionRate = 50; // 1 bag = 50 kg
const primaryQuantity = userInput / conversionRate; // 20 bags

// Send to API in primary unit
await fetch('/api/stock/adjust', {
  method: 'POST',
  body: JSON.stringify({
    item_id: 1,
    quantity: primaryQuantity  // 20 (in bags)
  })
});
```

---

## Implementation Examples

### React/TypeScript Example

#### Fetch Stock List

```typescript
interface StockListParams {
  page?: number;
  perPage?: number;
  search?: string;
  categoryId?: number;
  status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function fetchStockList(params: StockListParams) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.perPage) queryParams.append('per_page', params.perPage.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.categoryId) queryParams.append('category_id', params.categoryId.toString());
  if (params.status) queryParams.append('status', params.status);
  if (params.sortBy) queryParams.append('sort_by', params.sortBy);
  if (params.sortOrder) queryParams.append('sort_order', params.sortOrder);

  const response = await fetch(`/api/stock?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stock list');
  }

  return await response.json();
}

// Usage
const { stock, pagination } = await fetchStockList({
  page: 1,
  perPage: 20,
  status: 'low_stock',
  sortBy: 'quantity_on_hand',
  sortOrder: 'asc'
});
```

#### Create Purchase Order

```typescript
interface CreatePOData {
  supplier_name: string;
  order_date: string;
  expected_delivery_date?: string;
  tax_percentage: number;
  discount?: number;
  notes?: string;
  items: Array<{
    item_id: number;
    quantity_ordered: number;
    unit_price: number;
  }>;
}

async function createPurchaseOrder(data: CreatePOData) {
  const response = await fetch('/api/purchase-orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create purchase order');
  }

  return await response.json();
}

// Usage
try {
  const result = await createPurchaseOrder({
    supplier_name: 'ABC Suppliers',
    order_date: '2025-12-07',
    expected_delivery_date: '2025-12-15',
    tax_percentage: 18,
    discount: 0,
    notes: 'Urgent order',
    items: [
      { item_id: 1, quantity_ordered: 100, unit_price: 850 },
      { item_id: 2, quantity_ordered: 200, unit_price: 120 }
    ]
  });
  
  console.log('PO created:', result.purchase_order.po_number);
  showSuccess(result.message);
} catch (error) {
  showError(error.message);
}
```

#### Receive Stock

```typescript
interface ReceiveStockData {
  items: Array<{
    id: number; // PO item ID
    quantity_received: number;
  }>;
}

async function receiveStock(poId: number, data: ReceiveStockData) {
  const response = await fetch(`/api/purchase-orders/${poId}/receive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to receive stock');
  }

  return await response.json();
}

// Usage
try {
  const result = await receiveStock(1, {
    items: [
      { id: 1, quantity_received: 100 },
      { id: 2, quantity_received: 150 }
    ]
  });
  
  console.log('Stock received:', result.stock_movements.length, 'items updated');
  console.log('PO status:', result.purchase_order.status);
  showSuccess(result.message);
} catch (error) {
  showError(error.message);
}
```

#### Display Stock with Unit Conversion

```typescript
interface ItemStock {
  quantity_on_hand: string;
  item: {
    primary_unit: string;
    secondary_unit?: string;
    conversion_rate?: string;
  };
}

function displayStockQuantity(stock: ItemStock): string {
  const primaryQty = parseFloat(stock.quantity_on_hand);
  const primaryUnit = stock.item.primary_unit;
  
  let display = `${primaryQty} ${primaryUnit}`;
  
  if (stock.item.secondary_unit && stock.item.conversion_rate) {
    const conversionRate = parseFloat(stock.item.conversion_rate);
    const secondaryQty = primaryQty * conversionRate;
    display += ` (${secondaryQty} ${stock.item.secondary_unit})`;
  }
  
  return display;
}

// Example output: "450 bags (22,500 kg)"
```

---

### Vue.js Example

#### Composable for Stock Management

```typescript
// useStock.ts
import { ref, computed } from 'vue';

export function useStock() {
  const stockList = ref<ItemStock[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchStock = async (params: StockListParams = {}) => {
    loading.value = true;
    error.value = null;
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/stock?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch stock');
      
      const data = await response.json();
      stockList.value = data.stock;
      return data;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const adjustStock = async (itemId: number, quantity: number, notes?: string) => {
    try {
      const response = await fetch('/api/stock/adjust', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ item_id: itemId, quantity, notes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    } catch (e) {
      error.value = e.message;
      throw e;
    }
  };

  const lowStockCount = computed(() => {
    return stockList.value.filter(s => s.stock_status === 'low_stock').length;
  });

  const outOfStockCount = computed(() => {
    return stockList.value.filter(s => s.stock_status === 'out_of_stock').length;
  });

  return {
    stockList,
    loading,
    error,
    fetchStock,
    adjustStock,
    lowStockCount,
    outOfStockCount
  };
}
```

---

## Summary

This Stock Management System provides:

✅ **Complete Inventory Tracking** - Real-time stock levels with alerts  
✅ **Purchase Order Management** - Create, send, receive, track orders  
✅ **Automatic Price Updates** - Tracks last, lowest, highest purchase prices  
✅ **Stock Movements Audit Log** - Immutable, complete history of all changes  
✅ **Low Stock Alerts** - Automatic alerts for items at or below reorder level  
✅ **Dual Unit Support** - Primary & secondary units with automatic conversion  
✅ **Serial Number Generation** - Unique PO numbers (PO-YYYYMMDD-XXX format)  
✅ **Permission-based Access Control** - Fine-grained permissions  
✅ **Transaction Safety** - Atomic operations with MySQL named locks  
✅ **Stock Value Tracking** - Uses **selling price** to show revenue potential  

All APIs return proper status codes, include validation errors, and are protected by permissions.

---

## Support & Questions

For technical questions or issues:
- Review this documentation
- Check error messages in API responses
- Verify authentication token and permissions
- Ensure all required fields are provided
- Validate data formats (dates, decimals, etc.)

---

**Last Updated:** December 7, 2025  
**API Version:** 1.0
