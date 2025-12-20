# Rental Management API Documentation

This document provides comprehensive documentation for all rental management APIs including rental categories, rental items, rental agreements, payments, and returns.

## Table of Contents

1. [Rental Categories APIs](#rental-categories-apis)
2. [Rental Items APIs](#rental-items-apis)
3. [Rental Agreements APIs](#rental-agreements-apis)
4. [Rental Payments APIs](#rental-payments-apis)
5. [Rental Returns APIs](#rental-returns-apis)
6. [Data Models](#data-models)
7. [Business Rules](#business-rules)

---

## Rental Categories APIs

### List Rental Categories

**Endpoint:** `GET /api/rentals/categories`

**Description:** Retrieve a paginated list of rental categories with optional filtering and search.

**Authentication:** Required (`auth:sanctum`)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, slug, serial_alias, or description |
| `status` | string | No | Filter by status: `active`, `inactive` |
| `sort_by` | string | No | Sort field (default: `created_at`) |
| `sort_order` | string | No | Sort order: `asc`, `desc` (default: `desc`) |
| `per_page` | integer | No | Number of items per page (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "name": "Construction Equipment",
      "slug": "construction-equipment",
      "serial_alias": "CE",
      "description": "Heavy construction equipment for rent",
      "status": "active",
      "created_at": "2025-12-13T10:00:00.000000Z",
      "updated_at": "2025-12-13T10:00:00.000000Z"
    },
    {
      "id": 2,
      "name": "Office Furniture",
      "slug": "office-furniture",
      "serial_alias": "OF",
      "description": "Office furniture and equipment",
      "status": "active",
      "created_at": "2025-12-13T11:00:00.000000Z",
      "updated_at": "2025-12-13T11:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 2,
    "last_page": 1,
    "from": 1,
    "to": 2
  }
}
```

---

### Get Rental Category by ID

**Endpoint:** `GET /api/rentals/categories/{id}`

**Description:** Retrieve detailed information about a specific rental category.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental category ID |

**Response:** `200 OK`

```json
{
  "category": {
    "id": 1,
    "name": "Construction Equipment",
    "slug": "construction-equipment",
    "serial_alias": "CE",
    "description": "Heavy construction equipment for rent",
    "status": "active",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:00:00.000000Z"
  }
}
```

**Error Responses:**

`404 Not Found` - Category not found
```json
{
  "message": "No query results for model [App\\Models\\RentalCategory]"
}
```

---

### Create Rental Category

**Endpoint:** `POST /api/rentals/categories`

**Description:** Create a new rental category.

**Authentication:** Required (`auth:sanctum`)

**Request Body:**

```json
{
  "name": "Construction Equipment",
  "slug": "construction-equipment",
  "serial_alias": "CE",
  "description": "Heavy construction equipment for rent",
  "status": "active"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 255 characters, unique |
| `slug` | string | No | Max 255 characters, unique, auto-generated from name if not provided |
| `serial_alias` | string | No | Max 10 characters, uppercase alphanumeric only, unique |
| `description` | string | No | Optional description |
| `status` | string | No | Must be: `active` or `inactive` (default: `active`) |

**Response:** `201 Created`

```json
{
  "category": {
    "id": 1,
    "name": "Construction Equipment",
    "slug": "construction-equipment",
    "serial_alias": "CE",
    "description": "Heavy construction equipment for rent",
    "status": "active",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:00:00.000000Z"
  },
  "message": "Rental category created successfully."
}
```

**Error Responses:**

`422 Unprocessable Entity` - Validation errors
```json
{
  "message": "Failed to create rental category.",
  "error": "The name has already been taken."
}
```

---

### Update Rental Category

**Endpoint:** `PATCH /api/rentals/categories/{id}`

**Description:** Update an existing rental category.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental category ID |

**Request Body:** All fields are optional (partial update)

```json
{
  "name": "Updated Category Name",
  "status": "inactive",
  "description": "Updated description"
}
```

**Validation Rules:** Same as Create, but all fields are optional and uniqueness checks exclude current record.

**Response:** `200 OK`

```json
{
  "category": {
    "id": 1,
    "name": "Updated Category Name",
    "slug": "construction-equipment",
    "serial_alias": "CE",
    "description": "Updated description",
    "status": "inactive",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T12:00:00.000000Z"
  },
  "message": "Rental category updated successfully."
}
```

**Error Responses:**

`422 Unprocessable Entity` - Validation errors
```json
{
  "message": "Failed to update rental category.",
  "error": "The name has already been taken."
}
```

---

### Delete Rental Category

**Endpoint:** `DELETE /api/rentals/categories/{id}`

**Description:** Soft delete a rental category. Fails if category has associated rental items.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental category ID |

**Response:** `200 OK`

```json
{
  "message": "Rental category deleted successfully."
}
```

**Error Responses:**

`409 Conflict` - Category has associated rental items
```json
{
  "message": "Failed to delete rental category.",
  "error": "Category has associated rental items. Please reassign or delete items first."
}
```

---

### Bulk Delete Rental Categories

**Endpoint:** `POST /api/rentals/categories/bulk-delete`

**Description:** Delete multiple rental categories at once. Returns count of successfully deleted items and list of failed IDs.

**Authentication:** Required (`auth:sanctum`)

**Request Body:**

```json
{
  "ids": [1, 2, 3]
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `ids` | array | Yes | Array of category IDs |
| `ids.*` | integer | Yes | Must exist in rental_categories table |

**Response:** `200 OK`

```json
{
  "message": "2 rental category(ies) deleted successfully.",
  "deleted_count": 2,
  "failed_ids": [3]
}
```

**Note:** Categories with associated rental items will be skipped and included in `failed_ids`.

---

## Rental Items APIs

### List Rental Items

**Endpoint:** `GET /api/rentals/items`

**Description:** Retrieve a paginated list of rental items with optional filtering.

**Authentication:** Required (`auth:sanctum`)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name or SKU |
| `category_id` | integer | No | Filter by rental category ID |
| `status` | string | No | Filter by status: `available`, `rented`, `maintenance` |
| `sort_by` | string | No | Sort field (default: `created_at`) |
| `sort_order` | string | No | Sort order: `asc`, `desc` (default: `desc`) |
| `per_page` | integer | No | Number of items per page (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "rental_category_id": 1,
      "rental_category": {
        "id": 1,
        "name": "Construction Equipment",
        "serial_alias": "CE"
      },
      "name": "Excavator Model X-200",
      "sku": "CE-000001",
      "quantity_total": 5.0000,
      "quantity_available": 3.0000,
      "rental_price_total": 50000.00,
      "rental_period_type": "monthly",
      "rental_period_length": 3,
      "auto_divide_rent": true,
      "rent_per_period": 16666.67,
      "security_deposit_amount": null,
      "status": "available",
      "created_at": "2025-12-13T10:00:00.000000Z",
      "updated_at": "2025-12-13T10:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

---

### Get Rental Item by ID

**Endpoint:** `GET /api/rentals/items/{id}`

**Description:** Retrieve detailed information about a specific rental item.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental item ID |

**Response:** `200 OK`

```json
{
  "item": {
    "id": 1,
    "rental_category_id": 1,
    "rental_category": {
      "id": 1,
      "name": "Construction Equipment",
      "serial_alias": "CE"
    },
    "name": "Excavator Model X-200",
    "sku": "CE-000001",
    "quantity_total": 5.0000,
    "quantity_available": 3.0000,
    "rental_price_total": 50000.00,
    "rental_period_type": "monthly",
    "rental_period_length": 3,
    "auto_divide_rent": true,
    "rent_per_period": 16666.67,
    "security_deposit_amount": 10000.00,
    "status": "available",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:00:00.000000Z"
  }
}
```

---

### Create Rental Item

**Endpoint:** `POST /api/rentals/items`

**Description:** Create a new rental item. SKU is auto-generated if not provided based on category's serial_alias.

**Authentication:** Required (`auth:sanctum`)

**Request Body:**

```json
{
  "rental_category_id": 1,
  "name": "Excavator Model X-200",
  "sku": "CE-000001",
  "quantity_total": 5,
  "quantity_available": 5,
  "rental_price_total": 50000.00,
  "rental_period_type": "monthly",
  "rental_period_length": 3,
  "auto_divide_rent": true,
  "status": "available"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `rental_category_id` | integer | Yes | Must exist in rental_categories table |
| `name` | string | Yes | Max 255 characters |
| `sku` | string | No | Max 255 characters, unique, auto-generated if not provided |
| `quantity_total` | numeric | Yes | Must be >= 0 |
| `quantity_available` | numeric | No | Must be >= 0, defaults to quantity_total if not provided |
| `rental_price_total` | numeric | Yes | Must be >= 0 |
| `rental_period_type` | string | Yes | Must be: `daily`, `weekly`, `monthly`, or `custom` |
| `rental_period_length` | integer | Yes | Must be >= 1 |
| `auto_divide_rent` | boolean | No | Default: `false` |
| `rent_per_period` | numeric | No | Calculated automatically if auto_divide_rent is true |
| `security_deposit_amount` | numeric | No | Must be >= 0, default: 0 |
| `status` | string | No | Must be: `available`, `rented`, or `maintenance` (default: `available`) |

**Business Rules:**
- If `auto_divide_rent` is `true`, `rent_per_period` is automatically calculated as `rental_price_total / rental_period_length`
- If `sku` is not provided, it's auto-generated using the format: `{category_serial_alias}-{6_digit_number}` (e.g., `CE-000001`)
- If `quantity_available` is not provided, it's set to `quantity_total`

**Response:** `201 Created`

```json
{
  "item": {
    "id": 1,
    "rental_category_id": 1,
    "rental_category": {
      "id": 1,
      "name": "Construction Equipment",
      "serial_alias": "CE"
    },
    "name": "Excavator Model X-200",
    "sku": "CE-000001",
    "quantity_total": 5.0000,
    "quantity_available": 5.0000,
    "rental_price_total": 50000.00,
    "rental_period_type": "monthly",
    "rental_period_length": 3,
    "auto_divide_rent": true,
    "rent_per_period": 16666.67,
    "security_deposit_amount": 10000.00,
    "status": "available",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:00:00.000000Z"
  },
  "message": "Rental item created successfully."
}
```

---

### Update Rental Item

**Endpoint:** `PATCH /api/rentals/items/{id}`

**Description:** Update an existing rental item.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental item ID |

**Request Body:** All fields are optional (partial update)

```json
{
  "name": "Updated Excavator Name",
  "quantity_total": 10,
  "status": "maintenance"
}
```

**Business Rules:**
- If `quantity_total` is updated, `quantity_available` is adjusted by the difference
- If `auto_divide_rent` is `true` and `rental_price_total` or `rental_period_length` changes, `rent_per_period` is recalculated

**Response:** `200 OK`

```json
{
  "item": {
    "id": 1,
    "rental_category_id": 1,
    "rental_category": {
      "id": 1,
      "name": "Construction Equipment",
      "serial_alias": "CE"
    },
    "name": "Updated Excavator Name",
    "sku": "CE-000001",
    "quantity_total": 10.0000,
    "quantity_available": 8.0000,
    "rental_price_total": 50000.00,
    "rental_period_type": "monthly",
    "rental_period_length": 3,
    "auto_divide_rent": true,
    "rent_per_period": 16666.67,
    "security_deposit_amount": null,
    "status": "maintenance",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T14:00:00.000000Z"
  },
  "message": "Rental item updated successfully."
}
```

---

### Delete Rental Item

**Endpoint:** `DELETE /api/rentals/items/{id}`

**Description:** Soft delete a rental item. Fails if item has active rental agreements.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental item ID |

**Response:** `200 OK`

```json
{
  "message": "Rental item deleted successfully."
}
```

**Error Responses:**

`409 Conflict` - Item has active rental agreements
```json
{
  "message": "Failed to delete rental item.",
  "error": "Item has active rental agreements. Please complete or cancel agreements first."
}
```

---

## Rental Agreements APIs

### List Rental Agreements

**Endpoint:** `GET /api/rentals/agreements`

**Description:** Retrieve a paginated list of rental agreements with optional filtering.

**Authentication:** Required (`auth:sanctum`)

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by agreement number, customer name, or rental item name |
| `customer_id` | integer | No | Filter by customer ID |
| `status` | string | No | Filter by status: `active`, `completed`, `returned`, `overdue` |
| `sort_by` | string | No | Sort field (default: `created_at`) |
| `sort_order` | string | No | Sort order: `asc`, `desc` (default: `desc`) |
| `per_page` | integer | No | Number of items per page (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "agreement_number": "RENT-20251213-001",
      "customer_id": 5,
      "customer": {
        "id": 5,
        "name": "John Doe",
        "serial_number": "CUST-20251208-001"
      },
      "rental_item_id": 1,
      "rental_item": {
        "id": 1,
        "name": "Excavator Model X-200",
        "sku": "CE-000001"
      },
      "quantity_rented": 2.0000,
      "rental_start_date": "2025-12-13",
      "rental_end_date": "2026-03-12",
      "rental_period_type": "monthly",
      "rental_period_length": 3,
      "total_rent_amount": 100000.00,
      "rent_per_period": 33333.33,
      "security_deposit_amount": 20000.00,
      "security_deposit_collected": 20000.00,
      "payment_schedule": [
        {
          "period": 1,
          "due_date": "2025-12-13",
          "amount_due": 33333.33,
          "payment_status": "unpaid"
        },
        {
          "period": 2,
          "due_date": "2026-01-13",
          "amount_due": 33333.33,
          "payment_status": "unpaid"
        },
        {
          "period": 3,
          "due_date": "2026-02-13",
          "amount_due": 33333.34,
          "payment_status": "unpaid"
        }
      ],
      "rental_status": "active",
      "outstanding_balance": 100000.00,
      "payments": [],
      "created_at": "2025-12-13T10:00:00.000000Z",
      "updated_at": "2025-12-13T10:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

---

### Get Rental Agreement by ID

**Endpoint:** `GET /api/rentals/agreements/{id}`

**Description:** Retrieve detailed information about a specific rental agreement including payment schedule and payment history.

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental agreement ID |

**Response:** `200 OK`

```json
{
  "agreement": {
    "id": 1,
    "agreement_number": "RENT-20251213-001",
    "customer_id": 5,
    "customer": {
      "id": 5,
      "name": "John Doe",
      "serial_number": "CUST-20251208-001"
    },
    "rental_item_id": 1,
    "rental_item": {
      "id": 1,
      "name": "Excavator Model X-200",
      "sku": "CE-000001"
    },
    "quantity_rented": 2.0000,
    "rental_start_date": "2025-12-13",
    "rental_end_date": "2026-03-12",
    "rental_period_type": "monthly",
    "rental_period_length": 3,
    "total_rent_amount": 100000.00,
    "rent_per_period": 33333.33,
    "security_deposit_amount": 20000.00,
    "security_deposit_collected": 20000.00,
    "payment_schedule": [
      {
        "period": 1,
        "due_date": "2025-12-13",
        "amount_due": 33333.33,
        "payment_status": "paid"
      },
      {
        "period": 2,
        "due_date": "2026-01-13",
        "amount_due": 33333.33,
        "payment_status": "unpaid"
      },
      {
        "period": 3,
        "due_date": "2026-02-13",
        "amount_due": 33333.34,
        "payment_status": "unpaid"
      }
    ],
    "rental_status": "active",
    "outstanding_balance": 66666.67,
    "payments": [
      {
        "id": 1,
        "rental_agreement_id": 1,
        "due_date": "2025-12-13",
        "amount_due": 33333.33,
        "amount_paid": 33333.33,
        "payment_date": "2025-12-13",
        "payment_status": "paid",
        "period_identifier": "Period 1",
        "notes": null,
        "created_at": "2025-12-13T10:30:00.000000Z",
        "updated_at": "2025-12-13T10:30:00.000000Z"
      }
    ],
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:30:00.000000Z"
  }
}
```

---

### Create Rental Agreement

**Endpoint:** `POST /api/rentals/agreements`

**Description:** Create a new rental agreement. This will:
- Generate an agreement number
- Create payment schedule based on rental period
- Create payment records for each period
- Decrease available quantity of rental item
- Record security deposit in accounting (if configured)

**Authentication:** Required (`auth:sanctum`)

**Request Body:**

```json
{
  "customer_id": 5,
  "rental_item_id": 1,
  "quantity_rented": 2,
  "rental_start_date": "2025-12-13",
  "rental_end_date": "2026-03-12",
  "rental_period_type": "monthly",
  "rental_period_length": 3,
  "total_rent_amount": 100000.00,
  "rent_per_period": 33333.33,
  "security_deposit_amount": 20000.00,
  "collect_security_deposit": true,
  "security_deposit_payment_account_id": 15
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `customer_id` | integer | Yes | Must exist in customers table |
| `rental_item_id` | integer | Yes | Must exist in rental_items table |
| `quantity_rented` | numeric | Yes | Must be > 0, cannot exceed available quantity |
| `rental_start_date` | date | Yes | Valid date format (YYYY-MM-DD) |
| `rental_end_date` | date | No | Must be after rental_start_date if provided |
| `rental_period_type` | string | Yes | Must be: `daily`, `weekly`, `monthly`, or `custom` |
| `rental_period_length` | integer | Yes | Must be >= 1 |
| `total_rent_amount` | numeric | Yes | Must be >= 0 |
| `rent_per_period` | numeric | Yes | Must be >= 0 |
| `security_deposit_amount` | numeric | No | Must be >= 0, default: 0 |

**Business Rules:**
- Agreement number is auto-generated in format: `RENT-{YYYYMMDD}-{XXX}`
- If `rental_end_date` is not provided, it's calculated based on `rental_start_date`, `rental_period_type`, and `rental_period_length`
- Payment schedule is auto-generated with one payment per period
- Available quantity of rental item is decreased by `quantity_rented`
- **Security deposit is set directly in the agreement** - it is NOT calculated from the rental item's `security_deposit_amount` field
- If `collect_security_deposit` is `true` and `security_deposit_amount > 0`, a journal entry is created: DR Cash/Bank, CR Security Deposits
- Rental item must have status `available` and sufficient `quantity_available`

**Response:** `201 Created`

```json
{
  "agreement": {
    "id": 1,
    "agreement_number": "RENT-20251213-001",
    "customer_id": 5,
    "customer": {
      "id": 5,
      "name": "John Doe",
      "serial_number": "CUST-20251208-001"
    },
    "rental_item_id": 1,
    "rental_item": {
      "id": 1,
      "name": "Excavator Model X-200",
      "sku": "CE-000001"
    },
    "quantity_rented": 2.0000,
    "rental_start_date": "2025-12-13",
    "rental_end_date": "2026-03-12",
    "rental_period_type": "monthly",
    "rental_period_length": 3,
    "total_rent_amount": 100000.00,
    "rent_per_period": 33333.33,
    "security_deposit_amount": 20000.00,
    "security_deposit_collected": 0.00,
    "payment_schedule": [
      {
        "period": 1,
        "due_date": "2025-12-13",
        "amount_due": 33333.33,
        "payment_status": "unpaid"
      },
      {
        "period": 2,
        "due_date": "2026-01-13",
        "amount_due": 33333.33,
        "payment_status": "unpaid"
      },
      {
        "period": 3,
        "due_date": "2026-02-13",
        "amount_due": 33333.34,
        "payment_status": "unpaid"
      }
    ],
    "rental_status": "active",
    "outstanding_balance": 100000.00,
    "payments": [
      {
        "id": 1,
        "rental_agreement_id": 1,
        "due_date": "2025-12-13",
        "amount_due": 33333.33,
        "amount_paid": 0.00,
        "payment_date": null,
        "payment_status": "unpaid",
        "period_identifier": "Period 1",
        "notes": null,
        "created_at": "2025-12-13T10:00:00.000000Z",
        "updated_at": "2025-12-13T10:00:00.000000Z"
      },
      {
        "id": 2,
        "rental_agreement_id": 1,
        "due_date": "2026-01-13",
        "amount_due": 33333.33,
        "amount_paid": 0.00,
        "payment_date": null,
        "payment_status": "unpaid",
        "period_identifier": "Period 2",
        "notes": null,
        "created_at": "2025-12-13T10:00:00.000000Z",
        "updated_at": "2025-12-13T10:00:00.000000Z"
      },
      {
        "id": 3,
        "rental_agreement_id": 1,
        "due_date": "2026-02-13",
        "amount_due": 33333.34,
        "amount_paid": 0.00,
        "payment_date": null,
        "payment_status": "unpaid",
        "period_identifier": "Period 3",
        "notes": null,
        "created_at": "2025-12-13T10:00:00.000000Z",
        "updated_at": "2025-12-13T10:00:00.000000Z"
      }
    ],
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:00:00.000000Z"
  },
  "message": "Rental agreement created successfully."
}
```

**Error Responses:**

`422 Unprocessable Entity` - Validation or business rule violation
```json
{
  "message": "Failed to create rental agreement.",
  "error": "Insufficient quantity available for rental."
}
```

---

## Rental Payments APIs

### Record Rental Payment

**Endpoint:** `POST /api/rentals/agreements/{id}/payments`

**Description:** Record a payment for a specific rental agreement. This will:
- Update the payment record with amount paid
- Create journal entry in accounting (DR Cash/Bank, CR Accounts Receivable)
- Update payment status (paid/late/unpaid)
- Update agreement status if all payments are complete

**Authentication:** Required (`auth:sanctum`)

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Rental agreement ID |

**Request Body:**

```json
{
  "payment_id": 1,
  "amount_paid": 33333.33,
  "payment_date": "2025-12-13",
  "payment_account_id": 15,
  "notes": "Payment received via bank transfer"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `payment_id` | integer | Yes | Must exist in rental_payments table and belong to this agreement |
| `amount_paid` | numeric | Yes | Must be >= 0, typically equals amount_due for full payment |
| `payment_date` | date | No | Valid date format (YYYY-MM-DD), defaults to today |
| `payment_account_id` | integer | Yes | Must exist in accounts table (cash or bank account) |
| `notes` | string | No | Optional notes about the payment |

**Business Rules:**
- Payment status is automatically calculated:
  - `paid`: if `amount_paid >= amount_due`
  - `late`: if payment is overdue (due_date < today) and not fully paid
  - `unpaid`: otherwise
- Journal entry is created: DR Cash/Bank, CR Accounts Receivable
- If all payments are paid, agreement status is updated to `completed`
- If any payment is overdue, agreement status is updated to `overdue`

**Response:** `200 OK`

```json
{
  "payment": {
    "id": 1,
    "rental_agreement_id": 1,
    "due_date": "2025-12-13",
    "amount_due": 33333.33,
    "amount_paid": 33333.33,
    "payment_date": "2025-12-13",
    "payment_status": "paid",
    "period_identifier": "Period 1",
    "notes": "Payment received via bank transfer",
    "created_at": "2025-12-13T10:00:00.000000Z",
    "updated_at": "2025-12-13T10:30:00.000000Z"
  },
  "message": "Payment recorded successfully."
}
```

**Error Responses:**

`422 Unprocessable Entity` - Validation or business rule violation
```json
{
  "message": "Failed to record payment.",
  "error": "Accounts Receivable account not configured."
}
```

---

## Rental Returns APIs

### Process Rental Return

**Endpoint:** `POST /api/rentals/returns`

**Description:** Process a rental return. This will:
- Create return record
- Update rental item available quantity
- Update agreement status to `returned`
- Process security deposit refund/adjustment
- Record accounting entries for deposit adjustment and damage charges (if any)

**Authentication:** Required (`auth:sanctum`)

**Request Body:**

```json
{
  "rental_agreement_id": 1,
  "return_date": "2026-02-15",
  "return_condition": "returned_safely",
  "damage_charge_amount": 0.00,
  "security_deposit_refunded": 20000.00,
  "damage_description": null,
  "refund_account_id": 15,
  "notes": "Item returned in good condition"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `rental_agreement_id` | integer | Yes | Must exist in rental_agreements table |
| `return_date` | date | Yes | Valid date format (YYYY-MM-DD) |
| `return_condition` | string | Yes | Must be: `returned_safely`, `damaged`, or `lost` |
| `damage_charge_amount` | numeric | No | Must be >= 0, default: 0 |
| `security_deposit_refunded` | numeric | No | Calculated automatically if not provided |
| `damage_description` | string | No | Optional description of damage |
| `refund_account_id` | integer | No | Must exist in accounts table, defaults to cash/bank account |
| `notes` | string | No | Optional notes |

**Business Rules:**
- Security deposit refunded is calculated as: `security_deposit_amount - damage_charge_amount`
- Security deposit retained equals damage charge amount
- Available quantity of rental item is increased by `quantity_rented`
- Agreement status is updated to `returned`
- Accounting entries are created:
  - DR Security Deposits (full deposit amount)
  - CR Cash/Bank (refund amount)
  - CR Rental Income or Damage Income (if damage charges > 0)
- Agreement cannot be returned twice

**Response:** `201 Created`

```json
{
  "return": {
    "id": 1,
    "rental_agreement_id": 1,
    "return_date": "2026-02-15",
    "return_condition": "returned_safely",
    "damage_charge_amount": 0.00,
    "security_deposit_refunded": 20000.00,
    "security_deposit_retained": 0.00,
    "damage_description": null,
    "notes": "Item returned in good condition",
    "created_at": "2026-02-15T10:00:00.000000Z",
    "updated_at": "2026-02-15T10:00:00.000000Z"
  },
  "agreement": {
    "id": 1,
    "agreement_number": "RENT-20251213-001",
    "rental_status": "returned",
    "rental_end_date": "2026-02-15",
    "outstanding_balance": 0.00
  },
  "message": "Rental return processed successfully."
}
```

**Example with Damage:**

```json
{
  "rental_agreement_id": 1,
  "return_date": "2026-02-15",
  "return_condition": "damaged",
  "damage_charge_amount": 5000.00,
  "damage_description": "Scratches on body, requires repair",
  "refund_account_id": 15,
  "notes": "Item returned with damage"
}
```

**Response:**

```json
{
  "return": {
    "id": 1,
    "rental_agreement_id": 1,
    "return_date": "2026-02-15",
    "return_condition": "damaged",
    "damage_charge_amount": 5000.00,
    "security_deposit_refunded": 15000.00,
    "security_deposit_retained": 5000.00,
    "damage_description": "Scratches on body, requires repair",
    "notes": "Item returned with damage",
    "created_at": "2026-02-15T10:00:00.000000Z",
    "updated_at": "2026-02-15T10:00:00.000000Z"
  },
  "agreement": {
    "id": 1,
    "agreement_number": "RENT-20251213-001",
    "rental_status": "returned",
    "rental_end_date": "2026-02-15"
  },
  "message": "Rental return processed successfully."
}
```

**Error Responses:**

`422 Unprocessable Entity` - Validation or business rule violation
```json
{
  "message": "Failed to process rental return.",
  "error": "This rental agreement has already been returned."
}
```

---

## Data Models

### RentalCategory

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `name` | string | Category name (unique) |
| `slug` | string | URL-friendly slug (unique, auto-generated) |
| `serial_alias` | string | Alias used for SKU generation (max 10 chars, uppercase) |
| `description` | text | Category description |
| `status` | enum | `active` or `inactive` |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |
| `deleted_at` | timestamp | Soft delete timestamp |

---

### RentalItem

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `rental_category_id` | integer | Foreign key to rental_categories |
| `name` | string | Item name |
| `sku` | string | Serial code/SKU (unique, auto-generated) |
| `quantity_total` | decimal(15,4) | Total quantity available |
| `quantity_available` | decimal(15,4) | Currently available quantity |
| `rental_price_total` | decimal(15,2) | Total rental price for the period |
| `rental_period_type` | enum | `daily`, `weekly`, `monthly`, `custom` |
| `rental_period_length` | integer | Number of periods |
| `auto_divide_rent` | boolean | Whether rent is auto-divided by period |
| `rent_per_period` | decimal(15,2) | Calculated rent per period |
| `security_deposit_amount` | decimal(15,2) | Security deposit required |
| `status` | enum | `available`, `rented`, `maintenance` |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |
| `deleted_at` | timestamp | Soft delete timestamp |

---

### RentalAgreement

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `agreement_number` | string | Auto-generated agreement number (unique) |
| `customer_id` | integer | Foreign key to customers |
| `rental_item_id` | integer | Foreign key to rental_items |
| `quantity_rented` | decimal(15,4) | Quantity rented |
| `rental_start_date` | date | Rental start date |
| `rental_end_date` | date | Rental end date |
| `rental_period_type` | enum | `daily`, `weekly`, `monthly`, `custom` |
| `rental_period_length` | integer | Number of periods |
| `total_rent_amount` | decimal(15,2) | Total rent for entire period |
| `rent_per_period` | decimal(15,2) | Rent amount per period |
| `security_deposit_amount` | decimal(15,2) | Security deposit amount |
| `security_deposit_collected` | decimal(15,2) | Amount of deposit collected |
| `payment_schedule` | json | Auto-generated payment schedule |
| `rental_status` | enum | `active`, `completed`, `returned`, `overdue` |
| `security_deposit_journal_entry_id` | integer | Foreign key to journal_entries |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |
| `deleted_at` | timestamp | Soft delete timestamp |

**Computed Fields:**
- `outstanding_balance`: Calculated as `total_rent_amount - sum(amount_paid)` from payments

---

### RentalPayment

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `rental_agreement_id` | integer | Foreign key to rental_agreements |
| `due_date` | date | Payment due date |
| `amount_due` | decimal(15,2) | Amount due for this payment |
| `amount_paid` | decimal(15,2) | Amount paid (default: 0) |
| `payment_date` | date | Date payment was received |
| `payment_status` | enum | `paid`, `late`, `unpaid` (auto-calculated) |
| `period_identifier` | string | Identifier for which period (e.g., "Period 1") |
| `journal_entry_id` | integer | Foreign key to journal_entries |
| `notes` | text | Optional notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

**Payment Status Logic:**
- `paid`: `amount_paid >= amount_due`
- `late`: Payment is overdue (`due_date < today`) and not fully paid, OR partial payment after due date
- `unpaid`: No payment received and not yet overdue

---

### RentalReturn

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Primary key |
| `rental_agreement_id` | integer | Foreign key to rental_agreements |
| `return_date` | date | Date item was returned |
| `return_condition` | enum | `returned_safely`, `damaged`, `lost` |
| `damage_charge_amount` | decimal(15,2) | Damage or loss charges |
| `security_deposit_refunded` | decimal(15,2) | Amount refunded after deductions |
| `security_deposit_retained` | decimal(15,2) | Amount retained from deposit |
| `damage_description` | text | Description of damage |
| `return_journal_entry_id` | integer | Foreign key to journal_entries |
| `notes` | text | Optional notes |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |

---

## Business Rules

### Payment Schedule Generation

Payment schedules are automatically generated when creating a rental agreement:

- **Daily**: Each period = 1 day
- **Weekly**: Each period = 1 week (7 days)
- **Monthly**: Each period = 1 month (calendar month)
- **Custom**: Assumes days (1 period = 1 day)

The due dates are calculated by adding periods to the start date:
- Period 1 due date = `rental_start_date`
- Period 2 due date = `rental_start_date + 1 period`
- Period 3 due date = `rental_start_date + 2 periods`
- etc.

### Quantity Management

- When a rental agreement is created, `quantity_available` of the rental item is decreased by `quantity_rented`
- When a rental is returned, `quantity_available` is increased by `quantity_rented`
- Rental items cannot be rented if `quantity_available` is insufficient

### Payment Status Updates

- Payment status is automatically calculated on save
- Agreement status is updated based on payment statuses:
  - `completed`: All payments are `paid`
  - `overdue`: At least one payment is `late`
  - `active`: Otherwise

### Security Deposit Handling

**Important Change:** Security deposits are now set at the **agreement level**, not the item level. When creating a rental agreement, you provide `security_deposit_amount` directly. This allows flexibility to set different security deposits for different customers or rental periods.

1. **Collection** (when agreement is created with `collect_security_deposit: true`):
   - DR Cash/Bank (from `security_deposit_payment_account_id`)
   - CR Security Deposits (Liability)

2. **Return - Safe**:
   - DR Security Deposits
   - CR Cash/Bank (full refund)

3. **Return - Damage/Loss**:
   - DR Security Deposits (full deposit)
   - CR Cash/Bank (partial refund = deposit - damage charges)
   - CR Rental Income / Damage Income (damage charges)

### Accounting Integration

The rental system requires the following account mappings to be configured:

| Mapping Type | Account Type | Description |
|--------------|--------------|-------------|
| `rental_cash` | Asset | Cash account for rental payments |
| `rental_bank` | Asset | Bank account for rental payments |
| `rental_ar` | Asset | Accounts Receivable for rentals |
| `rental_assets` | Asset | Rental Assets account |
| `rental_security_deposits` | Liability | Security Deposits (Customers) |
| `rental_income` | Income | Rental Income |
| `rental_damage_income` | Income | Damage Charges Income (optional) |

**Note:** Account mappings should be configured using the existing `AccountMapping` system with `mapping_type` set to the values above.

---

## Error Handling

All APIs follow consistent error response formats:

### 400 Bad Request
```json
{
  "message": "Error message"
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthenticated."
}
```

### 404 Not Found
```json
{
  "message": "No query results for model [App\\Models\\RentalCategory]"
}
```

### 409 Conflict
```json
{
  "message": "Failed to delete rental category.",
  "error": "Category has associated rental items. Please reassign or delete items first."
}
```

### 422 Unprocessable Entity
```json
{
  "message": "Failed to create rental category.",
  "error": "The name has already been taken."
}
```

Or with validation errors:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "name": ["The name field is required."],
    "serial_alias": ["The serial alias must be uppercase alphanumeric only."]
  }
}
```

---

## Authentication & Authorization

All rental APIs require:
- **Authentication**: Valid Sanctum token in `Authorization: Bearer {token}` header
- **Authorization**: No specific module permissions are currently enforced for rental endpoints, but authentication is required

---

## Rate Limiting

All endpoints are subject to Laravel's default rate limiting. Check response headers for rate limit information:
- `X-RateLimit-Limit`: Maximum number of requests
- `X-RateLimit-Remaining`: Remaining requests in current window
- `Retry-After`: Seconds until rate limit resets

---

## Pagination

All list endpoints support pagination with the following response structure:

```json
{
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5,
    "from": 1,
    "to": 20
  }
}
```

Use `per_page` query parameter to control page size (default: 20, maximum: 100).

---

## Date Formats

All dates should be in ISO 8601 format: `YYYY-MM-DD`

Examples:
- `2025-12-13`
- `2026-01-15`

Timestamp fields are returned in ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.uuuuuuZ`

---

## Notes

1. All monetary values are stored and returned as decimals with 2 decimal places
2. Quantity values support 4 decimal places for precise tracking
3. Soft deletes are used for categories and items (deleted records are retained but hidden)
4. Agreement numbers and SKUs are auto-generated and unique
5. Payment statuses are automatically calculated based on due dates and payment amounts
6. Accounting entries are created automatically for security deposits, payments, and returns
7. **Security deposits are set at the agreement level** - The `security_deposit_amount` field on rental items is deprecated and always `null`. Security deposits are entered directly when creating rental agreements.
8. **Customer Rentals Tab**: Use `GET /api/rentals/agreements?customer_id={id}` to fetch all rental agreements for a specific customer. The response includes `payments` array for each agreement.

---

## Recent Changes (December 2025)

### Security Deposit Field Migration

The security deposit field has been moved from **Rental Items** to **Rental Agreements**:

- ✅ **Before**: Security deposit was stored per item and calculated when creating an agreement
- ✅ **After**: Security deposit is entered directly when creating a rental agreement
- ✅ **Reason**: More flexible - allows different security deposits per agreement based on customer, item condition, rental period, etc.

**Impact on APIs:**
- `security_deposit_amount` on rental items is now optional/nullable and will be set to `null` if provided
- `security_deposit_amount` on rental agreements is required/optional (entered directly, not from item)
- No breaking changes - existing APIs continue to work

### Customer Rentals Tab Support

Enhanced the rental agreements listing endpoint to better support customer profile pages:

- ✅ Added `payments` relationship to eager loading in `GET /api/rentals/agreements`
- ✅ Response now includes full payment history for each agreement
- ✅ Database index on `customer_id` ensures optimal query performance
- ✅ Use `?customer_id={id}` parameter to filter agreements by customer

