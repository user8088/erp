# Staff API Changelog & Recent Updates

This document outlines all recent changes, bug fixes, and new features in the Staff API endpoints. Please review this before implementing or updating frontend integrations.

## Table of Contents

1. [Breaking Changes](#breaking-changes)
2. [New Features](#new-features)
3. [Bug Fixes](#bug-fixes)
4. [API Changes](#api-changes)
5. [Permission Updates](#permission-updates)
6. [Migration Guide](#migration-guide)

---

## Breaking Changes

### None
All changes are backward compatible. Existing endpoints continue to work as before.

---

## New Features

### 1. Direct Salary Payment System (Recommended)

A new simplified salary payment system that **does not require salary runs**. This is the recommended approach going forward.

#### Pay Salary Directly

**Endpoint:** `POST /api/staff/{staffId}/pay-salary`

**Description:** Pay salary directly without creating a salary run. Calculates salary, creates journal entries, and records payment in one step.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write`

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

#### Reverse Direct Salary Payment

**Endpoint:** `POST /api/staff/{staffId}/reverse-salary`

**Description:** Reverse a direct salary payment. Creates reversing journal entries and cancels the invoice.

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write`

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

### 2. Salary Run Reversal

Added ability to reverse salary run payments.

#### Reverse Salary Run

**Endpoint:** `PATCH /api/staff/salary-runs/{id}/reverse`

**Description:** Reverse a paid salary run. Creates reversing journal entries, cancels invoice, and resets run status to "due".

**Authentication:** Required (`auth:sanctum`)

**Authorization:** Requires `module:module.staff,read-write` and `permission:staff.salary.pay,read-write`

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
  "month": "2025-12",
  "status": "due",
  "invoice_id": null,
  "paid_on": null,
  "gross": 50000,
  "net_payable": 50000,
  "staff": {
    "id": 1,
    "full_name": "John Doe"
  },
  "invoice": null
}
```

---

## Bug Fixes

### 1. Duplicate Salary Payment Prevention

**Issue:** Salary payments could be processed multiple times for the same month, creating duplicate journal entries.

**Fix:**
- Direct payment endpoint now checks for existing paid invoices before processing
- Salary run payment endpoint throws error if already paid (instead of silently returning)
- Journal entry creation checks for existing entries before creating new ones

**Impact:** Prevents duplicate payments and maintains data integrity.

---

### 2. Attendance Update Composite ID Support

**Issue:** Frontend was sending composite IDs like `"staff-1"` but API only accepted numeric IDs.

**Fix:**
- `PATCH /api/attendance/{id}` now accepts both formats:
  - Numeric ID: `123` (existing behavior)
  - Composite ID: `"staff-1"` or `"user-1"` (new)
  - Composite ID with date: Uses `date` field from request body or defaults to today

**Examples:**

```javascript
// Numeric ID (existing)
PATCH /api/attendance/123
{ "status": "present" }

// Composite ID - uses today's date
PATCH /api/attendance/staff-1
{ "status": "present" }

// Composite ID - with explicit date
PATCH /api/attendance/staff-1
{ 
  "status": "present",
  "date": "2025-12-12"
}
```

**Behavior:**
- If attendance entry doesn't exist for composite ID + date, it's automatically created
- If it exists, it's updated
- Automatically handles trailing segments like `staff-1:1` (strips `:1`)

---

### 3. SQL GROUP BY Error Fix

**Issue:** Attendance summary query was failing with SQL error when using `GROUP BY` with `ORDER BY created_at`.

**Fix:** Removed ordering from grouped summary queries. Ordering is now only applied to the main listing query, not the summary aggregation.

**Impact:** Attendance summary endpoint now works correctly without SQL errors.

---

### 4. Missing Companies Table Validation

**Issue:** Validation rules were checking against non-existent `companies` table.

**Fix:** Removed `exists:companies,id` validation from:
- `POST /api/account-mappings`
- `POST /api/journal-entries`

Now only validates as `nullable|integer` without existence check.

---

## API Changes

### Attendance APIs

#### Update Attendance Entry

**Endpoint:** `PATCH /api/attendance/{id}`

**Changes:**
- `id` parameter now accepts **string** (was integer only)
- Supports composite format: `"staff-{id}"` or `"user-{id}"`
- Added optional `date` field in request body for composite ID lookups
- Auto-creates entry if it doesn't exist when using composite ID

**Request Body (Updated):**

```json
{
  "status": "present",
  "note": "Optional note",
  "date": "2025-12-12"  // Optional, used with composite IDs
}
```

**Validation Rules:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `status` | string | No | Must be: `present`, `absent`, `paid_leave`, or `unpaid_leave` |
| `note` | string | No | Optional note |
| `date` | string | No | Date format: `Y-m-d` (for composite ID lookups) |

---

### Salary Run APIs

#### Pay Salary Run

**Endpoint:** `PATCH /api/staff/salary-runs/{id}/pay`

**Changes:**
- **Now throws error if already paid** (was silently returning existing run)
- Prevents duplicate journal entry creation
- Better error messages

**Error Response (New):**

`409 Conflict` - Already paid
```json
{
  "message": "Salary run is already paid. Use reverse method to undo payment."
}
```

---

## Permission Updates

### Staff Module Access

**Change:** `Manager` role now has `module.staff` access.

**Impact:** Users with Manager role can now access staff-related endpoints. Previously this permission was missing, causing 403 errors.

**Required Permissions:**

For attendance endpoints:
- `module:module.staff,read` (for GET requests)
- `module:module.staff,read-write` + `permission:staff.attendance.manage,read-write` (for POST/PATCH)

For salary endpoints:
- `module:module.staff,read` (for GET requests)
- `module:module.staff,read-write` + `permission:staff.salary.pay,read-write` (for payment operations)
- `module:module.staff,read-write` + `permission:staff.salary_structures.manage,read-write` (for salary structure management)

---

## Migration Guide

### For Frontend Developers

#### 1. Update Attendance Update Calls

**Before:**
```javascript
// Only worked with numeric IDs
PATCH /api/attendance/123
{ "status": "present" }
```

**After (Recommended):**
```javascript
// Now supports composite IDs - more intuitive
PATCH /api/attendance/staff-1
{ 
  "status": "present",
  "date": "2025-12-12"  // Optional, defaults to today
}
```

**Note:** Numeric IDs still work, so no breaking changes.

---

#### 2. Switch to Direct Salary Payment

**Old Approach (Still Works):**
```javascript
// Step 1: Create salary run
POST /api/staff/1/salary-runs
{
  "month": "2025-12",
  "salary_structure_id": 1
}

// Step 2: Pay the run
PATCH /api/staff/salary-runs/{runId}/pay
{
  "paid_on": "2025-12-31",
  "advance_adjusted": 0
}
```

**New Approach (Recommended):**
```javascript
// Single step - pay directly
POST /api/staff/1/pay-salary
{
  "month": "2025-12",
  "salary_structure_id": 1,
  "paid_on": "2025-12-31",
  "advance_adjusted": 0
}
```

**Benefits:**
- Simpler flow (one API call instead of two)
- Automatic duplicate prevention
- Same calculation logic
- Journal entries created automatically

---

#### 3. Error Handling Updates

**Salary Payment Errors:**

```javascript
// Handle duplicate payment error
try {
  await paySalary(staffId, data);
} catch (error) {
  if (error.response?.status === 409) {
    // Already paid - show message or offer to reverse
    const message = error.response.data.message;
    // "Salary already paid for 2025-12. Use reverse method to undo."
  }
}
```

**Attendance Update Errors:**

```javascript
// Handle missing attendance entry
try {
  await updateAttendance('staff-1', { status: 'present' });
} catch (error) {
  if (error.response?.status === 404) {
    // Entry doesn't exist - but wait, it should auto-create now!
    // This should only happen if staff doesn't exist
  }
}
```

---

### Recommended Implementation

#### Attendance Management

```javascript
// Update attendance using composite ID
async function updateAttendanceStatus(staffId, date, status, note = null) {
  const response = await api.patch(`/attendance/staff-${staffId}`, {
    status,
    note,
    date  // Explicitly pass date for clarity
  });
  return response.data;
}
```

#### Salary Payment

```javascript
// Pay salary directly (recommended)
async function paySalaryDirect(staffId, month, options = {}) {
  const response = await api.post(`/staff/${staffId}/pay-salary`, {
    month,
    salary_structure_id: options.structureId,
    override_basic: options.basic,
    override_allowances: options.allowances,
    override_deductions: options.deductions,
    payable_days: options.payableDays || 26,
    advance_adjusted: options.advanceAdjusted || 0,
    paid_on: options.paidOn,
    notes: options.notes,
    payment_metadata: options.metadata || {}
  });
  return response.data;
}

// Reverse salary payment
async function reverseSalary(staffId, month, reason = null) {
  const response = await api.post(`/staff/${staffId}/reverse-salary`, {
    month,
    reason
  });
  return response.data;
}
```

---

## Summary of Endpoints

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/staff/{staffId}/pay-salary` | Pay salary directly (recommended) |
| `POST` | `/api/staff/{staffId}/reverse-salary` | Reverse direct salary payment |
| `PATCH` | `/api/staff/salary-runs/{id}/reverse` | Reverse salary run payment |

### Updated Endpoints

| Method | Endpoint | Changes |
|--------|----------|---------|
| `PATCH` | `/api/attendance/{id}` | Now accepts string/composite IDs, auto-creates entries |
| `PATCH` | `/api/staff/salary-runs/{id}/pay` | Throws error if already paid, prevents duplicates |

### Unchanged Endpoints

All other endpoints work exactly as before. No breaking changes.

---

## Testing Checklist

Before deploying frontend changes, test:

- [ ] Attendance update with numeric ID (backward compatibility)
- [ ] Attendance update with composite ID (`staff-1`)
- [ ] Attendance update creates entry if missing
- [ ] Direct salary payment works
- [ ] Direct salary payment prevents duplicates
- [ ] Direct salary reversal works
- [ ] Salary run payment throws error if already paid
- [ ] Salary run reversal works
- [ ] Permission errors are handled correctly

---

## Questions or Issues?

If you encounter any issues or have questions about these changes, please refer to:
- Full API documentation: `STAFF_API_DOCUMENTATION.md`
- Payroll-specific docs: `docs/staff-payroll-apis.md`

---

**Last Updated:** December 2025

