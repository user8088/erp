# Attendance Late Feature — Backend Requirements

This document defines the backend changes needed to support marking attendance as "late" with arrival time tracking.

---

## Overview

The frontend now supports marking staff attendance as "late" with an optional arrival time. This requires backend updates to:

1. Add "late" as a valid attendance status
2. Store arrival time (`late_time`) for late entries
3. Include "late" in attendance summaries
4. Update API endpoints to accept and return `late_time`

---

## Database Schema Changes

### AttendanceEntry Table

Add a new column to store the arrival time for late entries:

```sql
ALTER TABLE attendance_entries 
ADD COLUMN late_time TIME NULL;

-- Add index for queries filtering by late_time
CREATE INDEX idx_attendance_entries_late_time ON attendance_entries(late_time) WHERE late_time IS NOT NULL;
```

**Field Details:**
- `late_time`: `TIME` type (nullable)
  - Format: `HH:MM` (e.g., "09:30", "14:45")
  - Only populated when `status = 'late'`
  - Should be cleared when status changes to something other than "late"
  - Validation: Must be a valid time in 24-hour format

---

## Status Enum Update

Update the attendance status enum to include "late":

**Before:**
```php
// Allowed values: 'present', 'absent', 'paid_leave', 'unpaid_leave'
```

**After:**
```php
// Allowed values: 'present', 'late', 'absent', 'paid_leave', 'unpaid_leave'
```

**Business Logic:**
- "late" should be treated similarly to "present" for salary calculation purposes (i.e., not deducted)
- However, it can be used for reporting and tracking purposes
- When calculating attendance summaries, "late" should be counted separately from "present"

---

## API Endpoint Updates

### 1. `PATCH /attendance/{id}` — Update Attendance Entry

**Request Body:**
```json
{
  "status": "late",
  "late_time": "09:30",  // Optional, required when status is "late"
  "date": "2025-01-15",  // Optional, for date-specific updates
  "note": "Optional note"
}
```

**Validation Rules:**
- If `status` is set to "late", `late_time` should be provided (required)
- If `status` is changed from "late" to another status, `late_time` should be set to `null`
- If `status` is "late" and `late_time` is provided, validate it's a valid time format (HH:MM)
- If `status` is not "late", `late_time` should be ignored or set to `null`

**Response:**
```json
{
  "attendance": {
    "id": 123,
    "person_id": 456,
    "person_type": "staff",
    "name": "John Doe",
    "designation": "Manager",
    "date": "2025-01-15",
    "status": "late",
    "late_time": "09:30",
    "note": "Traffic delay"
  }
}
```

### 2. `POST /attendance/bulk` — Bulk Upsert

**Request Body:**
```json
{
  "date": "2025-01-15",
  "entries": [
    {
      "person_id": 456,
      "person_type": "staff",
      "status": "late",
      "late_time": "09:30",  // Optional, required when status is "late"
      "note": "Optional note"
    }
  ]
}
```

**Validation:**
- Same validation rules as single update endpoint
- If any entry has `status: "late"` without `late_time`, return validation error

### 3. `POST /attendance/mark-all` — Mark All

**Request Body:**
```json
{
  "date": "2025-01-15",
  "status": "late",
  "late_time": "09:30",  // Optional, required when status is "late"
  "person_type": "staff",
  "staff_status": "active"
}
```

**Behavior:**
- If `status` is "late", `late_time` should be required
- Apply the same `late_time` to all entries marked as late in this bulk operation

### 4. `GET /attendance` — List Attendance

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "person_id": 456,
      "person_type": "staff",
      "name": "John Doe",
      "designation": "Manager",
      "date": "2025-01-15",
      "status": "late",
      "late_time": "09:30",  // Include in response
      "note": "Traffic delay"
    }
  ],
  "summary": {
    "present": 10,
    "late": 2,  // Include "late" count
    "absent": 1,
    "paid_leave": 0,
    "unpaid_leave": 0
  },
  "meta": { ... }
}
```

**Summary Calculation:**
- When `?summary=1` is included, count entries with `status = 'late'` separately
- Include "late" in the summary object

---

## Salary Calculation Impact

**Important:** "late" entries should be treated the same as "present" for salary calculation purposes:

- **Present days** = count of entries with `status IN ('present', 'late')`
- **Absent days** = count of entries with `status = 'absent'`
- **Unpaid leave days** = count of entries with `status = 'unpaid_leave'`
- **Paid leave days** = count of entries with `status = 'paid_leave'`

**Example:**
```php
$presentDays = AttendanceEntry::where('person_id', $staffId)
    ->where('date', '>=', $monthStart)
    ->where('date', '<=', $monthEnd)
    ->whereIn('status', ['present', 'late'])
    ->count();
