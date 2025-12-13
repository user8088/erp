# Staff API Documentation

This document provides comprehensive documentation for all staff-related APIs including staff management, attendance, salaries, and staff-user linking.

## Table of Contents

1. [Staff Management APIs](#staff-management-apis)
2. [Attendance APIs](#attendance-apis)
3. [Salary Structure APIs](#salary-structure-apis)
4. [Salary Run APIs](#salary-run-apis)
5. [Staff-User Link APIs](#staff-user-link-apis)

---

## Staff Management APIs

### List Staff

**Endpoint:** `GET /api/staff`

**Description:** Retrieve a paginated list of staff members with optional filtering.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | No | Search query for staff name or code |
| `status` | string | No | Filter by status: `active`, `on_leave`, `inactive` |
| `department` | string | No | Filter by department |
| `designation` | string | No | Filter by designation |
| `is_erp_user` | boolean | No | Filter by whether staff is linked to an ERP user |
| `per_page` | integer | No | Number of items per page (default: 15) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "code": "EMP001",
      "full_name": "John Doe",
      "designation": "Manager",
      "department": "Sales",
      "phone": "+1234567890",
      "email": "john.doe@example.com",
      "status": "active",
      "date_of_joining": "2023-01-15",
      "monthly_salary": 5000.00,
      "tags": ["senior", "sales"],
      "metadata": {},
      "created_at": "2023-01-15T10:00:00.000000Z",
      "updated_at": "2023-01-15T10:00:00.000000Z",
      "user": {
        "id": 5,
        "email": "john.doe@example.com",
        "full_name": "John Doe"
      }
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

---

### Get Staff by ID

**Endpoint:** `GET /api/staff/{id}`

**Description:** Retrieve detailed information about a specific staff member.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Staff ID (must be numeric) |

**Response:**

```json
{
  "id": 1,
  "user_id": 5,
  "code": "EMP001",
  "full_name": "John Doe",
  "designation": "Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 5000.00,
  "tags": ["senior", "sales"],
  "metadata": {},
  "created_at": "2023-01-15T10:00:00.000000Z",
  "updated_at": "2023-01-15T10:00:00.000000Z",
  "user": {
    "id": 5,
    "email": "john.doe@example.com",
    "full_name": "John Doe"
  }
}
```

---

### Create Staff

**Endpoint:** `POST /api/staff`

**Description:** Create a new staff member.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` permission

**Request Body:**

```json
{
  "user_id": 5,
  "code": "EMP001",
  "full_name": "John Doe",
  "designation": "Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 5000.00,
  "tags": ["senior", "sales"],
  "metadata": {}
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `user_id` | integer | No | Must exist in users table |
| `code` | string | Yes | Max 50 characters, must be unique |
| `full_name` | string | Yes | Max 255 characters |
| `designation` | string | No | Max 255 characters |
| `department` | string | No | Max 255 characters |
| `phone` | string | No | Max 50 characters |
| `email` | string | No | Valid email, max 255 characters |
| `status` | string | Yes | Must be: `active`, `on_leave`, or `inactive` |
| `date_of_joining` | date | No | Valid date format |
| `monthly_salary` | numeric | No | Must be >= 0 |
| `tags` | array | No | Array of strings, each max 50 characters |
| `metadata` | object | No | JSON object |

**Response:** `201 Created`

```json
{
  "id": 1,
  "user_id": 5,
  "code": "EMP001",
  "full_name": "John Doe",
  "designation": "Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 5000.00,
  "tags": ["senior", "sales"],
  "metadata": {},
  "created_at": "2023-01-15T10:00:00.000000Z",
  "updated_at": "2023-01-15T10:00:00.000000Z"
}
```

---

### Update Staff

**Endpoint:** `PATCH /api/staff/{id}`

**Description:** Update an existing staff member. All fields are optional (partial update).

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Staff ID (must be numeric) |

**Request Body:**

```json
{
  "full_name": "John Smith",
  "designation": "Senior Manager",
  "status": "active",
  "monthly_salary": 6000.00
}
```

**Validation Rules:** Same as Create Staff, but all fields are optional (use `sometimes` validation).

**Response:**

```json
{
  "id": 1,
  "user_id": 5,
  "code": "EMP001",
  "full_name": "John Smith",
  "designation": "Senior Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 6000.00,
  "tags": ["senior", "sales"],
  "metadata": {},
  "created_at": "2023-01-15T10:00:00.000000Z",
  "updated_at": "2023-01-16T10:00:00.000000Z"
}
```

---

### Delete Staff

**Endpoint:** `DELETE /api/staff/{id}`

**Description:** Delete a staff member.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Staff ID (must be numeric) |

**Response:** `200 OK`

```json
{
  "message": "Staff deleted"
}
```

---

## Attendance APIs

### List Attendance

**Endpoint:** `GET /api/attendance`

**Description:** Retrieve a paginated list of attendance entries with optional filtering and summary.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | No | Filter by specific date (format: Y-m-d) |
| `from` | string | No | Start date for date range (format: Y-m-d) |
| `to` | string | No | End date for date range (format: Y-m-d) |
| `person_type` | string | No | Filter by person type: `staff` or `user` |
| `person_ids` | array | No | Array of person IDs to filter |
| `status` | string | No | Filter by status: `present`, `absent`, `paid_leave`, `unpaid_leave` |
| `summary` | boolean | No | Include summary statistics (default: false) |
| `per_page` | integer | No | Number of items per page (default: 50) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "person_id": 1,
      "person_type": "staff",
      "date": "2024-01-15",
      "status": "present",
      "note": "On time",
      "created_at": "2024-01-15T08:00:00.000000Z",
      "updated_at": "2024-01-15T08:00:00.000000Z"
    }
  ],
  "summary": {
    "total_entries": 100,
    "present": 80,
    "absent": 10,
    "paid_leave": 7,
    "unpaid_leave": 3
  },
  "meta": {
    "current_page": 1,
    "last_page": 2,
    "per_page": 50,
    "total": 100
  }
}
```

---

### Bulk Upsert Attendance

**Endpoint:** `POST /api/attendance/bulk`

**Description:** Create or update multiple attendance entries for a specific date in a single request.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.attendance.manage,read-write` permissions

**Request Body:**

```json
{
  "date": "2024-01-15",
  "entries": [
    {
      "person_id": 1,
      "person_type": "staff",
      "status": "present",
      "note": "On time"
    },
    {
      "person_id": 2,
      "person_type": "staff",
      "status": "absent",
      "note": "Sick leave"
    }
  ]
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | string | Yes | Date format: Y-m-d |
| `entries` | array | Yes | Minimum 1 entry required |
| `entries.*.person_id` | integer | Yes | Person ID |
| `entries.*.person_type` | string | Yes | Must be: `staff` or `user` |
| `entries.*.status` | string | Yes | Must be: `present`, `absent`, `paid_leave`, or `unpaid_leave` |
| `entries.*.note` | string | No | Optional note |

**Response:** `201 Created`

```json
{
  "data": [
    {
      "id": 1,
      "person_id": 1,
      "person_type": "staff",
      "date": "2024-01-15",
      "status": "present",
      "note": "On time",
      "created_at": "2024-01-15T08:00:00.000000Z",
      "updated_at": "2024-01-15T08:00:00.000000Z"
    },
    {
      "id": 2,
      "person_id": 2,
      "person_type": "staff",
      "date": "2024-01-15",
      "status": "absent",
      "note": "Sick leave",
      "created_at": "2024-01-15T08:00:00.000000Z",
      "updated_at": "2024-01-15T08:00:00.000000Z"
    }
  ],
  "message": "Attendance saved"
}
```

---

### Update Attendance Entry

**Endpoint:** `PATCH /api/attendance/{id}`

**Description:** Update a specific attendance entry.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.attendance.manage,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Attendance entry ID (numeric) OR composite format: `"staff-{id}"` or `"user-{id}"` |

**Request Body:**

```json
{
  "status": "paid_leave",
  "note": "Updated to paid leave"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | Must be: `present`, `absent`, `paid_leave`, or `unpaid_leave` |
| `note` | string | No | Optional note |
| `date` | string | No | Date format: `Y-m-d` (used with composite IDs, defaults to today) |

**Note:** When using composite ID format (e.g., `"staff-1"`), the entry will be automatically created if it doesn't exist for the specified date (or today if date is omitted).

**Response:**

```json
{
  "id": 1,
  "person_id": 1,
  "person_type": "staff",
  "date": "2024-01-15",
  "status": "paid_leave",
  "note": "Updated to paid leave",
  "created_at": "2024-01-15T08:00:00.000000Z",
  "updated_at": "2024-01-15T10:00:00.000000Z"
}
```

---

### Mark All Attendance

**Endpoint:** `POST /api/attendance/mark-all`

**Description:** Mark attendance for all staff members or a filtered subset for a specific date.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.attendance.manage,read-write` permissions

**Request Body:**

```json
{
  "date": "2024-01-15",
  "status": "present",
  "person_type": "staff",
  "person_ids": [1, 2, 3],
  "department": "Sales",
  "designation": "Manager",
  "staff_status": "active"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `date` | string | Yes | Date format: Y-m-d |
| `status` | string | Yes | Must be: `present`, `absent`, `paid_leave`, or `unpaid_leave` |
| `person_type` | string | Yes | Must be: `staff` or `user` |
| `person_ids` | array | No | Array of person IDs (if not provided, all matching criteria) |
| `person_ids.*` | integer | No | Person ID |
| `department` | string | No | Filter by department (staff only) |
| `designation` | string | No | Filter by designation (staff only) |
| `staff_status` | string | No | Filter by staff status: `active`, `on_leave`, `inactive` (staff only) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "person_id": 1,
      "person_type": "staff",
      "date": "2024-01-15",
      "status": "present",
      "note": null,
      "created_at": "2024-01-15T08:00:00.000000Z",
      "updated_at": "2024-01-15T08:00:00.000000Z"
    }
  ],
  "message": "Attendance marked"
}
```

---

## Salary Structure APIs

### List Salary Structures

**Endpoint:** `GET /api/staff/salary-structures`

**Description:** Retrieve a paginated list of salary structures.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pay_frequency` | string | No | Filter by pay frequency: `monthly`, `biweekly`, `weekly` |
| `name` | string | No | Filter by structure name |
| `per_page` | integer | No | Number of items per page (default: 15) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Standard Monthly Structure",
      "basic_amount": 5000.00,
      "allowances": [
        {
          "label": "Transport Allowance",
          "amount": 500.00
        },
        {
          "label": "Medical Allowance",
          "amount": 300.00
        }
      ],
      "deductions": [
        {
          "label": "Tax",
          "amount": 500.00
        }
      ],
      "pay_frequency": "monthly",
      "payable_days": 30,
      "notes": "Standard structure for all employees",
      "created_at": "2023-01-01T00:00:00.000000Z",
      "updated_at": "2023-01-01T00:00:00.000000Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  }
}
```

---

### Get Salary Structure by ID

**Endpoint:** `GET /api/staff/salary-structures/{id}`

**Description:** Retrieve detailed information about a specific salary structure.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Salary structure ID |

**Response:**

```json
{
  "id": 1,
  "name": "Standard Monthly Structure",
  "basic_amount": 5000.00,
  "allowances": [
    {
      "label": "Transport Allowance",
      "amount": 500.00
    },
    {
      "label": "Medical Allowance",
      "amount": 300.00
    }
  ],
  "deductions": [
    {
      "label": "Tax",
      "amount": 500.00
    }
  ],
  "pay_frequency": "monthly",
  "payable_days": 30,
  "notes": "Standard structure for all employees",
  "created_at": "2023-01-01T00:00:00.000000Z",
  "updated_at": "2023-01-01T00:00:00.000000Z"
}
```

---

### Create Salary Structure

**Endpoint:** `POST /api/staff/salary-structures`

**Description:** Create a new salary structure.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary_structures.manage,read-write` permissions

**Request Body:**

```json
{
  "name": "Standard Monthly Structure",
  "basic_amount": 5000.00,
  "allowances": [
    {
      "label": "Transport Allowance",
      "amount": 500.00
    },
    {
      "label": "Medical Allowance",
      "amount": 300.00
    }
  ],
  "deductions": [
    {
      "label": "Tax",
      "amount": 500.00
    }
  ],
  "pay_frequency": "monthly",
  "payable_days": 30,
  "notes": "Standard structure for all employees"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Max 255 characters |
| `basic_amount` | numeric | Yes | Must be >= 0 |
| `allowances` | array | No | Array of allowance objects |
| `allowances.*.label` | string | Yes (if allowances provided) | Max 255 characters |
| `allowances.*.amount` | numeric | Yes (if allowances provided) | Must be >= 0 |
| `deductions` | array | No | Array of deduction objects |
| `deductions.*.label` | string | Yes (if deductions provided) | Max 255 characters |
| `deductions.*.amount` | numeric | Yes (if deductions provided) | Must be >= 0 |
| `pay_frequency` | string | Yes | Must be: `monthly`, `biweekly`, or `weekly` |
| `payable_days` | integer | Yes | Must be >= 1 |
| `notes` | string | No | Optional notes |

**Response:** `201 Created`

```json
{
  "id": 1,
  "name": "Standard Monthly Structure",
  "basic_amount": 5000.00,
  "allowances": [
    {
      "label": "Transport Allowance",
      "amount": 500.00
    },
    {
      "label": "Medical Allowance",
      "amount": 300.00
    }
  ],
  "deductions": [
    {
      "label": "Tax",
      "amount": 500.00
    }
  ],
  "pay_frequency": "monthly",
  "payable_days": 30,
  "notes": "Standard structure for all employees",
  "created_at": "2023-01-01T00:00:00.000000Z",
  "updated_at": "2023-01-01T00:00:00.000000Z"
}
```

---

### Update Salary Structure

**Endpoint:** `PUT /api/staff/salary-structures/{id}` or `PATCH /api/staff/salary-structures/{id}`

**Description:** Update an existing salary structure.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary_structures.manage,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Salary structure ID |

**Request Body:** Same as Create Salary Structure (all fields optional for PATCH, required for PUT)

**Response:**

```json
{
  "id": 1,
  "name": "Updated Monthly Structure",
  "basic_amount": 5500.00,
  "allowances": [
    {
      "label": "Transport Allowance",
      "amount": 600.00
    }
  ],
  "deductions": [
    {
      "label": "Tax",
      "amount": 550.00
    }
  ],
  "pay_frequency": "monthly",
  "payable_days": 30,
  "notes": "Updated structure",
  "created_at": "2023-01-01T00:00:00.000000Z",
  "updated_at": "2023-01-02T00:00:00.000000Z"
}
```

---

### Delete Salary Structure

**Endpoint:** `DELETE /api/staff/salary-structures/{id}`

**Description:** Delete a salary structure.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary_structures.manage,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Salary structure ID |

**Response:** `200 OK`

```json
{
  "message": "Salary structure deleted"
}
```

---

## Salary Run APIs

### List Salary Runs for Staff

**Endpoint:** `GET /api/staff/{staffId}/salary-runs`

**Description:** Retrieve a paginated list of salary runs for a specific staff member.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staffId` | integer | Yes | Staff ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `month` | string | No | Filter by month (format: Y-m) |
| `status` | string | No | Filter by status |
| `per_page` | integer | No | Number of items per page (default: 15) |

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "staff_id": 1,
      "month": "2024-01",
      "status": "paid",
      "gross": 5800.00,
      "per_day_rate": 193.33,
      "payable_days": 30,
      "present_days": 28,
      "paid_leave_days": 2,
      "unpaid_leave_days": 0,
      "absent_days": 0,
      "advance_adjusted": 0.00,
      "net_payable": 5413.33,
      "due_date": "2024-02-01",
      "paid_on": "2024-02-01",
      "invoice_id": 123,
      "notes": "January salary",
      "metadata": {},
      "created_at": "2024-01-31T00:00:00.000000Z",
      "updated_at": "2024-02-01T00:00:00.000000Z",
      "staff": {
        "id": 1,
        "code": "EMP001",
        "full_name": "John Doe"
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 15,
    "total": 1
  }
}
```

---

### Get Salary Run by ID

**Endpoint:** `GET /api/staff/salary-runs/{id}`

**Description:** Retrieve detailed information about a specific salary run.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read` permission

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Salary run ID |

