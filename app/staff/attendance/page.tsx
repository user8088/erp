"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, Coffee, AlertTriangle } from "lucide-react";
import type { AttendanceEntry, AttendanceStatus } from "../../lib/types";
import { attendanceApi } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  paid_leave: "Paid Leave",
  unpaid_leave: "Unpaid Leave",
};

const statusStyles: Record<AttendanceStatus, string> = {
  present: "bg-green-100 text-green-800",
  absent: "bg-red-100 text-red-700",
  paid_leave: "bg-blue-100 text-blue-700",
  unpaid_leave: "bg-amber-100 text-amber-800",
};

export default function AttendancePage() {
  const { addToast } = useToast();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [summary, setSummary] = useState<Record<AttendanceStatus, number>>({
    present: 0,
    absent: 0,
    paid_leave: 0,
    unpaid_leave: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.list({ date: targetDate, summary: true, per_page: 500 });
      setEntries(res.data ?? []);
      setSummary({
        present: res.summary?.present ?? 0,
        absent: res.summary?.absent ?? 0,
        paid_leave: res.summary?.paid_leave ?? 0,
        unpaid_leave: res.summary?.unpaid_leave ?? 0,
      });
    } catch (e) {
      console.error(e);
      setError(
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to load attendance."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(date);
  }, [date]);

  const updateStatus = async (entry: AttendanceEntry, status: AttendanceStatus) => {
    try {
      // If entry has id, PATCH; otherwise bulk upsert single row
      if (entry.id) {
        await attendanceApi.update(entry.id, { status });
      } else {
        await attendanceApi.bulkUpsert({
          date,
          entries: [{ person_id: entry.person_id, person_type: entry.person_type, status, note: entry.note ?? "" }],
        });
      }
      await load(date);
    } catch (e) {
      console.error(e);
      addToast("Failed to update attendance.", "error");
    }
  };

  const updateNote = async (entry: AttendanceEntry, note: string) => {
    try {
      if (entry.id) {
        await attendanceApi.update(entry.id, { note });
      } else {
        await attendanceApi.bulkUpsert({
          date,
          entries: [{ person_id: entry.person_id, person_type: entry.person_type, status: entry.status, note }],
        });
      }
      setEntries((prev) =>
        prev.map((e) => (e.person_id === entry.person_id ? { ...e, note } : e))
      );
    } catch (e) {
      console.error(e);
      addToast("Failed to save note.", "error");
    }
  };

  const bulkSet = async (status: AttendanceStatus) => {
    try {
      await attendanceApi.markAll({
        date,
        status,
        person_type: "staff",
      });
      await load(date);
    } catch (e) {
      console.error(e);
      addToast("Failed to bulk update.", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto min-h-full px-2 md:px-0">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-gray-900">Attendance</h1>
          <p className="text-sm text-gray-600">
            Mark attendance for staff and ERP users. Paid leave does not deduct salary; unpaid leave/absent will.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md bg-white">
            <CalendarDays className="w-4 h-4 text-gray-600" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="text-sm focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => bulkSet("present")}
              className="px-3 py-2 text-xs bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Mark All Present
            </button>
            <button
              type="button"
              onClick={() => bulkSet("absent")}
              className="px-3 py-2 text-xs bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Mark All Absent
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="Present"
          value={summary.present || 0}
        />
        <SummaryCard
          icon={<XCircle className="w-5 h-5 text-red-600" />}
          label="Absent"
          value={summary.absent || 0}
        />
        <SummaryCard
          icon={<Coffee className="w-5 h-5 text-blue-600" />}
          label="Paid Leave"
          value={summary.paid_leave || 0}
        />
        <SummaryCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          label="Unpaid Leave"
          value={summary.unpaid_leave || 0}
        />
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{entry.name}</td>
                <td className="px-4 py-3 text-gray-700">{entry.designation ?? "-"}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{entry.person_type}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(["present", "absent", "paid_leave", "unpaid_leave"] as AttendanceStatus[]).map(
                      (status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => updateStatus(entry, status)}
                          className={`px-3 py-1.5 text-xs rounded-full border ${
                            entry.status === status
                              ? `${statusStyles[status]} border-transparent`
                              : "border-gray-300 text-gray-700 bg-white"
                          }`}
                        >
                          {statusLabels[status]}
                        </button>
                      )
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={entry.note ?? ""}
                    onChange={(e) => void updateNote(entry, e.target.value)}
                    placeholder="Optional note"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-4 text-sm text-gray-500 text-center"
                >
                  No attendance records for this date.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="mt-3 text-sm text-gray-500">Loading attendance...</div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

