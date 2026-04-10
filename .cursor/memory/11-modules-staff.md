# Staff Module Documentation

## Overview

The Staff module manages employees, attendance tracking, payroll processing, and salary management.

## Features

- **Staff Management**: Employee profiles and information
- **Attendance Tracking**: Daily attendance with present/absent/leave status
- **Payroll Processing**: Monthly salary calculation and payment
- **Advance Management**: Track and deduct staff advances
- **Salary Structures**: Configure salary components (allowances/deductions)
- **Role Integration**: Link staff to ERP user accounts
- **Reports**: Attendance reports, payroll summaries

## Routes & Pages

```
/staff                               - Staff dashboard
/staff/members                       - Staff list
/staff/members/[id]                  - Staff detail
/staff/members/new                   - Create staff
/staff/attendance                    - Attendance tracking
/staff/invoices                      - Staff invoices (salary payments)
/staff/roles                         - Role management
/staff/settings                      - Staff settings
/staff/tags                         - Staff tag manager

/staff/salary-structures             - Salary structures list
/staff/salary-structures/[id]        - Edit structure
/staff/salary-structures/new         - Create structure

/staff/advance/new                   - Give advance
```

## Components

### Staff Dashboard (`app/staff/page.tsx`)
- **Components:**
  - `StaffSummary` - Overview KPIs
  - `StaffShortcuts` - Quick actions
  - `StaffReports` - Report links

### Staff List (`app/components/Staff/`)

#### StaffTable (`app/components/Staff/StaffTable.tsx`)
- **Columns:** Code, Name, Designation, Department, Phone, Status, Salary, Actions
- **Status:** Active, On Leave, Inactive

#### StaffFilterBar (`app/components/Staff/StaffFilterBar.tsx`)
- Search by name/code
- Filter by department, designation, status

#### useStaffList (`app/components/Staff/useStaffList.ts`)
- Custom hook for staff data
- Caching and pagination

### Staff Detail (`app/components/StaffDetail/`)

#### StaffDetailContent (`app/components/StaffDetail/StaffDetailContent.tsx`)
- Main layout with tabs
- Data orchestration

#### StaffDetailHeader (`app/components/StaffDetail/StaffDetailHeader.tsx`)
- Staff name and code
- Status badge
- Quick actions

#### StaffDetailsForm (`app/components/StaffDetail/StaffDetailsForm.tsx`)
- **Fields:**
  - Code
  - Full Name
  - Designation
  - Department
  - Phone
  - Email
  - Date of Joining
  - Monthly Salary
  - Status
  - Tags

#### StaffDetailTabs (`app/components/StaffDetail/StaffDetailTabs.tsx`)
- Tabs: Details, Attendance, Salary, Advances, Activity

#### StaffSettingsTab (`app/components/StaffDetail/StaffSettingsTab.tsx`)
- ERP user linking
- Login creation

### Attendance (`app/staff/attendance/page.tsx`)

#### Attendance Table
- **Features:**
  - Date-wise attendance grid
  - Status selection: Present, Absent, Paid Leave, Unpaid Leave, Late
  - Bulk entry
  - Late time recording
  - Notes
- **Calculation:**
  - Present days count
  - Absent days count
  - Leave days count

### Payroll Components

#### Pay Salary Flow
1. Select month (YYYY-MM format)
2. System calculates:
   - Basic salary
   - Allowances
   - Deductions
   - Payable days (based on attendance)
   - Per day rate
   - Net before advance
   - Advance adjustment
   - Final net payable
3. Generate salary invoice
4. Record payment

#### Advance Management
- Give advance: Record loan to staff
- Deduct from salary: Automatic deduction during payroll
- Track balance: Running balance of advances

## Type Definitions

### Core Staff Types

```typescript
interface StaffMember {
  id: number;
  code?: string | null;
  full_name: string;
  designation: string | null;
  department?: string | null;
  phone?: string | null;
  email?: string | null;
  status: "active" | "on_leave" | "inactive";
  date_of_joining?: string | null;
  monthly_salary?: number | null;
  next_pay_date?: string | null;
  last_paid_on?: string | null;
  last_paid_month?: string | null;
  is_paid_for_current_month?: boolean;
  advance_balance?: number;
  is_erp_user?: boolean;
  erp_user_id?: number | null;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  user?: {
    id: number;
    email?: string | null;
    full_name?: string | null;
  };
}

interface StaffSalary {
  id: string | number;
  staff_id: string | number;
  month: string;  // YYYY-MM
  status: "scheduled" | "due" | "paid";
  amount: number;
  due_date: string;
  paid_on?: string | null;
  invoice_number?: string | null;
  advance_adjusted?: number | null;
  notes?: string | null;
}

interface StaffAdvance {
  id: string | number;
  staff_id: string | number;
  salary_run_id: string | number | null;
  invoice_id: string | number | null;
  journal_entry_id: string | number | null;
  amount: number;
  balance: number;
  transaction_type: "given" | "deducted" | "refunded";
  reference: string | null;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type PayFrequency = "monthly" | "biweekly" | "weekly";

interface SalaryComponent {
  id?: string | number;
  label: string;
  amount: number;
}

/**
 * @deprecated Salary structures are no longer used.
 * Use direct payment API (staffApi.paySalary) instead.
 */
interface StaffSalaryStructure {
  id: string | number;
  name: string;
  basic_amount: number;
  allowances: SalaryComponent[];
  deductions: SalaryComponent[];
  pay_frequency: PayFrequency;
  payable_days: number;
  notes?: string | null;
}
```

