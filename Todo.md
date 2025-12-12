# Staff & Payroll APIs (Frontend Integration)

This doc summarizes the new Staff / Attendance / Salary features for frontend use: endpoints, payloads, permissions, and notes.

## Permissions & Middleware
- Module gate: `module.staff` wraps all staff/attendance routes.
- Permission gate (middleware alias `permission`):
  - `staff.attendance.manage` — attendance write.
  - `staff.salary_structures.manage` — salary structure write.
  - `staff.salary.pay` — salary run create/pay.
  - `staff.users.manage` — link/create staff users.
- Account mappings required to pay salaries: `staff_salary_expense`, `staff_salary_payment`.

## Staff
- List: `GET /api/staff?q=&status=&department=&designation=&is_erp_user=&page=&per_page=`
- Detail: `GET /api/staff/{id}`
- Create: `POST /api/staff`
  ```json
  {
    "code": "STF-1",
    "full_name": "Jane Doe",
    "status": "active",
    "monthly_salary": 60000,
    "user_id": null,
    "designation": "Manager",
    "department": "Sales",
    "phone": "123",
    "email": "jane@example.com",
    "date_of_joining": "2025-01-02",
    "tags": ["fulltime"],
    "metadata": {}
  }
  ```
- Update: `PATCH /api/staff/{id}` (partial, same fields)
- Delete: `DELETE /api/staff/{id}`

### Staff ↔ User linkage
- Link existing user: `POST /api/staff/{id}/link-user` { "user_id": 10 }
- Unlink: `DELETE /api/staff/{id}/link-user`
- Create ERP user from staff: `POST /api/staff/{id}/create-user`
  ```json
  {
    "email": "newuser@example.com",
    "password": "secret123",
    "password_confirmation": "secret123",
    "full_name": "Jane Doe",
    "role_ids": [1,2],
    "phone": "123"
  }
  ```
Permissions: `staff.users.manage` (read-write).

## Salary Structures
- List: `GET /api/staff/salary-structures?pay_frequency=&name=&page=&per_page=`
- Detail: `GET /api/staff/salary-structures/{id}`
- Create: `POST /api/staff/salary-structures`
  ```json
  {
    "name": "Standard Monthly",
    "basic_amount": 60000,
    "allowances": [{ "label": "House Rent", "amount": 15000 }],
    "deductions": [{ "label": "Tax", "amount": 3000 }],
    "pay_frequency": "monthly",
    "payable_days": 26,
    "notes": "optional"
  }
  ```
- Update: `PUT/PATCH /api/staff/salary-structures/{id}` (partial allowed)
- Delete: `DELETE /api/staff/salary-structures/{id}`
Permissions: `staff.salary_structures.manage` for writes.

## Attendance
- Query: `GET /api/attendance?date=&from=&to=&person_type=staff|user&person_ids[]=...&status=&summary=1&page=&per_page=`
  - `summary=1` returns counts by status.
- Bulk upsert (per date): `POST /api/attendance/bulk`
  ```json
  {
    "date": "2025-01-02",
    "entries": [
      { "person_id": 1, "person_type": "staff", "status": "present", "note": "" }
    ]
  }
  ```
- Update single: `PATCH /api/attendance/{id}` { "status": "absent", "note": "Sick" }
- Mark all: `POST /api/attendance/mark-all`
  ```json
  { "date": "2025-01-03", "status": "present", "person_type": "staff", "person_ids": [1,2,3] }
  ```
Permissions: `staff.attendance.manage` for writes.

## Salary Runs / Payroll
- List for staff: `GET /api/staff/{staffId}/salary-runs?month=&status=&page=&per_page=`
- Detail: `GET /api/staff/salary-runs/{id}`
- Create run: `POST /api/staff/{staffId}/salary-runs`
  ```json
  {
    "month": "2025-01",
    "salary_structure_id": 1,
    "override_basic": 70000,
    "override_allowances": [{ "label": "Bonus", "amount": 5000 }],
    "override_deductions": [{ "label": "Tax", "amount": 4000 }],
    "payable_days": 26,
    "notes": "January payroll"
  }
  ```
  Behavior: computes gross/per-day; deducts absent+unpaid days; ignores paid leave; sets status `due`, due_date = month end; stores attendance breakdown in metadata; tracks `net_before_advance`.
- Pay run: `PATCH /api/staff/salary-runs/{id}/pay`
  ```json
  {
    "paid_on": "2025-01-31",
    "notes": "Paid via bank",
    "payment_metadata": { "method": "bank", "txn": "ABC123" },
    "advance_adjusted": 5000
  }
  ```
  Behavior: idempotent; applies `advance_adjusted` (>=0) to compute `net_payable = net_before_advance - advance_adjusted` (floored at 0); updates invoice amount; marks status `paid`; posts JE using mapped accounts.
Permissions: `staff.salary.pay` for create/pay.

## Invoices & Accounting
- Staff invoices auto-created on pay with:
  - `invoice_type`: `staff`
  - `reference_type`: `App\Models\StaffSalaryRun`
  - `reference_id`: salary_run.id
  - `amount`: `net_payable`
- COA mapping needed before paying runs:
  - `mapping_type`: `staff_salary_expense`
  - `mapping_type`: `staff_salary_payment`
  (use existing account-mapping endpoints)

## Response patterns
- Pagination: responses include `meta` with `current_page`, `last_page`, `per_page`, `total`.
- Attendance `summary=1`: `{ summary: { present, absent, paid_leave, unpaid_leave } }`.
- Salary run detail includes attendance breakdown and invoice_id when paid.

## Integration Tips
- Call pay only after COA mappings are set; otherwise pay fails.
- Pay is idempotent: re-calling returns existing invoice/run.
- Use `person_type` = `staff` for staff attendance; `user` is also supported.

## Attendance mark-all filters
- Endpoint: `POST /api/attendance/mark-all`
- Supports optional staff filters when `person_type=staff`:
  - `department`
  - `designation`
  - `staff_status` (`active|on_leave|inactive`)
  - or explicit `person_ids[]`

