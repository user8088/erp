# Staff Salary, Attendance, and Staff/User Linkage — Backend Prompt

This doc defines the backend APIs needed to support the new Staff module UIs (staff list/profile, salary structures, attendance, salary pay & invoices). Staff can be **ERP users** or **standalone staff**; we build on the existing `users` model but allow a staff record to link to a user.

---

## Domain Model (proposed)
- **User**: existing ERP user (authentication, permissions). Some staff are users.
- **Staff**: represents a person who may or may not be an ERP user.
  - Fields: `id`, `user_id` (nullable), `code`, `full_name`, `designation`, `department`, `phone`, `email`, `status` (`active|on_leave|inactive`), `date_of_joining`, `monthly_salary`, `tags`, metadata.
  - A staff row may point to a `user_id`. If present, that user is the ERP account. If absent, staff is standalone.
- **SalaryStructure**: template of pay components.
  - `id`, `name`, `basic_amount`, `allowances[] {label, amount}`, `deductions[] {label, amount}`, `pay_frequency` (`monthly|biweekly|weekly`), `payable_days`, `notes`.
- **AttendanceEntry**:
  - `id`, `person_id`, `person_type` (`staff|user`), `date` (Y-m-d), `status` (`present|absent|paid_leave|unpaid_leave`), `note`.
  - We store per-person-per-day; enforce uniqueness on `(person_id, person_type, date)`.
- **SalaryRun / StaffSalary**:
  - For a given staff and month, store calculated salary, attendance summary, deductions (absent/unpaid leave), advances adjustment, and generated invoice reference.
  - Fields (per staff per period): `id`, `staff_id`, `month` (YYYY-MM), `status` (`scheduled|due|paid`), `gross`, `absent_days`, `unpaid_leave_days`, `paid_leave_days`, `present_days`, `payable_days`, `per_day_rate`, `advance_adjusted`, `net_payable`, `due_date`, `paid_on`, `invoice_id` (staff invoice), `notes`.
- **StaffInvoice**: reuse existing invoice model; created when salary is paid.
- **Advance**: already exists (staff advances) — ensure it’s usable in salary calculation (balance, used amount).

---

## API Endpoints

### Staff
- `GET /staff` — list staff with filters: `q`, `status`, `department`, `designation`, `is_erp_user`, pagination.
- `POST /staff` — create standalone staff (optionally link `user_id`).
- `GET /staff/{id}` — fetch staff + linked `user` if any.
- `PATCH /staff/{id}` — update staff; allow attaching/detaching `user_id`.
- `DELETE /staff/{id}` — optional (likely soft-delete/disable).

### Salary Structures
- `GET /staff/salary-structures` — list with pagination.
- `POST /staff/salary-structures` — create.
- `GET /staff/salary-structures/{id}` — detail.
- `PUT /staff/salary-structures/{id}` — replace.
- `PATCH /staff/salary-structures/{id}` — partial update.
- `DELETE /staff/salary-structures/{id}` — optional archive.

Request shape:
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

### Attendance
- `GET /attendance` — query by `date`, `person_type`, `person_ids[]`, pagination; include summary counts if `?summary=1`.
- `POST /attendance/bulk` — bulk upsert for a date.
  - Body: `date`, array of `{ person_id, person_type, status, note }`.
  - Upsert semantics on `(person_id, person_type, date)`.
- `PATCH /attendance/{id}` — update single entry (status/note).
- Optional convenience:
  - `POST /attendance/mark-all` — mark all filtered people for a date as a status (e.g., all present).

### Salary Runs / Payroll
- `POST /staff/{staff_id}/salary-runs` — calculate salary for a month, store as `staff_salary` row.
  - Body: `{ month: "2025-01", salary_structure_id?: number, override_basic?: number, override_allowances?: [], override_deductions?: [], payable_days?: number }`
  - Behavior:
    - Fetch attendance for that month.
    - Per-day rate = (basic + allowances - fixed deductions?) / payable_days.
    - Deduct per-day rate * (absent_days + unpaid_leave_days).
    - Do not deduct paid_leave.
    - Adjust using outstanding advance balance (if applicable) and record `advance_adjusted`.
    - Produce `gross`, `net_payable`, `attendance_breakdown`.
    - Set status `due`, set `due_date` (default = month end).