### Attendance Types

```typescript
type AttendanceStatus =
  | "present"
  | "absent"
  | "paid_leave"
  | "unpaid_leave"
  | "late";

interface AttendanceEntry {
  id: string | number;
  person_id: string | number;
  person_type: "staff" | "user";
  name: string;
  designation?: string | null;
  date: string;  // YYYY-MM-DD
  status: AttendanceStatus;
  note?: string | null;
  late_time?: string | null;  // HH:MM format
}

interface StaffSalaryRun {
  id: string | number;
  staff_id: string | number;
  month: string;  // YYYY-MM
  status: "scheduled" | "due" | "paid";
  gross: number;
  per_day_rate: number;
  payable_days: number;
  present_days: number;
  paid_leave_days: number;
  unpaid_leave_days: number;
  absent_days: number;
  net_before_advance: number;
  advance_adjusted: number;
  net_payable: number;
  invoice_id?: string | number | null;
  invoice_number?: string | null;
  due_date?: string | null;
  paid_on?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}
```

## API Endpoints

### Staff API

```typescript
// List staff
GET /staff?q=&status=&department=&designation=&page=1&per_page=20
Response: Paginated<StaffMember>

// Get staff
GET /staff/{id}
Response: StaffMember

// Create staff
POST /staff
Body: {
  code?: string,
  full_name: string,
  designation: string,
  department?: string,
  phone?: string,
  email?: string,
  date_of_joining?: string,
  monthly_salary?: number,
  status?: string,
  tags?: string[]
}
Response: { staff: StaffMember }

// Update staff
PATCH /staff/{id}
Body: Partial<StaffMember>
Response: { staff: StaffMember }

// Delete staff
DELETE /staff/{id}
Response: { message: string }

// Create ERP user for staff
POST /staff/{id}/create-user
Body: {
  email: string,
  password: string,
  password_confirmation: string,
  full_name: string,
  role_ids?: number[],
  phone?: string
}
Response: { user: User }

// Link existing user to staff
POST /staff/{id}/link-user
Body: { user_id: number }
Response: { staff: StaffMember }

// Unlink user from staff
DELETE /staff/{id}/link-user
Response: { message: string }
```

### Payroll API

```typescript
// Pay salary
POST /staff/{id}/pay-salary
Body: {
  month: string,  // YYYY-MM
  override_basic?: number,
  override_allowances?: Array<{ label: string, amount: number }>,
  override_deductions?: Array<{ label: string, amount: number }>,
  payable_days?: number,
  manual_attendance_deduction?: number,
  advance_adjusted?: number,
  deduct_advances?: boolean,
  paid_on?: string,
  notes?: string
}
Response: {
  data: {
    staff: { id, code, full_name },
    invoice: { id, invoice_number, invoice_type, amount, status },
    month: string,
    amount: number,
    calculation: {
      basic: number,
      gross: number,
      per_day_rate: number,
      payable_days: number,
      present_days: number,
      paid_leave_days: number,
      unpaid_leave_days: number,
      absent_days: number,
      unpaid_deduction: number,
      net_before_advance: number,
      advance_adjusted: number,
      net_payable: number
    }
  },
  message: string
}

// Reverse salary
POST /staff/{id}/reverse-salary
Body: { month: string, reason?: string }
Response: {
  data: { staff, invoice, month, reversed },
  message: string
}
```

### Advances API

```typescript
// List advances
GET /staff/{id}/advances?transaction_type=&from_date=&to_date=&page=1&per_page=20
Response: Paginated<StaffAdvance>

// Get advance balance
GET /staff/{id}/advances/balance
Response: { staff_id: number, balance: number }

// Give advance
POST /staff/{id}/advances
Body: {
  amount: number,
  transaction_date?: string,
  notes?: string
}
Response: { data: StaffAdvance, message: string }
```

### Attendance API