**Response:**

```json
{
  "id": 1,
  "staff_id": 1,
  "month": "2024-01",
  "status": "paid",
  "gross": 5800.00,
  "per_day_rate": 193.33,
  "payable_days": 30,
  "present_days": 28,
  "paid_leave_days": 2,
  "unpaid_leave_days": 0,
  "absent_days": 0,
  "advance_adjusted": 0.00,
  "net_payable": 5413.33,
  "due_date": "2024-02-01",
  "paid_on": "2024-02-01",
  "invoice_id": 123,
  "notes": "January salary",
  "metadata": {},
  "created_at": "2024-01-31T00:00:00.000000Z",
  "updated_at": "2024-02-01T00:00:00.000000Z",
  "staff": {
    "id": 1,
    "code": "EMP001",
    "full_name": "John Doe"
  },
  "invoice": {
    "id": 123,
    "invoice_number": "INV-2024-001"
  }
}
```

---

### Create Salary Run

**Endpoint:** `POST /api/staff/{staffId}/salary-runs`

**Description:** Create a new salary run for a staff member for a specific month.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staffId` | integer | Yes | Staff ID |

**Request Body:**

```json
{
  "month": "2024-01",
  "salary_structure_id": 1,
  "override_basic": 5500.00,
  "override_allowances": [
    {
      "label": "Bonus",
      "amount": 500.00
    }
  ],
  "override_deductions": [
    {
      "label": "Advance",
      "amount": 200.00
    }
  ],
  "payable_days": 30,
  "notes": "January salary with bonus"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `month` | string | Yes | Date format: Y-m |
| `salary_structure_id` | integer | No | Must exist in salary_structures table |
| `override_basic` | numeric | No | Must be >= 0 |
| `override_allowances` | array | No | Array of allowance objects |
| `override_allowances.*.label` | string | Yes (if override_allowances provided) | Max 255 characters |
| `override_allowances.*.amount` | numeric | Yes (if override_allowances provided) | Must be >= 0 |
| `override_deductions` | array | No | Array of deduction objects |
| `override_deductions.*.label` | string | Yes (if override_deductions provided) | Max 255 characters |
| `override_deductions.*.amount` | numeric | Yes (if override_deductions provided) | Must be >= 0 |
| `payable_days` | integer | No | Must be >= 1 |
| `notes` | string | No | Optional notes |

**Response:** `201 Created`

```json
{
  "id": 1,
  "staff_id": 1,
  "month": "2024-01",
  "status": "pending",
  "gross": 6000.00,
  "per_day_rate": 200.00,
  "payable_days": 30,
  "present_days": 0,
  "paid_leave_days": 0,
  "unpaid_leave_days": 0,
  "absent_days": 0,
  "advance_adjusted": 0.00,
  "net_payable": 5800.00,
  "due_date": "2024-02-01",
  "paid_on": null,
  "invoice_id": null,
  "notes": "January salary with bonus",
  "metadata": {},
  "created_at": "2024-01-31T00:00:00.000000Z",
  "updated_at": "2024-01-31T00:00:00.000000Z"
}
```

---

### Pay Salary Run

**Endpoint:** `PATCH /api/staff/salary-runs/{id}/pay`

**Description:** Mark a salary run as paid and record payment details.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Salary run ID |

**Request Body:**

```json
{
  "paid_on": "2024-02-01",
  "notes": "Paid via bank transfer",
  "payment_metadata": {
    "transaction_id": "TXN123456",
    "payment_method": "bank_transfer"
  },
  "advance_adjusted": 200.00
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `paid_on` | date | No | Payment date |
| `notes` | string | No | Optional notes |
| `payment_metadata` | object | No | JSON object for payment metadata |
| `advance_adjusted` | numeric | No | Must be >= 0 |

**Response:**

```json
{
  "id": 1,
  "staff_id": 1,
  "month": "2024-01",
  "status": "paid",
  "gross": 5800.00,
  "per_day_rate": 193.33,
  "payable_days": 30,
  "present_days": 28,
  "paid_leave_days": 2,
  "unpaid_leave_days": 0,
  "absent_days": 0,
  "advance_adjusted": 200.00,
  "net_payable": 5213.33,
  "due_date": "2024-02-01",
  "paid_on": "2024-02-01",
  "invoice_id": 123,
  "notes": "Paid via bank transfer",
  "metadata": {
    "transaction_id": "TXN123456",
    "payment_method": "bank_transfer"
  },
  "created_at": "2024-01-31T00:00:00.000000Z",
  "updated_at": "2024-02-01T00:00:00.000000Z"
}
```

---

### Reverse Salary Run

**Endpoint:** `PATCH /api/staff/salary-runs/{id}/reverse`

**Description:** Reverse a paid salary run. Creates reversing journal entries, cancels invoice, and resets run status to "due".

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Salary run ID |

**Request Body:**

```json
{
  "reason": "Payment made in error"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `reason` | string | No | Optional reason for reversal |

**Response:**

```json
{
  "id": 1,
  "staff_id": 1,
  "month": "2024-01",
  "status": "due",
  "invoice_id": null,
  "paid_on": null,
  "gross": 5800.00,
  "net_payable": 5413.33,
  "staff": {
    "id": 1,
    "full_name": "John Doe"
  },
  "invoice": null
}
```

**Note:** The reversing journal entries will appear in transactions to balance out the original payment entries.

---

## Direct Salary Payment APIs (Recommended)

### Pay Salary Directly

**Endpoint:** `POST /api/staff/{staffId}/pay-salary`

**Description:** Pay salary directly without creating a salary run. This is the **recommended approach** as it simplifies the payment flow. Calculates salary, creates journal entries, and records payment in one step.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staffId` | integer | Yes | Staff ID |

**Request Body:**

```json
{
  "month": "2025-12",
  "salary_structure_id": 1,
  "override_basic": 50000,
  "override_allowances": [
    {
      "label": "Bonus",
      "amount": 5000
    }
  ],
  "override_deductions": [
    {
      "label": "Tax",
      "amount": 3000
    }
  ],
  "payable_days": 26,
  "advance_adjusted": 0,
  "paid_on": "2025-12-31",
  "notes": "December salary payment",
  "payment_metadata": {
    "transaction_id": "TXN123",
    "payment_method": "bank_transfer"
  }
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `month` | string | Yes | Date format: `Y-m` (e.g., "2025-12") |
| `salary_structure_id` | integer | No | Must exist in salary_structures table |
| `override_basic` | numeric | No | Must be >= 0 |
| `override_allowances` | array | No | Array of allowance objects |
| `override_allowances.*.label` | string | Yes (if override_allowances provided) | Label text |
| `override_allowances.*.amount` | numeric | Yes (if override_allowances provided) | Must be >= 0 |
| `override_deductions` | array | No | Array of deduction objects |
| `override_deductions.*.label` | string | Yes (if override_deductions provided) | Label text |
| `override_deductions.*.amount` | numeric | Yes (if override_deductions provided) | Must be >= 0 |
| `payable_days` | integer | No | Must be 1-31 (default: 26) |
| `advance_adjusted` | numeric | No | Must be >= 0 (default: 0) |
| `paid_on` | date | No | Payment date (default: today) |
| `notes` | string | No | Optional notes |
| `payment_metadata` | object | No | JSON object for additional metadata |

**Response:** `201 Created`

```json
{
  "data": {
    "staff": {
      "id": 1,
      "code": "EMP001",
      "full_name": "John Doe"
    },
    "invoice": {
      "id": 123,
      "invoice_number": "STF-20251231-001",
      "invoice_type": "staff",
      "amount": 50000,
      "status": "paid"
    },
    "month": "2025-12",
    "amount": 50000,
    "calculation": {
      "basic": 50000,
      "gross": 52000,
      "per_day_rate": 2000,
      "payable_days": 26,
      "present_days": 24,
      "paid_leave_days": 1,
      "unpaid_leave_days": 0,
      "absent_days": 1,
      "unpaid_deduction": 2000,
      "net_before_advance": 50000,
      "advance_adjusted": 0,
      "net_payable": 50000
    }
  },
  "message": "Salary paid successfully"
}
```

**Behavior:**
- Calculates salary based on basic, allowances, and deductions
- Automatically fetches attendance for the month
- Applies deductions for absent and unpaid leave days
- Creates journal entries automatically (debit: salary expense, credit: payment account)
- Creates an invoice for record-keeping
- **Prevents duplicate payments** - throws error if salary already paid for that month

**Error Responses:**

`409 Conflict` - Salary already paid for this month
```json
{
  "message": "Salary already paid for 2025-12. Use reverse method to undo."
}
```

---

### Reverse Direct Salary Payment

**Endpoint:** `POST /api/staff/{staffId}/reverse-salary`

**Description:** Reverse a direct salary payment. Creates reversing journal entries and cancels the invoice.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `staffId` | integer | Yes | Staff ID |

**Request Body:**

```json
{
  "month": "2025-12",
  "reason": "Payment made in error"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `month` | string | Yes | Date format: `Y-m` |
| `reason` | string | No | Optional reason for reversal |

**Response:**

```json
{
  "data": {
    "staff": {
      "id": 1,
      "code": "EMP001",
      "full_name": "John Doe"
    },
    "invoice": {
      "id": 123,
      "invoice_number": "STF-20251231-001",
      "status": "cancelled"
    },
    "month": "2025-12",
    "reversed": true
  },
  "message": "Salary payment reversed successfully"
}
```

**Behavior:**
- Finds the invoice for the staff/month combination
- Creates reversing journal entries (swaps debit/credit)
- Cancels the invoice
- The reversing entries appear in transactions to balance the original payment

**Error Responses:**

`404 Not Found` - No paid salary found for this month
```json
{
  "message": "No query results for model [App\\Models\\Invoice]"
}
```

---

## Staff-User Link APIs

### Link Staff to User

**Endpoint:** `POST /api/staff/{id}/link-user`

**Description:** Link an existing staff member to an existing ERP user account.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.users.manage,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Staff ID (must be numeric) |

**Request Body:**

```json
{
  "user_id": 5
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `user_id` | integer | Yes | Must exist in users table |

**Response:**

```json
{
  "id": 1,
  "user_id": 5,
  "code": "EMP001",
  "full_name": "John Doe",
  "designation": "Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 5000.00,
  "tags": ["senior", "sales"],
  "metadata": {},
  "created_at": "2023-01-15T10:00:00.000000Z",
  "updated_at": "2023-01-16T10:00:00.000000Z",
  "user": {
    "id": 5,
    "email": "john.doe@example.com",
    "full_name": "John Doe"
  }
}
```

---

### Unlink Staff from User

**Endpoint:** `DELETE /api/staff/{id}/link-user`

**Description:** Unlink a staff member from their associated ERP user account.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.users.manage,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Staff ID (must be numeric) |

**Response:**

```json
{
  "id": 1,
  "user_id": null,
  "code": "EMP001",
  "full_name": "John Doe",
  "designation": "Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 5000.00,
  "tags": ["senior", "sales"],
  "metadata": {},
  "created_at": "2023-01-15T10:00:00.000000Z",
  "updated_at": "2023-01-16T10:00:00.000000Z"
}
```

---

### Create User from Staff

**Endpoint:** `POST /api/staff/{id}/create-user`

**Description:** Create a new ERP user account from a staff member and automatically link them.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.users.manage,read-write` permissions

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | integer | Yes | Staff ID (must be numeric) |

**Request Body:**

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!",
  "full_name": "John Doe",
  "role_ids": [1, 2],
  "phone": "+1234567890"
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email, must be unique in users table |
| `password` | string | Yes | Minimum 8 characters, must be confirmed |
| `password_confirmation` | string | Yes | Must match password |
| `full_name` | string | Yes | Max 255 characters |
| `role_ids` | array | Yes | Minimum 1 role, all must exist in roles table |
| `role_ids.*` | integer | Yes | Must exist in roles table |
| `phone` | string | No | Max 50 characters |

**Response:** `201 Created`

```json
{
  "id": 1,
  "user_id": 5,
  "code": "EMP001",
  "full_name": "John Doe",
  "designation": "Manager",
  "department": "Sales",
  "phone": "+1234567890",
  "email": "john.doe@example.com",
  "status": "active",
  "date_of_joining": "2023-01-15",
  "monthly_salary": 5000.00,
  "tags": ["senior", "sales"],
  "metadata": {},
  "created_at": "2023-01-15T10:00:00.000000Z",
  "updated_at": "2023-01-16T10:00:00.000000Z",
  "user": {
    "id": 5,
    "email": "john.doe@example.com",
    "full_name": "John Doe"
  }
}
```

---

## Authentication & Authorization

All staff-related APIs require:

1. **Authentication:** Bearer token via Laravel Sanctum (`auth:sanctum` middleware)
2. **Module Access:** User must have access to the `module.staff` module
3. **Permissions:** 
   - Read operations require `module:module.staff,read`
   - Write operations require `module:module.staff,read-write`
   - Additional specific permissions may be required:
     - `permission:staff.salary_structures.manage,read-write` for salary structure management
     - `permission:staff.salary.pay,read-write` for salary run creation and payment
     - `permission:staff.attendance.manage,read-write` for attendance management
     - `permission:staff.users.manage,read-write` for staff-user linking

## Error Responses

All APIs may return the following error responses:

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

### 404 Not Found
```json
{
  "message": "Staff not found."
}
```

### 422 Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "field_name": [
      "The field name field is required."
    ]
  }
}
```

### 500 Server Error
```json
{
  "message": "Server Error"
}
```

---

## Notes

1. **Date Formats:**
   - Dates: `Y-m-d` (e.g., `2024-01-15`)
   - Months: `Y-m` (e.g., `2024-01`)
   - Timestamps: ISO 8601 format (e.g., `2024-01-15T10:00:00.000000Z`)

2. **Pagination:**
   - All list endpoints support pagination
   - Default `per_page` varies by endpoint (15 for staff/salary structures, 50 for attendance)
   - Pagination metadata is included in the `meta` object

3. **Staff Status Values:**
   - `active`: Staff member is currently active
   - `on_leave`: Staff member is on leave
   - `inactive`: Staff member is inactive

4. **Attendance Status Values:**
   - `present`: Staff was present
   - `absent`: Staff was absent
   - `paid_leave`: Staff was on paid leave
   - `unpaid_leave`: Staff was on unpaid leave

5. **Pay Frequency Values:**
   - `monthly`: Monthly salary payment
   - `biweekly`: Bi-weekly salary payment
   - `weekly`: Weekly salary payment

6. **Salary Run Status:**
   - `pending`: Salary run created but not yet paid
   - `paid`: Salary run has been paid

7. **Route Constraints:**
   - Staff ID routes use `whereNumber('id')` to ensure numeric IDs and avoid route collisions with slug-based routes like `salary-structures`