- `GET /staff/{staff_id}/salary-runs?month=YYYY-MM` — fetch runs for a month.
- `PATCH /staff/salary-runs/{id}/pay` — mark paid, set `paid_on`, create `staff_invoice` (invoice_type=staff), attach invoice id; optional payment metadata.
- `GET /staff/salary-runs/{id}` — detail, including attendance summary used.

### Staff Invoices
- Reuse existing invoice system:
  - `invoice_type = "staff"`
  - `reference_type = "staff_salary_run"`
  - `reference_id = salary_run.id`
  - Amount = `net_payable`
  - Metadata include staff info, month, attendance breakdown, advance adjusted.

### Staff ↔ User linkage helpers
- `POST /staff/{id}/link-user` — link existing `user_id`.
- `DELETE /staff/{id}/link-user` — unlink.
- `POST /staff/{id}/create-user` — create ERP user from staff (email, password, role_ids).

---

## Validation & Constraints
- Attendance uniqueness: one entry per `(person_id, person_type, date)`.
- Allowed statuses: `present|absent|paid_leave|unpaid_leave`.
- Salary structure: all amounts ≥ 0; payable_days > 0; pay_frequency in enum.
- Salary run: require month (YYYY-MM). If attendance missing, default to `present`? (decide: safer to default to 0 entries → counts treated as 0; absent/unpaid derived from explicit entries only).
- Advance adjustment: cap at outstanding advance balance; record how much was applied.
- Idempotency: salary pay endpoint should be idempotent; if invoice already exists, return it.

---

## Permissions
- Mark attendance: role `attendance.manage` (or staff_admin).
- Manage salary structures: role `staff.salary_structures.manage`.
- Run/pay salary: role `staff.salary.pay`.
- Link/create ERP users: role `staff.users.manage`.

---

## Pagination & Filtering (list endpoints)
- Standard: `page`, `per_page`, `q`.
- Attendance: `date`, `from`, `to`, `person_type`, `person_ids[]`, `status`.
- Salary structures: `pay_frequency`, `name` search.
- Salary runs: `month`, `status`, `staff_ids[]`.

---

## Response Examples (concise)
- Salary structure GET:
```json
{
  "id": 12,
  "name": "Standard Monthly",
  "basic_amount": 60000,
  "allowances": [{ "label": "House Rent", "amount": 15000 }],
  "deductions": [{ "label": "Tax", "amount": 3000 }],
  "pay_frequency": "monthly",
  "payable_days": 26,
  "notes": null
}
```
- Attendance list:
```json
{
  "data": [
    { "id": 1, "person_id": "stf-1", "person_type": "staff", "date": "2025-01-02", "status": "present", "note": "" }
  ],
  "summary": { "present": 10, "absent": 2, "paid_leave": 1, "unpaid_leave": 0 },
  "meta": { "page": 1, "per_page": 50, "total": 13 }
}
```
- Salary run detail:
```json
{
  "id": 99,
  "staff_id": 1,
  "month": "2025-01",
  "status": "due",
  "gross": 80000,
  "per_day_rate": 3076.92,
  "payable_days": 26,
  "present_days": 24,
  "paid_leave_days": 1,
  "unpaid_leave_days": 1,
  "absent_days": 0,
  "advance_adjusted": 20000,
  "net_payable": 60000,
  "invoice_id": null,
  "due_date": "2025-01-31",
  "notes": null
}
```

---

## Calculations (baseline)
- `gross = basic + sum(allowances) - sum(deductions)`
- `per_day_rate = gross / payable_days`
- `deduction_for_unpaid = per_day_rate * (absent_days + unpaid_leave_days)`
- `net_before_advance = gross - deduction_for_unpaid`
- `net_payable = net_before_advance - advance_adjusted`
- Paid leave does not reduce payable days.

---

## Events / Audit
- Emit events: `attendance.updated`, `salary_run.created`, `salary_run.paid`, `staff.linked_user`.
- Keep audit trail on attendance changes and salary payouts.

---

## Migration Notes
- Add tables: `staff` (if not present), `salary_structures`, `attendance_entries`, `staff_salary_runs`.
- Ensure `invoices` can store `invoice_type = staff` and reference `staff_salary_runs`.

---

## Open Choices (recommend)
- Default missing attendance to: no entry (counts as neither present nor absent). Only recorded `absent/unpaid_leave` should deduct.
- Allow overrides per staff at salary-run time (pass overrides in payload).