```

---

## Migration Script

```php
// Migration: add_late_time_to_attendance_entries
Schema::table('attendance_entries', function (Blueprint $table) {
    $table->time('late_time')->nullable()->after('status');
});

// Update status enum in database (if using enum type)
// Or update validation rules in model/controller

// Update existing data: clear late_time for non-late entries
DB::table('attendance_entries')
    ->where('status', '!=', 'late')
    ->orWhereNull('status')
    ->update(['late_time' => null]);
```

---

## Validation Rules

### Model Validation (Laravel Example)

```php
public function rules()
{
    return [
        'status' => ['required', 'in:present,late,absent,paid_leave,unpaid_leave'],
        'late_time' => [
            'nullable',
            'required_if:status,late',
            'date_format:H:i',
        ],
    ];
}

// Custom validation in controller or model
public function validateLateTime($status, $lateTime)
{
    if ($status === 'late' && empty($lateTime)) {
        throw new ValidationException('late_time is required when status is late');
    }
    
    if ($status !== 'late' && !empty($lateTime)) {
        // Clear late_time when status is not late
        return null;
    }
    
    return $lateTime;
}
```

---

## API Response Examples

### Success Response (Mark as Late)

```json
{
  "attendance": {
    "id": 123,
    "person_id": 456,
    "person_type": "staff",
    "name": "John Doe",
    "designation": "Manager",
    "date": "2025-01-15",
    "status": "late",
    "late_time": "09:30",
    "note": "Traffic delay"
  }
}
```

### Error Response (Missing Time)

```json
{
  "error": "Validation failed",
  "message": "late_time is required when status is late",
  "errors": {
    "late_time": ["The late_time field is required when status is late."]
  }
}
```

### Error Response (Invalid Time Format)

```json
{
  "error": "Validation failed",
  "message": "Invalid time format",
  "errors": {
    "late_time": ["The late_time must be in format HH:MM (e.g., 09:30)."]
  }
}
```

---

## Testing Checklist

- [ ] Mark attendance as "late" with valid time
- [ ] Mark attendance as "late" without time (should fail)
- [ ] Mark attendance as "late" with invalid time format (should fail)
- [ ] Change status from "late" to "present" (late_time should be cleared)
- [ ] Change status from "present" to "late" with time (should succeed)
- [ ] Bulk mark all as "late" with time
- [ ] Attendance summary includes "late" count
- [ ] Salary calculation treats "late" same as "present"
- [ ] List attendance returns late_time for late entries
- [ ] Filter attendance by status="late" works correctly

---

## Frontend Integration Notes

The frontend sends:
- `status: "late"` with `late_time: "HH:MM"` when marking as late
- `late_time: null` when changing from "late" to another status

The frontend expects:
- `late_time` field in attendance entry responses
- "late" count in summary object
- Validation errors if `late_time` is missing when `status` is "late"

---

## Backward Compatibility

- Existing attendance entries without `late_time` remain valid
- API endpoints should handle missing `late_time` gracefully (return `null`)
- Summary calculations should default to 0 for "late" if not present
- Existing code that filters by status should include "late" in appropriate queries

---

## Additional Considerations

1. **Reporting:** Consider adding reports for:
   - Late arrival frequency by staff member
   - Average late arrival time
   - Late arrivals by department/designation

2. **Notifications:** Optional feature to notify managers when staff are marked as late

3. **Time Validation:** Consider adding business rules:
   - Minimum/maximum valid arrival times
   - Office hours validation

4. **Historical Data:** Existing attendance entries will have `late_time = null`, which is expected and valid

---

## Summary

**Required Changes:**
1. ✅ Add `late_time` column to `attendance_entries` table
2. ✅ Update status enum to include "late"
3. ✅ Update API endpoints to accept/return `late_time`
4. ✅ Update validation to require `late_time` when `status = "late"`
5. ✅ Update summary calculations to include "late" count
6. ✅ Update salary calculation to treat "late" same as "present"
7. ✅ Clear `late_time` when status changes from "late" to another status

**Optional Enhancements:**
- Late arrival reporting
- Time-based validation rules
- Manager notifications

