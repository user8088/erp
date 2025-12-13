# Transport Management API Documentation

This document provides comprehensive documentation for all transport management APIs including vehicle management, maintenance records, and profitability tracking.

## Table of Contents

1. [Vehicle Management APIs](#vehicle-management-apis)
2. [Vehicle Maintenance APIs](#vehicle-maintenance-apis)
3. [Vehicle Profitability & Statistics APIs](#vehicle-profitability--statistics-apis)
4. [Data Models](#data-models)

---

## Vehicle Management APIs

### List Vehicles

**Endpoint:** `GET /api/vehicles`

**Description:** Retrieve a paginated list of vehicles with optional filtering and statistics.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search query for vehicle name, registration number, or type |
| `status` | string | No | Filter by status: `active`, `inactive` |
| `sort_by` | string | No | Field to sort by (default: `created_at`) |
| `sort_order` | string | No | Sort order: `asc` or `desc` (default: `desc`) |
| `per_page` | integer | No | Number of items per page (default: 10, max: 100) |
| `include_stats` | boolean | No | Include profitability statistics in response (default: `false`) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Truck-001",
      "registration_number": "ABC-123",
      "type": "truck",
      "notes": "Main delivery vehicle",
      "status": "active",
      "created_at": "2025-01-15T10:00:00.000000Z",
      "updated_at": "2025-01-15T10:00:00.000000Z",
      "profitability_stats": {
        "total_delivery_charges": 50000.00,
        "total_maintenance_costs": 15000.00,
        "net_profit": 35000.00,
        "profit_margin_percentage": 70.00,
        "total_orders": 45
      },
      "total_orders": 45
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 25,
    "last_page": 3,
    "from": 1,
    "to": 10
  }
}
```

**Note:** The `profitability_stats` and `total_orders` fields are only included when `include_stats=true` is passed in the query parameters.

---

### Get Vehicle by ID

**Endpoint:** `GET /api/vehicles/{id}`

**Description:** Retrieve detailed information about a specific vehicle.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Vehicle ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_stats` | boolean | No | Include profitability statistics (default: `false`) |

**Response:**

```json
{
  "vehicle": {
    "id": 1,
    "name": "Truck-001",
    "registration_number": "ABC-123",
    "type": "truck",
    "notes": "Main delivery vehicle",
    "status": "active",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

---

### Create Vehicle

**Endpoint:** `POST /api/vehicles`

**Description:** Create a new vehicle record.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read-write` permission

**Request Body:**

```json
{
  "name": "Truck-001",
  "registration_number": "ABC-123",
  "type": "truck",
  "notes": "Main delivery vehicle",
  "status": "active"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 255 characters |
| `registration_number` | string | Yes | Max 255 characters, must be unique |
| `type` | string | No | Max 255 characters (e.g., "truck", "van", "car") |
| `notes` | string | No | Optional notes about the vehicle |
| `status` | string | No | Must be `active` or `inactive` (default: `active`) |

**Response:** `201 Created`

```json
{
  "vehicle": {
    "id": 1,
    "name": "Truck-001",
    "registration_number": "ABC-123",
    "type": "truck",
    "notes": "Main delivery vehicle",
    "status": "active",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  },
  "message": "Vehicle created successfully."
}
```

**Error Responses:**

`422 Unprocessable Entity` - Validation error
```json
{
  "message": "Failed to create vehicle.",
  "error": "The registration number has already been taken."
}
```

---

### Update Vehicle

**Endpoint:** `PUT /api/vehicles/{id}`

**Description:** Update an existing vehicle record.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Vehicle ID |

**Request Body:**

```json
{
  "name": "Truck-001-Updated",
  "registration_number": "ABC-123",
  "type": "truck",
  "notes": "Updated notes",
  "status": "active"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | No | Max 255 characters |
| `registration_number` | string | No | Max 255 characters, must be unique (excluding current vehicle) |
| `type` | string | No | Max 255 characters |
| `notes` | string | No | Optional notes |
| `status` | string | No | Must be `active` or `inactive` |

**Response:**

```json
{
  "vehicle": {
    "id": 1,
    "name": "Truck-001-Updated",
    "registration_number": "ABC-123",
    "type": "truck",
    "notes": "Updated notes",
    "status": "active",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T11:00:00.000000Z"
  },
  "message": "Vehicle updated successfully."
}
```

---

### Delete Vehicle

**Endpoint:** `DELETE /api/vehicles/{id}`

**Description:** Delete a vehicle. If the vehicle has completed sales, it will be soft-deleted. Otherwise, it will be permanently deleted.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Vehicle ID |

**Response:**

```json
{
  "message": "Vehicle deleted successfully."
}
```

**Error Responses:**

`409 Conflict` - Cannot delete vehicle
```json
{
  "message": "Failed to delete vehicle.",
  "error": "Vehicle is currently in use."
}
```

---

## Vehicle Profitability & Statistics APIs

### Get Vehicle Profitability Statistics

**Endpoint:** `GET /api/vehicles/{id}/profitability-stats`

**Description:** Get comprehensive profitability statistics for a vehicle, including total delivery charges, maintenance costs, net profit, and profit margin.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Vehicle ID |

**Response:**

```json
{
  "vehicle_id": 1,
  "vehicle_name": "Truck-001",
  "registration_number": "ABC-123",
  "statistics": {
    "total_delivery_charges": 50000.00,
    "total_maintenance_costs": 15000.00,
    "net_profit": 35000.00,
    "profit_margin_percentage": 70.00,
    "total_orders": 45
  }
}
```

**Statistics Explanation:**

- **total_delivery_charges**: Sum of all `total_delivery_charges` from completed delivery sales
- **total_maintenance_costs**: Sum of all maintenance record amounts
- **net_profit**: `total_delivery_charges - total_maintenance_costs`
- **profit_margin_percentage**: `(net_profit / total_delivery_charges) * 100`
- **total_orders**: Count of completed delivery orders

---

### Get Vehicle Delivery Orders

**Endpoint:** `GET /api/vehicles/{id}/orders`

**Description:** Get all delivery orders (sales) associated with a vehicle.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Vehicle ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `status` | string | No | Filter by sale status: `draft`, `completed`, `cancelled` |
| `per_page` | integer | No | Number of items per page (default: 10, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "sale_number": "SALE-20250115-000001",
      "sale_type": "delivery",
      "customer_id": 5,
      "total_delivery_charges": 500.00,
      "total_amount": 5500.00,
      "status": "completed",
      "delivery_address": "123 Main St, City",
      "expected_delivery_date": "2025-01-16",
      "created_at": "2025-01-15T10:00:00.000000Z",
      "customer": {
        "id": 5,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "items": [
        {
          "id": 1,
          "item_id": 10,
          "quantity": 5,
          "unit_price": 1000.00,
          "delivery_charge": 500.00
        }
      ]
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 45,
    "last_page": 5,
    "from": 1,
    "to": 10
  }
}
```

---

## Vehicle Maintenance APIs

### List Maintenance Records

**Endpoint:** `GET /api/vehicles/{vehicleId}/maintenance`

**Description:** Retrieve a paginated list of maintenance records for a specific vehicle.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vehicleId` | integer | Yes | Vehicle ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | string | No | Filter by maintenance type (e.g., "repair", "service", "fuel", "insurance") |
| `sort_by` | string | No | Field to sort by (default: `maintenance_date`) |
| `sort_order` | string | No | Sort order: `asc` or `desc` (default: `desc`) |
| `per_page` | integer | No | Number of items per page (default: 10, max: 100) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "vehicle_id": 1,
      "type": "repair",
      "description": "Engine oil change and filter replacement",
      "amount": 5000.00,
      "maintenance_date": "2025-01-10",
      "notes": "Regular service",
      "created_by": 2,
      "creator": {
        "id": 2,
        "full_name": "Jane Smith"
      },
      "created_at": "2025-01-10T14:30:00.000000Z",
      "updated_at": "2025-01-10T14:30:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 10,
    "total": 15,
    "last_page": 2,
    "from": 1,
    "to": 10
  }
}
```

---

### Get Maintenance Record by ID

**Endpoint:** `GET /api/vehicles/{vehicleId}/maintenance/{id}`

**Description:** Retrieve detailed information about a specific maintenance record.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vehicleId` | integer | Yes | Vehicle ID |
| `id` | integer | Yes | Maintenance record ID |

**Response:**

```json
{
  "maintenance": {
    "id": 1,
    "vehicle_id": 1,
    "type": "repair",
    "description": "Engine oil change and filter replacement",
    "amount": 5000.00,
    "maintenance_date": "2025-01-10",
    "notes": "Regular service",
    "created_by": 2,
    "creator": {
      "id": 2,
      "full_name": "Jane Smith"
    },
    "created_at": "2025-01-10T14:30:00.000000Z",
    "updated_at": "2025-01-10T14:30:00.000000Z"
  }
}
```

---

### Create Maintenance Record

**Endpoint:** `POST /api/vehicles/{vehicleId}/maintenance`

**Description:** Create a new maintenance record for a vehicle.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vehicleId` | integer | Yes | Vehicle ID |

**Request Body:**

```json
{
  "type": "repair",
  "description": "Engine oil change and filter replacement",
  "amount": 5000.00,
  "maintenance_date": "2025-01-10",
  "notes": "Regular service"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | string | Yes | Max 255 characters (e.g., "repair", "service", "fuel", "insurance", "tire", "battery") |
| `description` | string | No | Detailed description of the maintenance |
| `amount` | numeric | Yes | Must be >= 0, 2 decimal places |
| `maintenance_date` | date | Yes | Valid date format (YYYY-MM-DD) |
| `notes` | string | No | Optional notes |

**Response:** `201 Created`

```json
{
  "maintenance": {
    "id": 1,
    "vehicle_id": 1,
    "type": "repair",
    "description": "Engine oil change and filter replacement",
    "amount": 5000.00,
    "maintenance_date": "2025-01-10",
    "notes": "Regular service",
    "created_by": 2,
    "creator": {
      "id": 2,
      "full_name": "Jane Smith"
    },
    "created_at": "2025-01-10T14:30:00.000000Z",
    "updated_at": "2025-01-10T14:30:00.000000Z"
  },
  "message": "Maintenance record created successfully."
}
```

**Note:** The `created_by` field is automatically set to the authenticated user's ID.

---

### Update Maintenance Record

**Endpoint:** `PUT /api/vehicles/{vehicleId}/maintenance/{id}`

**Description:** Update an existing maintenance record.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vehicleId` | integer | Yes | Vehicle ID |
| `id` | integer | Yes | Maintenance record ID |

**Request Body:**

```json
{
  "type": "service",
  "description": "Updated description",
  "amount": 5500.00,
  "maintenance_date": "2025-01-10",
  "notes": "Updated notes"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `type` | string | No | Max 255 characters |
| `description` | string | No | Detailed description |
| `amount` | numeric | No | Must be >= 0, 2 decimal places |
| `maintenance_date` | date | No | Valid date format (YYYY-MM-DD) |
| `notes` | string | No | Optional notes |

**Response:**

```json
{
  "maintenance": {
    "id": 1,
    "vehicle_id": 1,
    "type": "service",
    "description": "Updated description",
    "amount": 5500.00,
    "maintenance_date": "2025-01-10",
    "notes": "Updated notes",
    "created_by": 2,
    "creator": {
      "id": 2,
      "full_name": "Jane Smith"
    },
    "created_at": "2025-01-10T14:30:00.000000Z",
    "updated_at": "2025-01-10T15:00:00.000000Z"
  },
  "message": "Maintenance record updated successfully."
}
```

---

### Delete Maintenance Record

**Endpoint:** `DELETE /api/vehicles/{vehicleId}/maintenance/{id}`

**Description:** Delete a maintenance record (soft delete).

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vehicleId` | integer | Yes | Vehicle ID |
| `id` | integer | Yes | Maintenance record ID |

**Response:**

```json
{
  "message": "Maintenance record deleted successfully."
}
```

---

### Get Maintenance Statistics

**Endpoint:** `GET /api/vehicles/{vehicleId}/maintenance-statistics`

**Description:** Get aggregated maintenance statistics grouped by maintenance type.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.transport,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vehicleId` | integer | Yes | Vehicle ID |

**Response:**

```json
{
  "vehicle_id": 1,
  "vehicle_name": "Truck-001",
  "total_maintenance_costs": 15000.00,
  "maintenance_by_type": {
    "repair": {
      "count": 3,
      "total_amount": 8000.00
    },
    "service": {
      "count": 2,
      "total_amount": 5000.00
    },
    "fuel": {
      "count": 5,
      "total_amount": 2000.00
    }
  },
  "total_records": 10
}
```

**Statistics Explanation:**

- **total_maintenance_costs**: Sum of all maintenance amounts for the vehicle
- **maintenance_by_type**: Object with maintenance type as key, containing:
  - **count**: Number of maintenance records of this type
  - **total_amount**: Sum of amounts for this type
- **total_records**: Total number of maintenance records

---

## Data Models

### Vehicle Model

```json
{
  "id": 1,
  "name": "Truck-001",
  "registration_number": "ABC-123",
  "type": "truck",
  "notes": "Main delivery vehicle",
  "status": "active",
  "created_at": "2025-01-15T10:00:00.000000Z",
  "updated_at": "2025-01-15T10:00:00.000000Z"
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique vehicle identifier |
| `name` | string | Vehicle name/identifier |
| `registration_number` | string | Vehicle registration number (unique) |
| `type` | string | Vehicle type (e.g., "truck", "van", "car") |
| `notes` | string | Optional notes about the vehicle |
| `status` | string | Vehicle status: `active` or `inactive` |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |

---

### Vehicle Maintenance Model

```json
{
  "id": 1,
  "vehicle_id": 1,
  "type": "repair",
  "description": "Engine oil change and filter replacement",
  "amount": 5000.00,
  "maintenance_date": "2025-01-10",
  "notes": "Regular service",
  "created_by": 2,
  "created_at": "2025-01-10T14:30:00.000000Z",
  "updated_at": "2025-01-10T14:30:00.000000Z"
}
```

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique maintenance record identifier |
| `vehicle_id` | integer | Foreign key to vehicles table |
| `type` | string | Type of maintenance (e.g., "repair", "service", "fuel", "insurance") |
| `description` | string | Detailed description of the maintenance |
| `amount` | decimal | Maintenance cost (2 decimal places) |
| `maintenance_date` | date | Date when maintenance was performed |
| `notes` | string | Optional notes |
| `created_by` | integer | Foreign key to users table (user who created the record) |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |

---

## Integration with Sales System

### Automatic Tracking

When a delivery sale is created with a `vehicle_id`, the system automatically:

1. **Links the sale to the vehicle** - The sale's `vehicle_id` field connects it to the vehicle
2. **Tracks delivery charges** - The `total_delivery_charges` from the sale is automatically included in the vehicle's profitability calculations
3. **Updates statistics** - All profitability statistics are calculated in real-time based on completed sales

### Example: Creating a Delivery Sale with Vehicle

When creating a sale via `POST /api/sales`, include the vehicle:

```json
{
  "sale_type": "delivery",
  "customer_id": 5,
  "vehicle_id": 1,
  "total_delivery_charges": 500.00,
  "items": [...],
  ...
}
```

The vehicle's profitability statistics will automatically include this sale's delivery charges once the sale status is set to `completed`.

---

## Common Maintenance Types

While the system allows any maintenance type, here are some common types you might use:

- **repair** - General repairs and fixes
- **service** - Regular maintenance service
- **fuel** - Fuel expenses
- **insurance** - Insurance payments
- **tire** - Tire replacement or repair
- **battery** - Battery replacement
- **inspection** - Vehicle inspection fees
- **registration** - Registration renewal fees
- **cleaning** - Cleaning and detailing
- **parts** - Replacement parts

---

## Error Responses

### 404 Not Found

```json
{
  "message": "No query results for model [App\\Models\\Vehicle]"
}
```

### 422 Unprocessable Entity

```json
{
  "message": "Failed to create vehicle.",
  "error": "The registration number has already been taken."
}
```

### 409 Conflict

```json
{
  "message": "Failed to delete vehicle.",
  "error": "Vehicle is currently in use."
}
```

### 401 Unauthorized

```json
{
  "message": "Unauthenticated."
}
```

### 403 Forbidden

```json
{
  "message": "This action is unauthorized."
}
```

---

## Notes

1. **Profitability Calculations**: All profitability statistics are calculated in real-time from completed sales and maintenance records. Only sales with `status = 'completed'` are included in the calculations.

2. **Soft Deletes**: Vehicles with completed sales are soft-deleted (not permanently removed) to maintain historical data integrity.

3. **Maintenance Types**: The system is flexible and allows any maintenance type. Use descriptive types that make sense for your business.

4. **Delivery Charges**: Delivery charges are automatically tracked from sales. Ensure that when creating delivery sales, you set the `vehicle_id` and `total_delivery_charges` fields correctly.

5. **Permissions**: All endpoints require appropriate module permissions. Ensure users have `module:module.transport,read` for viewing and `module:module.transport,read-write` for creating/updating/deleting.

