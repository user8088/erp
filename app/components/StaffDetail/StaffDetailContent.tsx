"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Receipt,
  HandCoins,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlarmClock,
} from "lucide-react";
import StaffDetailTabs from "./StaffDetailTabs";
import StaffDetailsForm from "./StaffDetailsForm";
import StaffMoreInformation from "./StaffMoreInformation";
import StaffSettingsTab from "./StaffSettingsTab";
import type {
  AttendanceEntry,
  StaffAdvance,
  StaffMember,
  StaffSalary,
} from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

interface StaffDetailContentProps {
  staff: StaffMember;
  salaryHistory: StaffSalary[];
  advances: StaffAdvance[];
  attendanceEntries: AttendanceEntry[];
  attendanceSummary?: Record<string, number> | null;
  attendanceLoading?: boolean;
  onPaySalary?: () => Promise<void> | void;
  paying?: boolean;
  canPaySalary?: boolean;
  reversing?: boolean;
  onReverseSalary?: () => void;
  saveSignal?: number;
  onStaffUpdated?: (staff: StaffMember) => void;
  onSavingChange?: (saving: boolean) => void;
}

export default function StaffDetailContent({
  staff,
  salaryHistory,
  advances,
  attendanceEntries,
  attendanceSummary,
  attendanceLoading,
  onPaySalary,
  paying,
  canPaySalary = false,
  reversing,
  onReverseSalary,
  saveSignal,
  onStaffUpdated,
  onSavingChange,
}: StaffDetailContentProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("staff-details");
  const { addToast } = useToast();

  const attendanceTotals = {
    present: attendanceSummary?.present ?? 0,
    late: attendanceSummary?.late ?? 0,
    absent: attendanceSummary?.absent ?? 0,
    paid_leave: attendanceSummary?.paid_leave ?? 0,
    unpaid_leave: attendanceSummary?.unpaid_leave ?? 0,
    total: attendanceSummary?.total_entries ?? attendanceEntries.length ?? 0,
  };

  const latestAdvanceAdjustment = [...salaryHistory]
    .filter((s) => typeof s.advance_adjusted === "number")
    .sort((a, b) => String(b.month).localeCompare(String(a.month)))[0];

  return (
    <div className="flex-1">
      <StaffDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "staff-details" && (
          <>
            <StaffDetailsForm 
              staff={staff}
              saveSignal={saveSignal}
              onStaffUpdated={onStaffUpdated}
              onSavingChange={onSavingChange}
            />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Staff Code</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {staff.code || "STF-DRAFT"}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                    <AlarmClock className="w-3 h-3" />
                    Salary cycle: Monthly
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <InfoCard title="Contact" lines={[staff.phone || "Not provided", staff.email || "No email"]} />
                  <InfoCard
                    title="Department & Role"
                    lines={[staff.designation || "Not assigned", staff.department || "Not assigned"]}
                  />
                  <InfoCard
                    title="Employment"
                    lines={[
                      `Joined ${staff.date_of_joining || "Not set"}`,
                      "Attendance & shifts will appear once configured.",
                    ]}
                  />
                  <InfoCard
                    title="Salary Prefs"
                    lines={[
                      staff.monthly_salary
                        ? `Monthly salary PKR ${staff.monthly_salary.toLocaleString()}`
                        : "Not set",
                      `Next pay on ${staff.next_pay_date || "—"} (pay anytime earlier).`,
                    ]}
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-3">
                <p className="text-sm font-semibold text-gray-900">
                  ERP User Mapping
                </p>
                {staff.is_erp_user ? (
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3 space-y-2">
                    <p className="text-sm text-gray-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-green-600" />
                      Already mapped
                    </p>
                    <p className="text-xs text-gray-600">
                      ERP User ID: {staff.erp_user_id ?? "—"}
                    </p>
                    <button
                      type="button"
                      className="text-xs text-orange-600 hover:text-orange-700"
                    >
                      Open ERP user profile
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Convert this staff member into an ERP user to give login
                      access and permissions.
                    </p>
                    <div className="flex items-center gap-2">
                      <button className="flex-1 px-3 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors">
                        Create ERP User
                      </button>
                      <button className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        Link Existing
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Permissions can be assigned from Role Manager.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === "salary" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <SummaryCard
                title="Monthly Salary"
                value={
                  staff.monthly_salary
                    ? `PKR ${staff.monthly_salary.toLocaleString()}`
                    : "Not set"
                }
                subtitle="Base pay before allowances / deductions"
                icon={<WalletIcon />}
              />
              <SummaryCard
                title="Next Pay Date"
                value={staff.next_pay_date ?? "Set cycle"}
                subtitle="Salary can be paid anytime earlier"
                icon={<Calendar className="w-8 h-8 text-blue-400" />}
              />
              <SummaryCard
                title="Current Advance Balance"
                value={
                  staff.advance_balance !== undefined && staff.advance_balance !== null
                    ? `PKR ${staff.advance_balance.toLocaleString()}`
                    : "PKR 0"
                }
                subtitle="Total outstanding advance amount"
                icon={<HandCoins className="w-8 h-8 text-amber-400" />}
              />
              <SummaryCard
                title="Advance Adjusted"
                value={
                  latestAdvanceAdjustment?.advance_adjusted !== undefined &&
                  latestAdvanceAdjustment?.advance_adjusted !== null
                    ? `PKR ${latestAdvanceAdjustment.advance_adjusted.toLocaleString()}`
                    : "PKR 0"
                }
                subtitle="Last paid run advance adjustment"
                icon={<HandCoins className="w-8 h-8 text-purple-400" />}
              />
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900">
                  Salary payment creates staff invoice automatically
                </p>
                <p className="text-xs text-blue-800">
                  Paying salary posts an invoice for this staff member. Advance
                  balances are auto-adjusted, and you can pay before the due
                  date.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Salary Timeline
                  </h2>
                  <p className="text-sm text-gray-500">
                    Track monthly salary, due dates, and generated invoices.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {staff.is_paid_for_current_month && canPaySalary && onReverseSalary ? (
                    <button
                      className="px-3 py-2 border border-red-300 text-red-700 rounded-md text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
                      disabled={reversing}
                      onClick={async () => {
                        try {
                          await onReverseSalary();
                        } catch (e) {
                          console.error(e);
                          addToast("Failed to reverse salary.", "error");
                        }
                      }}
                    >
                      {reversing ? "Reversing..." : "Reverse Salary"}
                    </button>
                  ) : null}
                  {canPaySalary && onPaySalary ? (
                    <button
                      className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
                      disabled={paying || reversing}
                      onClick={async () => {
                        try {
                          await onPaySalary();
                        } catch (e) {
                          console.error(e);
                          addToast("Failed to pay salary.", "error");
                        }
                      }}
                    >
                      {paying ? "Paying..." : staff.advance_balance && staff.advance_balance > 0 
                        ? `Pay Salary (Deduct PKR ${staff.advance_balance.toLocaleString()} advance)`
                        : "Pay Salary"}
                    </button>
                  ) : (
                    <span className="text-xs text-gray-500" title="You don't have permission to pay salaries">
                      Pay Salary (No Permission)
                    </span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto border border-gray-100 rounded-lg">
                <table className="w-full min-w-[720px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Month
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Due / Paid
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Invoice
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                        Advance Adjusted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {salaryHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                          No salary records found. Pay a salary to see it here.
                        </td>
                      </tr>
                    ) : (
                      salaryHistory.map((salary) => {
                        // Format month from "2025-12" to "December 2025"
                        const formatMonth = (monthStr: string) => {
                          const [year, month] = monthStr.split("-");
                          const date = new Date(Number(year), Number(month) - 1, 1);
                          return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                        };

                        return (
                        <tr key={salary.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatMonth(salary.month)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={salary.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex flex-col">
                              <span>
                                Due {salary.due_date} •{" "}
                                {`PKR ${salary.amount.toLocaleString()}`}
                              </span>
                              {salary.paid_on && (
                                <span className="text-xs text-gray-500">
                                  Paid on {salary.paid_on}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {salary.invoice_number ? (
                              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-100 text-green-700 rounded-md text-xs">
                                <Receipt className="w-3 h-3" />
                                {salary.invoice_number}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Auto-generate on payment
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {salary.advance_adjusted !== undefined && salary.advance_adjusted !== null
                              ? `PKR ${salary.advance_adjusted.toLocaleString()}`
                              : "—"}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "advances" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Advances
                </h2>
                <p className="text-sm text-gray-500">
                  Issue advances and let them auto-adjust in salary.
                </p>
              </div>
              <button
                onClick={() => router.push(`/staff/advance/new?staff_id=${staff.id}`)}
                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Issue Advance
              </button>
            </div>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Issued On
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                        No advances found.
                      </td>
                    </tr>
                  ) : (
                    advances.map((advance) => {
                      const isOpen = advance.balance > 0;
                      const statusLabel = isOpen ? "Open" : "Settled";
                      const transactionTypeLabel = 
                        advance.transaction_type === "given" ? "Given" :
                        advance.transaction_type === "deducted" ? "Deducted" :
                        "Refunded";
                      
                      return (
                        <tr key={advance.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(advance.transaction_date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                PKR {Math.abs(advance.amount).toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-500">
                                {transactionTypeLabel}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            PKR {advance.balance.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                isOpen
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {advance.notes ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <SummaryCard
                title="Present"
                value={attendanceLoading ? "..." : `${attendanceTotals.present}`}
                subtitle="Marked present this period"
                icon={<Clock className="w-8 h-8 text-green-400" />}
              />
              <SummaryCard
                title="Late"
                value={attendanceLoading ? "..." : `${attendanceTotals.late}`}
                subtitle="Arrived late this period"
                icon={<Clock className="w-8 h-8 text-orange-400" />}
              />
              <SummaryCard
                title="Absent"
                value={attendanceLoading ? "..." : `${attendanceTotals.absent}`}
                subtitle="Unexcused absence"
                icon={<Clock className="w-8 h-8 text-red-400" />}
              />
              <SummaryCard
                title="Paid Leave"
                value={attendanceLoading ? "..." : `${attendanceTotals.paid_leave}`}
                subtitle="Approved paid leave"
                icon={<Calendar className="w-8 h-8 text-blue-400" />}
              />
              <SummaryCard
                title="Unpaid Leave"
                value={attendanceLoading ? "..." : `${attendanceTotals.unpaid_leave}`}
                subtitle="Unpaid or pending leave"
                icon={<Calendar className="w-8 h-8 text-amber-400" />}
              />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Attendance</h2>
                  <p className="text-sm text-gray-500">
                    Current month records for this staff member.
                  </p>
                </div>
              </div>

              {attendanceLoading ? (
                <p className="text-sm text-gray-500">Loading attendance...</p>
              ) : attendanceEntries.length === 0 ? (
                <p className="text-sm text-gray-500">No attendance entries found.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-100 rounded-lg">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          Arrival Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">
                          Note
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {attendanceEntries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">{entry.date}</td>
                          <td className="px-4 py-3">
                            <AttendanceStatusPill status={entry.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {entry.status === "late" && entry.late_time ? (
                              <span className="font-medium text-orange-700">{entry.late_time}</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {entry.note || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "more-information" && (
          <StaffMoreInformation staff={staff} />
        )}

        {activeTab === "settings" && (
          <StaffSettingsTab
            staff={staff}
            onStaffUpdated={onStaffUpdated}
            onSavingChange={onSavingChange}
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: StaffSalary["status"] }) {
  const map = {
    scheduled: "bg-blue-100 text-blue-700",
    due: "bg-amber-100 text-amber-800",
    paid: "bg-green-100 text-green-700",
  } as const;
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        map[status]
      }`}
    >
      {status === "scheduled"
        ? "Scheduled"
        : status === "due"
        ? "Due"
        : "Paid"}
    </span>
  );
}

function AttendanceStatusPill({ status }: { status: AttendanceEntry["status"] }) {
  const map = {
    present: "bg-green-100 text-green-700",
    late: "bg-orange-100 text-orange-800",
    absent: "bg-red-100 text-red-700",
    paid_leave: "bg-blue-100 text-blue-700",
    unpaid_leave: "bg-amber-100 text-amber-800",
  } as const;
  const labels: Record<AttendanceEntry["status"], string> = {
    present: "Present",
    late: "Late",
    absent: "Absent",
    paid_leave: "Paid leave",
    unpaid_leave: "Unpaid leave",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        map[status]
      }`}
    >
      {labels[status]}
    </span>
  );
}

function WalletIcon() {
  return (
    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center">
      <Receipt className="w-4 h-4" />
    </div>
  );
}

function InfoCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {title}
      </p>
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-1">
        {lines.map((line, idx) => (
          <p
            key={`${title}-${idx}`}
            className={idx === 0 ? "text-sm text-gray-900" : "text-xs text-gray-500"}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}

