"use client";

import { useEffect, useMemo, useState } from "react";
import StaffDetailHeader from "../../../components/StaffDetail/StaffDetailHeader";
import StaffDetailContent from "../../../components/StaffDetail/StaffDetailContent";
import StaffDetailSidebar from "../../../components/StaffDetail/StaffDetailSidebar";
import type {
  AttendanceEntry,
  StaffAdvance,
  StaffMember,
  StaffSalary,
  StaffSalaryRun,
} from "../../../lib/types";
import { staffApi, salaryRunsApi, attendanceApi, accountMappingsApi, accountsApi, ApiError } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";

interface StaffDetailClientProps {
  id: string;
}

export default function StaffDetailClient({ id }: StaffDetailClientProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [saving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [runs, setRuns] = useState<StaffSalaryRun[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<StaffSalary[]>([]);
  const [paying, setPaying] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<Record<string, number> | null>(
    null
  );
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Advances backend not available yet; keep empty to avoid dummy rows.
  const advances: StaffAdvance[] = [];

  const currentMonthRange = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const start = `${year}-${month}-01`;
    const endDate = new Date(year, now.getMonth() + 1, 0).getDate();
    const end = `${year}-${month}-${String(endDate).padStart(2, "0")}`;
    return { start, end };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [staffRes, runList] = await Promise.all([
          staffApi.get(id),
          salaryRunsApi.list(id, { per_page: 20 }),
        ]);

        if (!cancelled) {
          setStaff(staffRes || null);
          setRuns(runList.data ?? []);
        }

        setAttendanceLoading(true);
        const attendanceRes = await attendanceApi.list({
          person_type: "staff",
          person_ids: [id],
          from: currentMonthRange.start,
          to: currentMonthRange.end,
          summary: true,
          per_page: 100,
        });
        if (!cancelled) {
          setAttendance(attendanceRes.data ?? []);
          setAttendanceSummary(attendanceRes.summary ?? null);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            e && typeof e === "object" && "message" in e
              ? String((e as { message: unknown }).message)
              : "Failed to load staff profile."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setAttendanceLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, currentMonthRange]);

  useEffect(() => {
    if (!staff) return;
    const mapped: StaffSalary[] = runs.map((run) => ({
      id: run.id,
      staff_id: run.staff_id,
      month: run.month,
      status: run.status === "paid" ? "paid" : run.status === "due" ? "due" : "scheduled",
      amount: run.net_payable,
      due_date: run.due_date ?? "",
      paid_on: run.paid_on,
      invoice_number: run.invoice_number ?? undefined,
      advance_adjusted: run.advance_adjusted,
      notes: run.notes ?? undefined,
    }));
    setSalaryHistory(mapped);
  }, [runs, staff]);

  const reloadRuns = async () => {
    const runList = await salaryRunsApi.list(id, { per_page: 20 });
    setRuns(runList.data ?? []);
  };

  const handlePaySalary = async () => {
    if (!staff) return;
    setPaying(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      
      // Get the payment account mapping
      const mappingsResponse = await accountMappingsApi.getAccountMappings({
        mapping_type: 'staff_salary_payment',
        company_id: 1,
      });
      
      const paymentMapping = mappingsResponse.data.find(m => m.mapping_type === 'staff_salary_payment');
      
      if (!paymentMapping || !paymentMapping.account_id) {
        throw new Error("Salary payment account is not configured. Please configure it in Staff Settings.");
      }
      
      // Get the payment account balance
      const balanceResponse = await accountsApi.getAccountBalance(paymentMapping.account_id);
      const accountBalance = balanceResponse.balance;
      
      // Use monthly_salary as an estimate for balance check (actual amount may vary due to attendance/deductions)
      const estimatedSalaryAmount = staff.monthly_salary || 0;
      
      // Check if balance is sufficient (using estimate)
      if (accountBalance <= 0) {
        throw new Error(`Cannot pay salary: Payment account has insufficient balance (PKR ${accountBalance.toLocaleString()}). The account balance must be greater than 0.`);
      }
      
      if (estimatedSalaryAmount > 0 && accountBalance < estimatedSalaryAmount) {
        throw new Error(`Cannot pay salary: Payment account has insufficient balance (PKR ${accountBalance.toLocaleString()}). Estimated required: PKR ${estimatedSalaryAmount.toLocaleString()}.`);
      }
      
      // Pay salary directly using the new direct payment API
      await staffApi.paySalary(staff.id, {
        month,
        payable_days: staff.monthly_salary ? 26 : undefined,
        advance_adjusted: 0,
        paid_on: new Date().toISOString().slice(0, 10),
      });
      
      addToast("Salary paid successfully.", "success");
      await reloadRuns();
    } catch (e) {
      console.error("Salary payment error:", e);
      
      // Handle 409 Conflict (already paid)
      if (e instanceof ApiError && e.status === 409) {
        const errorData = e.data && typeof e.data === "object" ? (e.data as { message?: unknown }) : null;
        const message = errorData && errorData.message
          ? String(errorData.message)
          : "Salary already paid for this month. Use reverse method to undo.";
        addToast(message, "error");
        return;
      }
      
      const errorMessage = e instanceof ApiError
        ? e.message
        : e && typeof e === "object" && "message" in e 
          ? String((e as { message: unknown }).message)
          : "Failed to pay salary. Check console for details.";
      addToast(errorMessage, "error");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading staff profile...</div>;
  }

  if (!staff) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
        {error || "Staff not found."}
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto min-h-full">
      <StaffDetailHeader
        staff={staff}
        saving={saving}
        onToggleSidebar={() => setShowSidebar((prev) => !prev)}
      />
      <div className="flex gap-6 mt-4">
        {showSidebar && <StaffDetailSidebar />}
        <div className="flex-1 min-w-0 overflow-x-hidden">
          {error && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
              {error}
            </div>
          )}
          <StaffDetailContent
            staff={staff}
            salaryHistory={salaryHistory}
            advances={advances}
            attendanceEntries={attendance}
            attendanceSummary={attendanceSummary}
            attendanceLoading={attendanceLoading}
            onPaySalary={handlePaySalary}
            paying={paying}
          />
        </div>
      </div>
    </div>
  );
}

