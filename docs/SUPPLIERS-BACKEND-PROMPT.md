# Suppliers Module - Frontend Integration Documentation

## Overview

This document provides comprehensive details for integrating the **Suppliers Management System** with the frontend application. The Suppliers module manages supplier relationships, contact information, purchase history, and seamlessly integrates with the Stock Management and Purchase Order systems.

---

## Table of Contents

1. [Authentication & Permissions](#authentication--permissions)
2. [Base URL & Headers](#base-url--headers)
3. [Data Models](#data-models)
4. [Supplier APIs](#supplier-apis)
5. [Integration with Purchase Orders](#integration-with-purchase-orders)
6. [Error Handling](#error-handling)
7. [Business Logic & Workflows](#business-logic--workflows)
8. [Implementation Examples](#implementation-examples)

---

## Authentication & Permissions

All endpoints require authentication using Laravel Sanctum tokens.

### Required Permissions

| Operation | Permission | Alternative | Description |
|-----------|-----------|-------------|-------------|
| View suppliers | `suppliers.view` | `stock.view` | View supplier list and details |
| Create supplier | `suppliers.create` | - | Create new suppliers |
| Edit supplier | `suppliers.edit` | - | Update supplier information |
| Delete supplier | `suppliers.delete` | - | Delete suppliers |

### Authentication Header

```
Authorization: Bearer {token}
```

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

### Supplier

```typescript
interface Supplier {
  id: number;
  serial_number: string; // Format: SUPP-YYYYMMDD-XXX
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  picture_url: string | null; // Profile picture (base64 or URL)
  rating: number; // 1-10 rating scale
  status: 'active' | 'inactive';
  customer_id: number | null; // Link if supplier is also a customer
  customer: {
    id: number;
    serial_number: string;
    name: string;
    email: string;
  } | null;
  total_purchase_amount: string; // Decimal(15,2) - Lifetime purchases
  items_supplied: string | null; // Description of products they provide
  notes: string | null; // Payment terms, special conditions
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

---

## Supplier APIs

### 1. Get Suppliers List

Get paginated list of suppliers with filtering and sorting.

**Endpoint:** `GET /api/suppliers`

**Permission:** `suppliers.view` OR `stock.view`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| per_page | integer | No | 15 | Items per page (max 100) |
| search | string | No | - | Search by name, serial number, contact person, email, or phone |
| status | enum | No | - | Filter by status: `active`, `inactive` |
| rating_filter | string | No | - | Filter by rating ranges |
| sort_by | string | No | name | Sort field: `name`, `total_purchase_amount`, `rating`, `created_at` |
| sort_order | string | No | asc | Sort order: `asc`, `desc` |

**Rating Filter Options:**
- `9-10`: Excellent suppliers
- `7-8`: Good suppliers
- `5-6`: Average suppliers
- `1-4`: Poor suppliers

**Example Request:**

```bash
GET /api/suppliers?page=1&per_page=20&status=active&rating_filter=9-10&sort_by=name
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "serial_number": "SUPP-20251207-001",
      "name": "ABC Construction Suppliers",
      "contact_person": "Ahmed Ali",
      "email": "ahmed@abcsuppliers.com",
      "phone": "+92-300-1234567",
      "address": "123 Industrial Area, Karachi",
      "picture_url": "https://example.com/storage/supplier-pictures/abc.jpg",
      "rating": 9,
      "status": "active",
      "customer_id": 5,
      "customer": {
        "id": 5,
        "serial_number": "CUST-20251201-001",
        "name": "ABC Construction Suppliers",
        "email": "ahmed@abcsuppliers.com"
      },
      "total_purchase_amount": "2450000.00",
      "items_supplied": "Construction materials, cement, steel, bricks",
      "notes": "Net 30 payment terms. Free delivery on orders > PKR 100,000",
      "created_at": "2025-12-01T10:00:00Z",
      "updated_at": "2025-12-07T14:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 45,
    "last_page": 3,
    "from": 1,
    "to": 20
  }
}
```

---

### 2. Get Single Supplier

Get detailed information for a specific supplier.

**Endpoint:** `GET /api/suppliers/{id}`

**Permission:** `suppliers.view` OR `stock.view`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Supplier ID |

**Example Request:**

```bash
GET /api/suppliers/1
```

**Response (200 OK):**

```json
{
  "supplier": {
    "id": 1,
    "serial_number": "SUPP-20251207-001",
    "name": "ABC Construction Suppliers",
    "contact_person": "Ahmed Ali",
    "email": "ahmed@abcsuppliers.com",
    "phone": "+92-300-1234567",
    "address": "123 Industrial Area, Karachi",
    "picture_url": "https://example.com/storage/supplier-pictures/abc.jpg",
    "rating": 9,
    "status": "active",
    "customer_id": 5,
    "customer": {
      "id": 5,
      "serial_number": "CUST-20251201-001",
      "name": "ABC Construction Suppliers",
      "email": "ahmed@abcsuppliers.com"
    },
    "total_purchase_amount": "2450000.00",
    "items_supplied": "Construction materials, cement, steel, bricks",
    "notes": "Net 30 payment terms. Free delivery on orders > PKR 100,000",
    "created_at": "2025-12-01T10:00:00Z",
    "updated_at": "2025-12-07T14:30:00Z"
  }
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 404 Not Found | `{ "message": "Supplier not found" }` |

---

### 3. Create Supplier

Create a new supplier.

**Endpoint:** `POST /api/suppliers`

**Permission:** `suppliers.create`

**Request Body:**

```json
{
  "name": "ABC Construction Suppliers",
  "contact_person": "Ahmed Ali",
  "email": "ahmed@abcsuppliers.com",
  "phone": "+92-300-1234567",
  "address": "123 Industrial Area, Karachi",
  "picture_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "rating": 9,
  "status": "active",
  "customer_id": 5,
  "items_supplied": "Construction materials, cement, steel, bricks",
  "notes": "Net 30 payment terms. Free delivery on orders > PKR 100,000"
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| name | required, string, max:255 | Supplier name |
| contact_person | nullable, string, max:255 | Contact person name |
| email | nullable, email, max:255, unique:suppliers | Email address (must be unique) |
| phone | nullable, string, max:50 | Phone number |
| address | nullable, string | Full address |
| picture_url | nullable, string | Base64 data or URL |
| rating | required, integer, 1-10 | Performance rating |
| status | required, in:active,inactive | Active or inactive |
| customer_id | nullable, exists:customers | Link to customer if applicable |
| items_supplied | nullable, string | Description of products/services |
| notes | nullable, string | Payment terms, delivery details, etc. |

**Business Logic:**

1. **Auto-generates serial number** in format: `SUPP-YYYYMMDD-XXX`
   - Uses MySQL named lock to prevent duplicates
   - Sequence resets daily
2. **Initializes total_purchase_amount** to 0
3. **Validates customer_id** if provided
4. **Handles picture upload** (base64 to file if needed)

**Response (201 Created):**

```json
{
  "supplier": {
    "id": 1,
    "serial_number": "SUPP-20251207-001",
    "name": "ABC Construction Suppliers",
    "total_purchase_amount": "0.00",
    /* ... other fields ... */
  },
  "message": "Supplier created successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | Validation errors (duplicate email, invalid customer, etc.) |

---

### 4. Update Supplier

Update an existing supplier.

**Endpoint:** `PATCH /api/suppliers/{id}`

**Permission:** `suppliers.edit`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Supplier ID |

**Request Body:** Same as Create (all fields optional for partial update)

```json
{
  "rating": 10,
  "notes": "Updated payment terms - Net 45",
  "status": "inactive"
}
```

**Response (200 OK):**

```json
{
  "supplier": { /* updated supplier object */ },
  "message": "Supplier updated successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 404 Not Found | Supplier not found |
| 422 Unprocessable Entity | Validation errors |

---

### 5. Delete Supplier

Delete a supplier (soft delete).

**Endpoint:** `DELETE /api/suppliers/{id}`

**Permission:** `suppliers.delete`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Supplier ID |

**Validation:**
- Cannot delete supplier with existing purchase orders (except draft or cancelled)
- Uses soft delete to preserve history

**Response (200 OK):**

```json
{
  "message": "Supplier deleted successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Cannot delete supplier with active purchase orders" }` |

---

### 6. Bulk Delete Suppliers

Delete multiple suppliers at once.

**Endpoint:** `POST /api/suppliers/bulk-delete`

**Permission:** `suppliers.delete`

**Request Body:**

```json
{
  "ids": [1, 2, 3]
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| ids | required, array, min:1 | Array of supplier IDs |
| ids.* | integer, exists:suppliers | Each ID must exist |

**Response (200 OK):**

```json
{
  "message": "2 supplier(s) deleted successfully. Failed to delete 1 supplier(s) with active purchase orders",
  "deleted_count": 2,
  "failed_ids": [3]
}
```

**Notes:**
- Suppliers with active purchase orders will not be deleted
- Operation continues for valid deletions
- Returns count of successful and failed deletions

---

## Integration with Purchase Orders

### Automatic Supplier Linking

When creating a Purchase Order, the system automatically tries to link it to an existing supplier.

**How It Works:**

1. **Exact Match:** Tries to find supplier with exact name match
2. **Fuzzy Match:** Tries case-insensitive partial match
3. **No Match:** Stores supplier name only, `supplier_id` remains NULL

**Example:**

```javascript
// User creates PO with supplier name
POST /api/purchase-orders
{
  "supplier_name": "ABC Construction",
  // ... other fields
}

// Backend logic:
// 1. Searches for supplier named "ABC Construction"
// 2. If found: Sets supplier_id and uses supplier's name
// 3. If not found: supplier_id = null, stores "ABC Construction" as text
```

### Total Purchase Amount Updates

The supplier's `total_purchase_amount` is automatically updated when:

1. **Purchase Order is Received** (status changes to `partial` or `received`)
2. **Purchase Order is Updated**
3. **Purchase Order is Deleted**

**Calculation:**

```
total_purchase_amount = SUM(total) of all POs with status 'partial' or 'received'
```

**Example:**

```
Supplier: ABC Construction Suppliers

Purchase Orders:
- PO-20251201-001: PKR 500,000 (received)
- PO-20251203-002: PKR 750,000 (received)
- PO-20251205-003: PKR 1,200,000 (partial)
- PO-20251207-004: PKR 300,000 (draft) ← Not counted

Total Purchase Amount: PKR 2,450,000
```

---

## Supplier-Customer Relationship

### Why Link Suppliers to Customers?

Some businesses act as both:
- You **buy from** them (supplier)
- You **sell to** them (customer)

### Benefits:

1. **Unified Contact Information** - Update once, reflects everywhere
2. **Credit Offset** - Net outstanding amounts
3. **Complete Relationship View** - See both purchase and sale history
4. **Better Reporting** - Analyze bi-directional trade

### Implementation:

**Linking:** Set `customer_id` when creating/updating supplier

```json
POST /api/suppliers
{
  "name": "ABC Construction",
  "customer_id": 5,  // Links to existing customer
  // ... other fields
}
```

**UI Display Suggestions:**

**In Supplier Profile:**
```
📦 Supplier: ABC Construction
✨ Also a Customer: View Customer Profile →

Purchases from this supplier: PKR 2,450,000
Sales to this customer: PKR 1,800,000
Net position: We owe PKR 650,000
```

**In Customer Profile:**
```
👤 Customer: ABC Construction
🏭 Also a Supplier: View Supplier Profile →
```

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
| 404 Not Found | Not found | Supplier doesn't exist |
| 422 Unprocessable Entity | Validation error | Request validation failed |
| 500 Internal Server Error | Server error | Unexpected server error |

### Validation Errors Example

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["This email address is already registered."],
    "rating": ["Rating must be between 1 and 10."],
    "customer_id": ["Customer not found."]
  }
}
```

### Business Logic Errors Example

```json
{
  "message": "Cannot delete supplier with active purchase orders"
}
```

---

## Business Logic & Workflows

### Workflow 1: Create Regular Supplier

```javascript
const response = await fetch('/api/suppliers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'XYZ Hardware Store',
    contact_person: 'Bilal Khan',
    email: 'bilal@xyzhardware.com',
    phone: '+92-300-7654321',
    rating: 7,
    status: 'active',
    items_supplied: 'Hardware items, tools, paint supplies',
    notes: 'Cash on delivery preferred'
  })
});

// Creates SUPP-20251207-002 with total_purchase_amount = 0
```

---

### Workflow 2: Create Supplier (Also Customer)

```javascript
const response = await fetch('/api/suppliers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'ABC Construction',
    email: 'abc@construction.com',
    rating: 9,
    status: 'active',
    customer_id: 5,  // Link to existing customer
    items_supplied: 'Construction materials',
    notes: 'Net 30 payment terms'
  })
});

// Links to customer #5, shows relationship in both profiles
```

---

### Workflow 3: Create PO with Supplier Auto-Linking

```javascript
// Step 1: Create PO with supplier name
const response = await fetch('/api/purchase-orders', {
  method: 'POST',
  body: JSON.stringify({
    supplier_name: 'ABC Construction Suppliers',  // Matches existing supplier
    order_date: '2025-12-07',
    tax_percentage: 18,
    items: [
      { item_id: 1, quantity_ordered: 100, unit_price: 850 }
    ]
  })
});

// Backend automatically:
// 1. Searches for supplier "ABC Construction Suppliers"
// 2. Finds exact match (supplier ID 1)
// 3. Links PO to supplier_id = 1

// Response includes:
{
  "purchase_order": {
    "supplier_id": 1,
    "supplier_name": "ABC Construction Suppliers",
    "supplier": {
      "id": 1,
      "serial_number": "SUPP-20251207-001",
      "name": "ABC Construction Suppliers",
      "status": "active"
    }
  }
}
```

---

### Workflow 4: Receive PO → Auto-Update Supplier Total

```javascript
// Receive stock from purchase order
const response = await fetch('/api/purchase-orders/1/receive', {
  method: 'POST',
  body: JSON.stringify({
    items: [
      { id: 1, quantity_received: 100 }
    ]
  })
});

// Backend automatically:
// 1. Receives items, updates stock
// 2. Updates PO status to 'received'
// 3. Recalculates supplier's total_purchase_amount
// 4. Supplier #1 total now: PKR 2,450,000 + new PO total
```

---

### Workflow 5: Filter and Search Suppliers

```javascript
// Get excellent active suppliers
const response = await fetch(
  '/api/suppliers?status=active&rating_filter=9-10&sort_by=name',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);

// Returns suppliers with:
// - status = 'active'
// - rating between 9-10
// - sorted by name (ascending)
```

---

## Implementation Examples

### React/TypeScript Example

#### Fetch Suppliers List

```typescript
interface FetchSuppliersParams {
  page?: number;
  perPage?: number;
  search?: string;
  status?: 'active' | 'inactive';
  ratingFilter?: '9-10' | '7-8' | '5-6' | '1-4';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function fetchSuppliers(params: FetchSuppliersParams) {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.perPage) queryParams.append('per_page', params.perPage.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.ratingFilter) queryParams.append('rating_filter', params.ratingFilter);
  if (params.sortBy) queryParams.append('sort_by', params.sortBy);
  if (params.sortOrder) queryParams.append('sort_order', params.sortOrder);

  const response = await fetch(`/api/suppliers?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch suppliers');
  }

  return await response.json();
}

// Usage
const { data: suppliers, meta } = await fetchSuppliers({
  page: 1,
  perPage: 20,
  status: 'active',
  ratingFilter: '9-10',
  sortBy: 'name',
  sortOrder: 'asc'
});
```

---

#### Create Supplier

```typescript
interface CreateSupplierData {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  picture_url?: string;
  rating: number;
  status: 'active' | 'inactive';
  customer_id?: number;
  items_supplied?: string;
  notes?: string;
}

async function createSupplier(data: CreateSupplierData) {
  const response = await fetch('/api/suppliers', {
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
    throw new Error(error.message || 'Failed to create supplier');
  }

  return await response.json();
}

// Usage
try {
  const result = await createSupplier({
    name: 'ABC Construction Suppliers',
    contact_person: 'Ahmed Ali',
    email: 'ahmed@abcsuppliers.com',
    phone: '+92-300-1234567',
    rating: 9,
    status: 'active',
    items_supplied: 'Construction materials',
    notes: 'Net 30 payment terms'
  });
  
  console.log('Supplier created:', result.supplier.serial_number);
  showSuccess(result.message);
} catch (error) {
  showError(error.message);
}
```

---

#### Display Supplier with Customer Link

```typescript
interface Supplier {
  id: number;
  name: string;
  customer_id: number | null;
  customer: {
    id: number;
    name: string;
  } | null;
  total_purchase_amount: string;
  // ... other fields
}

function SupplierCard({ supplier }: { supplier: Supplier }) {
  return (
    <div className="supplier-card">
      <h3>{supplier.name}</h3>
      
      {supplier.customer && (
        <div className="customer-badge">
          Also Customer: 
          <Link to={`/customers/${supplier.customer.id}`}>
            {supplier.customer.name}
          </Link>
        </div>
      )}
      
      <div className="stats">
        <span>Total Purchases: PKR {formatNumber(supplier.total_purchase_amount)}</span>
      </div>
    </div>
  );
}
```

---

#### Rating Display Component

```typescript
function RatingDisplay({ rating }: { rating: number }) {
  const getRatingColor = (rating: number): string => {
    if (rating >= 9) return 'green';
    if (rating >= 7) return 'blue';
    if (rating >= 5) return 'yellow';
    return 'red';
  };

  const getRatingLabel = (rating: number): string => {
    if (rating >= 9) return 'Excellent';
    if (rating >= 7) return 'Good';
    if (rating >= 5) return 'Average';
    return 'Poor';
  };

  return (
    <div className={`rating rating-${getRatingColor(rating)}`}>
      <span className="rating-value">{rating}/10</span>
      <span className="rating-label">{getRatingLabel(rating)}</span>
    </div>
  );
}
```

---

### Vue.js Example

#### Composable for Supplier Management

```typescript
// useSuppliers.ts
import { ref, computed } from 'vue';

export function useSuppliers() {
  const suppliers = ref<Supplier[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchSuppliers = async (params: FetchSuppliersParams = {}) => {
    loading.value = true;
    error.value = null;
    
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/suppliers?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch suppliers');
      
      const data = await response.json();
      suppliers.value = data.data;
      return data;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const createSupplier = async (data: CreateSupplierData) => {
    try {
      const response = await fetch('/api/suppliers', {
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
        throw new Error(error.message);
      }

      return await response.json();
    } catch (e) {
      error.value = e.message;
      throw e;
    }
  };

  const activeSuppliers = computed(() => {
    return suppliers.value.filter(s => s.status === 'active');
  });

  const excellentSuppliers = computed(() => {
    return suppliers.value.filter(s => s.rating >= 9);
  });

  return {
    suppliers,
    loading,
    error,
    fetchSuppliers,
    createSupplier,
    activeSuppliers,
    excellentSuppliers
  };
}
```

---

## Summary

The Suppliers module provides:

✅ **Complete supplier management** (CRUD operations)  
✅ **Unique serial numbers** (SUPP-YYYYMMDD-XXX format)  
✅ **Customer linking** (bi-directional relationships)  
✅ **Purchase tracking** (automatic lifetime total calculation)  
✅ **Rating system** (1-10 scale for supplier performance)  
✅ **Status management** (active/inactive filtering)  
✅ **Items & notes tracking** (products supplied, payment terms)  
✅ **Profile pictures** (base64 or URL support)  
✅ **Advanced search & filtering** (name, status, rating, etc.)  
✅ **Automatic PO integration** (auto-linking by name)  
✅ **Soft deletes** (preserve history and audit trails)  

All APIs return proper status codes, include validation errors, and integrate seamlessly with the Stock Management and Purchase Order systems.

---

**Last Updated:** December 7, 2025  
**API Version:** 1.0
