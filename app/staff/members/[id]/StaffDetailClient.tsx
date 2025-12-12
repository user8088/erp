"use client";

import { useEffect, useState } from "react";
import StaffDetailHeader from "../../../components/StaffDetail/StaffDetailHeader";
import StaffDetailContent from "../../../components/StaffDetail/StaffDetailContent";
import StaffDetailSidebar from "../../../components/StaffDetail/StaffDetailSidebar";
import type { StaffAdvance, StaffMember, StaffSalary, StaffSalaryRun } from "../../../lib/types";
import { staffApi, salaryRunsApi } from "../../../lib/apiClient";
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

  const advances: StaffAdvance[] = [
    {
      id: "adv-01",
      staff_id: id,
      amount: 50000,
      balance: 20000,
      status: "open",
      issued_on: "2024-11-15",
      remarks: "Medical expense",
    },
    {
      id: "adv-02",
      staff_id: id,
      amount: 30000,
      balance: 0,
      status: "settled",
      issued_on: "2024-08-10",
      remarks: "School fee",
    },
  ];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await staffApi.get(id);
        if (!cancelled) {
          setStaff(res || null);
        }
        const runList = await salaryRunsApi.list(id, { per_page: 20 });
        if (!cancelled) {
          setRuns(runList.data ?? []);
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
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
      const created = await salaryRunsApi.create(staff.id, {
        month,
        payable_days: staff.monthly_salary ? 26 : undefined,
      });
      const runId = created.salary_run?.id ?? null;
      if (!runId) {
        throw new Error("Salary run not created");
      }
      await salaryRunsApi.pay(runId, {
        paid_on: new Date().toISOString().slice(0, 10),
        advance_adjusted: 0,
      });
      addToast("Salary paid.", "success");
      await reloadRuns();
    } catch (e) {
      console.error(e);
      addToast("Failed to pay salary.", "error");
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
            onPaySalary={handlePaySalary}
            paying={paying}
          />
        </div>
      </div>
    </div>
  );
}