```typescript
// List attendance
GET /attendance?date=&person_type=staff&page=1&per_page=50
Response: {
  data: AttendanceEntry[],
  meta: PaginationMeta,
  summary?: {
    present: number,
    absent: number,
    late: number,
    paid_leave: number,
    unpaid_leave: number,
    total: number
  }
}

// Save attendance
POST /attendance
Body: {
  person_id: number,
  person_type: "staff",
  date: string,
  status: AttendanceStatus,
  note?: string,
  late_time?: string
}
Response: AttendanceEntry

// Bulk save attendance
POST /attendance/bulk
Body: {
  entries: Array<{
    person_id: number,
    date: string,
    status: AttendanceStatus,
    note?: string,
    late_time?: string
  }>
}
Response: {
  entries: AttendanceEntry[],
  summary: AttendanceSummary
}

// Delete attendance entry
DELETE /attendance/{personId}/{date}
```

### Staff Tags API

```typescript
// List staff tags
GET /staff-tags
Response: StaffTag[]

// Create tag
POST /staff-tags
Body: { name: string, color: string }
Response: StaffTag

// Update tag
PUT /staff-tags/{id}
Body: { name: string, color: string }
Response: StaffTag

// Delete tag
DELETE /staff-tags/{id}
```

## Business Logic

### Salary Calculation

```typescript
// 1. Calculate per day rate
const perDayRate = monthlySalary / payableDays;

// 2. Calculate gross (with overrides if provided)
const gross = overrideBasic || monthlySalary;

// 3. Calculate attendance deduction
const unpaidDays = absentDays + (unpaidLeaveDays || 0);
const unpaidDeduction = perDayRate * unpaidDays;

// 4. Net before advance
const netBeforeAdvance = gross - unpaidDeduction + allowances - deductions;

// 5. Advance adjustment
const advanceAdjusted = Math.min(advanceBalance, netBeforeAdvance * 0.5); // Max 50%

// 6. Final net payable
const netPayable = netBeforeAdvance - advanceAdjusted;
```

### Attendance Summary

```typescript
// For salary calculation:
const summary = {
  presentDays: attendance.filter(a => a.status === "present").length,
  absentDays: attendance.filter(a => a.status === "absent").length,
  paidLeaveDays: attendance.filter(a => a.status === "paid_leave").length,
  unpaidLeaveDays: attendance.filter(a => a.status === "unpaid_leave").length,
  lateDays: attendance.filter(a => a.status === "late").length
};
```

### Advance Handling

```typescript
// Advance transaction types:
// - given: Advance provided to staff (balance increases)
// - deducted: Advance deducted from salary (balance decreases)
// - refunded: Advance returned by staff (balance decreases)

// Current balance calculation:
const currentBalance = advances.reduce((sum, a) => {
  if (a.transaction_type === "given") return sum + a.amount;
  return sum - a.amount;
}, 0);
```

### Staff-User Linking

```typescript
// Staff can be linked to ERP user for:
// - System login
// - Role-based permissions
// - Activity tracking

// Linking process:
// 1. Create staff member
// 2. Create ERP user (or use existing)
// 3. Link user to staff
// 4. Staff can now login and has associated permissions
```

## Component Usage Examples

### Paying Salary
```typescript
const handlePaySalary = async () => {
  const result = await staffApi.paySalary(staffId, {
    month: "2024-01",
    deduct_advances: true,
    notes: "January salary payment"
  });

  console.log("Net Payable:", result.data.calculation.net_payable);
  console.log("Invoice:", result.data.invoice.invoice_number);
};
```

### Recording Attendance
```typescript
const handleSaveAttendance = async () => {
  await attendanceApi.bulkSave([
    {
      person_id: staffId,
      date: "2024-01-15",
      status: "present"
    },
    {
      person_id: staffId,
      date: "2024-01-16",
      status: "late",
      late_time: "09:30",
      note: "Traffic delay"
    }
  ]);
};
```

### Giving Advance
```typescript
const handleGiveAdvance = async () => {
  await staffApi.giveAdvance(staffId, {
    amount: 5000,
    transaction_date: "2024-01-15",
    notes: "Emergency loan"
  });

  // Refresh staff data
  refresh();
};
```

### Creating Staff with User
```typescript
const handleCreateStaff = async () => {
  // 1. Create staff
  const staff = await staffApi.create({
    full_name: "John Smith",
    designation: "Sales Manager",
    department: "Sales",
    email: "john@company.com",
    monthly_salary: 50000
  });

  // 2. Create user for staff
  await staffApi.createUser(staff.id, {
    email: "john@company.com",
    password: "securepassword",
    password_confirmation: "securepassword",
    full_name: "John Smith",
    role_ids: [2, 3]  // Sales, Customer modules
  });
};
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Staff | module.staff | read |
| Create/Edit Staff | module.staff | read-write |
| Process Payroll | module.staff | read-write |
| Manage Advances | module.staff | read-write |
| Record Attendance | module.staff | read-write |
| View Invoices | module.staff | read |
| Manage Tags | module.tag_manager | read-write |

## Related Documentation
- [Type System](./04-type-system.md) - StaffMember, StaffSalary, AttendanceEntry types
- [API Client](./03-api-client.md) - staffApi, attendanceApi
- [Authentication](./05-authentication-permissions.md) - Staff-user linking
