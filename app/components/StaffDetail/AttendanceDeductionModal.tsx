"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Calculator, AlertCircle } from "lucide-react";
import type { StaffMember, AttendanceEntry } from "../../lib/types";

interface AttendanceDeductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (month: string, manualDeduction: number | null) => void;
  staff: StaffMember;
  attendanceEntries: AttendanceEntry[];
  attendanceSummary: Record<string, number> | null;
  initialMonth?: string; // YYYY-MM format, defaults to current month
  monthlySalary: number;
  payableDays?: number;
}

export default function AttendanceDeductionModal({
  isOpen,
  onClose,
  onConfirm,
  staff,
  attendanceEntries,
  attendanceSummary,
  initialMonth,
  monthlySalary,
  payableDays = 26,
}: AttendanceDeductionModalProps) {
  const [selectedMonth, setSelectedMonth] = useState(
    initialMonth || new Date().toISOString().slice(0, 7)
  );
  const [useManualDeduction, setUseManualDeduction] = useState(false);
  const [manualDeduction, setManualDeduction] = useState("");

  // Calculate attendance breakdown for the selected month
  const attendanceBreakdown = useMemo(() => {
    const monthEntries = attendanceEntries.filter(
      (entry) => entry.date.startsWith(selectedMonth)
    );

    const absentDays = monthEntries.filter((e) => e.status === "absent").length;
    const unpaidLeaveDays = monthEntries.filter(
      (e) => e.status === "unpaid_leave"
    ).length;
    const paidLeaveDays = monthEntries.filter(
      (e) => e.status === "paid_leave"
    ).length;
    const presentDays = monthEntries.filter(
      (e) => e.status === "present"
    ).length;

    return {
      present: presentDays,
      absent: absentDays,
      paid_leave: paidLeaveDays,
      unpaid_leave: unpaidLeaveDays,
      total: monthEntries.length,
    };
  }, [attendanceEntries, selectedMonth]);

  // Use summary if available, otherwise use calculated breakdown
  const effectiveSummary = attendanceSummary || {
    present: attendanceBreakdown.present,
    absent: attendanceBreakdown.absent,
    paid_leave: attendanceBreakdown.paid_leave,
    unpaid_leave: attendanceBreakdown.unpaid_leave,
  };

  // Calculate automatic deduction
  const grossSalary = monthlySalary;
  const perDayRate = grossSalary / payableDays;
  const automaticDeduction =
    perDayRate * (effectiveSummary.absent + effectiveSummary.unpaid_leave);

  // Calculate final deduction (manual or automatic)
  const finalDeduction = useManualDeduction
    ? Number(manualDeduction) || 0
    : automaticDeduction;

  // Calculate net salary
  const netBeforeAdvance = grossSalary - finalDeduction;
  const advanceBalance = staff.advance_balance || 0;
  const netPayable = netBeforeAdvance - (advanceBalance > 0 ? advanceBalance : 0);

  useEffect(() => {
    if (isOpen) {
      const defaultMonth = initialMonth || new Date().toISOString().slice(0, 7);
      if (selectedMonth !== defaultMonth) {
        setSelectedMonth(defaultMonth);
      }
      setUseManualDeduction(false);
      setManualDeduction("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialMonth]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const deduction = useManualDeduction
      ? (manualDeduction ? Number(manualDeduction) : null)
      : null;
    onConfirm(selectedMonth, deduction);
  };

  // Format month for display
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Check if month is in the past, current, or future
  const getMonthStatus = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const selectedDate = new Date(Number(year), Number(month) - 1, 1);
    const currentDate = new Date();
    const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    
    if (selectedDate < currentMonth) return "past";
    if (selectedDate.getTime() === currentMonth.getTime()) return "current";
    return "future";
  };

  const monthStatus = getMonthStatus(selectedMonth);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Pay Salary
              </h2>
              <p className="text-sm text-gray-500">
                {staff.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Month Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Month <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-600">
                Selected: <strong>{formatMonth(selectedMonth)}</strong>
              </span>
              {monthStatus === "past" && (
                <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                  Backdated Payment
                </span>
              )}
              {monthStatus === "current" && (
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Current Month
                </span>
              )}
              {monthStatus === "future" && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                  Advance Payment
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can pay salary for any month - past (backdated), current, or future (advance).
            </p>
          </div>

          {/* Attendance Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Attendance Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Present Days</p>
                <p className="text-sm font-semibold text-green-700">
                  {effectiveSummary.present || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Absent Days</p>
                <p className="text-sm font-semibold text-red-700">
                  {effectiveSummary.absent || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paid Leave</p>
                <p className="text-sm font-semibold text-blue-700">
                  {effectiveSummary.paid_leave || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unpaid Leave</p>
                <p className="text-sm font-semibold text-amber-700">
                  {effectiveSummary.unpaid_leave || 0}
                </p>
              </div>
            </div>
          </div>

          {/* Salary Calculation */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3 border border-blue-100">
            <h3 className="text-sm font-semibold text-gray-900">
              Salary Calculation
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Salary:</span>
                <span className="font-medium">PKR {grossSalary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payable Days:</span>
                <span className="font-medium">{payableDays}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Per Day Rate:</span>
                <span className="font-medium">
                  PKR {perDayRate.toFixed(2)}
                </span>
              </div>
              <div className="pt-2 border-t border-blue-200">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Days to Deduct (Absent + Unpaid Leave):
                  </span>
                  <span className="font-medium text-red-700">
                    {effectiveSummary.absent + effectiveSummary.unpaid_leave} days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deduction Options */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="radio"
                  checked={!useManualDeduction}
                  onChange={() => {
                    setUseManualDeduction(false);
                    setManualDeduction("");
                  }}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-900">
                  Use Automatic Calculation
                </span>
              </label>
              <div className="ml-6 bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Automatic Deduction:
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    PKR {automaticDeduction.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Per Day Rate × (Absent Days + Unpaid Leave Days)
                </p>
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="radio"
                  checked={useManualDeduction}
                  onChange={() => setUseManualDeduction(true)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm font-medium text-gray-900">
                  Manual Override
                </span>
              </label>
              {useManualDeduction && (
                <div className="ml-6 space-y-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualDeduction}
                    onChange={(e) => setManualDeduction(e.target.value)}
                    placeholder="Enter deduction amount"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Enter a custom deduction amount to override the automatic
                    calculation
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          <div className="bg-green-50 rounded-lg p-4 space-y-2 border border-green-200">
            <h3 className="text-sm font-semibold text-gray-900">
              Payment Preview
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Gross Salary:</span>
                <span className="font-medium">
                  PKR {grossSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Attendance Deduction:</span>
                <span className="font-medium text-red-700">
                  - PKR {finalDeduction.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-green-200">
                <span className="text-gray-600">Net Before Advance:</span>
                <span className="font-semibold">
                  PKR {netBeforeAdvance.toFixed(2)}
                </span>
              </div>
              {advanceBalance > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Advance to Deduct:</span>
                    <span className="font-medium text-amber-700">
                      - PKR {advanceBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-200">
                    <span className="text-gray-700 font-semibold">
                      Net Payable:
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      PKR {netPayable.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {advanceBalance === 0 && (
                <div className="flex justify-between pt-2 border-t border-green-200">
                  <span className="text-gray-700 font-semibold">
                    Net Payable:
                  </span>
                  <span className="text-lg font-bold text-green-700">
                    PKR {netBeforeAdvance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Warning if manual deduction is higher */}
          {useManualDeduction &&
            Number(manualDeduction) > automaticDeduction && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Manual deduction is higher than automatic</p>
                  <p className="text-xs mt-1">
                    Automatic: PKR {automaticDeduction.toFixed(2)} | Manual: PKR{" "}
                    {Number(manualDeduction).toFixed(2)}
                  </p>
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                useManualDeduction &&
                (!manualDeduction || Number(manualDeduction) < 0)
              }
              className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-medium"
            >
              Confirm & Pay Salary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

