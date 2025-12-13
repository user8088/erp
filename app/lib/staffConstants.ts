// Staff System Constants

export const DEFAULT_PAYABLE_DAYS = 26;

export const STAFF_STATUS_COLORS = {
  active: "bg-green-100 text-green-800",
  on_leave: "bg-yellow-100 text-yellow-800",
  inactive: "bg-red-100 text-red-800",
} as const;

export const ATTENDANCE_STATUS_COLORS = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-700",
  paid_leave: "bg-blue-100 text-blue-700",
  unpaid_leave: "bg-amber-100 text-amber-800",
} as const;

export const PAY_FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "weekly", label: "Weekly" },
] as const;

