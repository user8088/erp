"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, XCircle, Coffee, AlertTriangle, Clock } from "lucide-react";
import type { AttendanceEntry, AttendanceStatus } from "../../lib/types";
import { attendanceApi, staffApi } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import { ATTENDANCE_STATUS_COLORS } from "../../lib/staffConstants";
import { useUser } from "../../components/User/UserContext";

const statusLabels: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  paid_leave: "Paid Leave",
  unpaid_leave: "Unpaid Leave",
  late: "Late",
};

const statusStyles = ATTENDANCE_STATUS_COLORS;

export default function AttendancePage() {
  const { addToast } = useToast();
  const { hasAtLeast } = useUser();
  const canManageAttendance = hasAtLeast("staff.attendance.manage", "read-write");
  const canViewAttendance = hasAtLeast("module.staff", "read");
  
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [summary, setSummary] = useState<Record<AttendanceStatus, number>>({
    present: 0,
    absent: 0,
    paid_leave: 0,
    unpaid_leave: 0,
    late: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staffMap, setStaffMap] = useState<Map<string | number, { status: string; full_name: string }>>(new Map());
  const [lateTimeInputs, setLateTimeInputs] = useState<Map<string, string>>(new Map());

  const load = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await attendanceApi.list({
        date: targetDate,
        summary: true,
        per_page: 500,
        person_type: "staff",
      });

      const attendanceRows = res.data ?? [];

      // Always fetch all active staff to show everyone, then merge with attendance records
      const staffRes = await staffApi.list({ status: "active", per_page: 500 });
      const allStaff = staffRes.data ?? [];
      
      // Create a map of staff by ID for validation
      const staffMapData = new Map(
        allStaff.map((staff) => [staff.id, { status: staff.status, full_name: staff.full_name }])
      );
      setStaffMap(staffMapData);
      
      // Create a map of attendance records by person_id
      const attendanceMap = new Map(
        attendanceRows.map((entry) => [entry.person_id, entry])
      );
      
      // Create entries for all active staff, using attendance data if it exists
      const rows: AttendanceEntry[] = allStaff.map((staff) => {
        const attendanceEntry = attendanceMap.get(staff.id);
        if (attendanceEntry) {
          // Staff has attendance record - use it and enrich with staff info
          // IMPORTANT: Preserve late_time from backend response
          return {
            ...attendanceEntry,
            date: attendanceEntry.date || targetDate, // Ensure date is set correctly
            name: attendanceEntry.name || staff.full_name,
            designation: attendanceEntry.designation || staff.designation || null,
            late_time: attendanceEntry.late_time || null, // Explicitly preserve late_time
          };
        } else {
          // Staff has no attendance record - create placeholder entry with no status
          // Don't default to "present" as that's misleading - show as unmarked
          return {
            id: `staff-${staff.id}`,
            person_id: staff.id,
            person_type: "staff" as const,
            name: staff.full_name,
            designation: staff.designation,
            date: targetDate,
            status: "present" as AttendanceStatus, // Keep for type safety, but UI will treat as unmarked
            note: "",
          };
        }
      });

      setEntries(rows);
      
      // Initialize lateTimeInputs with values from backend to ensure persistence
      const timeInputsMap = new Map<string, string>();
      rows.forEach((entry) => {
        if (entry.status === "late" && entry.late_time) {
          const entryKey = `${entry.person_id}-${entry.date || targetDate}`;
          timeInputsMap.set(entryKey, entry.late_time);
          // Debug: log to verify backend is returning late_time
          console.log(`Loaded late_time for ${entry.name}: ${entry.late_time}`, entry);
        }
      });
      setLateTimeInputs(timeInputsMap);
      
      setSummary(
        attendanceRows.length
          ? {
              present: res.summary?.present ?? 0,
              absent: res.summary?.absent ?? 0,
              paid_leave: res.summary?.paid_leave ?? 0,
              unpaid_leave: res.summary?.unpaid_leave ?? 0,
              late: res.summary?.late ?? 0,
            }
          : {
              present: 0,
              absent: 0,
              paid_leave: 0,
              unpaid_leave: 0,
              late: 0,
            }
      );
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
    // Clear entries immediately when date changes to prevent stale data
    setEntries([]);
    setSummary({
      present: 0,
      absent: 0,
      paid_leave: 0,
      unpaid_leave: 0,
      late: 0,
    });
    void load(date);
  }, [date]);

  const updateStatus = async (entry: AttendanceEntry, status: AttendanceStatus, lateTime?: string) => {
    try {
      // Validate staff exists and is active
      if (entry.person_type === "staff") {
        const staff = staffMap.get(entry.person_id);
        if (!staff) {
          addToast(`Staff member not found. Please refresh the page.`, "error");
          return;
        }
        if (staff.status !== "active") {
          addToast(`Cannot mark attendance for inactive staff member: ${staff.full_name}`, "error");
          return;
        }
      }

      // If marking as late, require time input
      if (status === "late" && !lateTime) {
        addToast("Please enter the arrival time when marking as late.", "error");
        return;
      }

      // Use composite ID format directly - API supports it and will auto-create if needed
      // IMPORTANT: Always pass the date parameter to ensure we're marking the correct date
      const compositeId = entry.person_type === "staff" 
        ? `staff-${entry.person_id}` 
        : `user-${entry.person_id}`;
      
      const updatePayload: {
        status: AttendanceStatus;
        date: string;
        late_time?: string;
      } = {
        status,
        date: entry.date || date, // Use entry date if available, otherwise use current selected date
      };

      // Only include late_time when status is "late" and time is provided
      // Don't send late_time for other statuses to avoid backend validation issues
      if (status === "late" && lateTime) {
        updatePayload.late_time = lateTime;
      }
      // Note: We don't send late_time: null for other statuses to avoid validation errors
      // The backend should clear it automatically when status changes
      
      const response = await attendanceApi.update(compositeId, updatePayload);
      
      // Update local state with backend response to keep UI in sync
      const entryKey = `${entry.person_id}-${entry.date || date}`;
      if (status === "late") {
        // Use backend response if available, otherwise use the time we sent
        const savedTime = response.attendance?.late_time || lateTime;
        if (savedTime) {
          setLateTimeInputs((prev) => {
            const newMap = new Map(prev);
            newMap.set(entryKey, savedTime);
            return newMap;
          });
        }
      } else {
        // Clear time input when changing to non-late status
        setLateTimeInputs((prev) => {
          const newMap = new Map(prev);
          newMap.delete(entryKey);
          return newMap;
        });
      }
      
      // Reload to get fresh data from backend (this will also initialize lateTimeInputs)
      await load(date);
    } catch (e) {
      console.error(e);
      
      // Provide more specific error messages
      if (e && typeof e === "object" && "message" in e) {
        const errorMessage = String((e as { message: unknown }).message);
        if (errorMessage.includes("status is invalid") || errorMessage.includes("422")) {
          addToast(
            "The 'late' status is not yet supported by the backend. Please implement the backend changes from docs/ATTENDANCE-LATE-FEATURE-BACKEND-REQUIREMENTS.md",
            "error"
          );
        } else {
          addToast(`Failed to update attendance: ${errorMessage}`, "error");
        }
      } else {
        addToast("Failed to update attendance.", "error");
      }
    }
  };

  const updateNote = async (entry: AttendanceEntry, note: string) => {
    try {
      // Use composite ID format directly - API supports it and will auto-create if needed
      // IMPORTANT: Always pass the date parameter to ensure we're updating the correct date
      const compositeId = entry.person_type === "staff" 
        ? `staff-${entry.person_id}` 
        : `user-${entry.person_id}`;
      
      await attendanceApi.update(compositeId, { 
        note,
        date: entry.date || date // Use entry date if available, otherwise use current selected date
      });
      // Optimistically update the UI
      setEntries((prev) =>
        prev.map((e) => (e.person_id === entry.person_id && e.date === entry.date ? { ...e, note } : e))
      );
    } catch (e) {
      console.error(e);
      addToast("Failed to save note.", "error");
      // Reload on error to sync with server
      await load(date);
    }
  };

  const bulkSet = async (status: AttendanceStatus) => {
    try {
      // Only mark attendance for active staff members
      await attendanceApi.markAll({
        date,
        status,
        person_type: "staff",
        staff_status: "active", // Only mark active staff members
      });
      addToast(`All active staff marked as ${statusLabels[status]}`, "success");
      await load(date);
    } catch (e) {
      console.error(e);
      addToast("Failed to bulk update attendance.", "error");
    }
  };

  if (!canViewAttendance) {
    return (
      <div className="max-w-6xl mx-auto min-h-full px-2 md:px-0">
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          You don&apos;t have permission to view attendance.
        </div>
      </div>
    );
  }

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
          {canManageAttendance && (
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
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <SummaryCard
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          label="Present"
          value={summary.present || 0}
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-orange-600" />}
          label="Late"
          value={summary.late || 0}
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
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Late Arrival Time</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {entries.map((entry) => (
              <tr key={entry.id ?? `staff-${entry.person_id}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900 font-medium">{entry.name}</td>
                <td className="px-4 py-3 text-gray-700">{entry.designation ?? "-"}</td>
                <td className="px-4 py-3 text-gray-700 capitalize">{entry.person_type}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(["present", "late", "absent", "paid_leave", "unpaid_leave"] as AttendanceStatus[]).map(
                      (status) => {
                        // Check if this is a placeholder entry (no real attendance record yet)
                        // Placeholder entries have composite IDs like "staff-{id}" (string) while real entries have numeric IDs
                        const isPlaceholder = typeof entry.id === "string" && entry.id.startsWith("staff-") && !entry.id.match(/^\d+$/);
                        // Only mark as selected if it's NOT a placeholder and the status matches
                        const isSelected = !isPlaceholder && entry.status === status;
                        const entryKey = `${entry.person_id}-${entry.date || date}`;
                        const isLateSelected = status === "late" && isSelected;
                        // Use entry.late_time from backend as source of truth, fallback to local input state
                        const currentLateTime = entry.late_time || lateTimeInputs.get(entryKey) || "";
                        
                        return (
                          <div key={status} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (status === "late" && !isSelected) {
                                  // When clicking late for the first time, mark immediately with current time
                                  const currentTime = new Date().toTimeString().slice(0, 5);
                                  setLateTimeInputs((prev) => {
                                    const newMap = new Map(prev);
                                    newMap.set(entryKey, currentTime);
                                    return newMap;
                                  });
                                  if (canManageAttendance) {
                                    void updateStatus(entry, status, currentTime);
                                  }
                                } else if (status === "late" && isSelected) {
                                  // If already late, clicking again just focuses the time input (handled by showing it)
                                  // Time updates happen on blur
                                } else {
                                  // For other statuses, update immediately
                                  if (canManageAttendance) {
                                    void updateStatus(entry, status);
                                  }
                                }
                              }}
                              disabled={!canManageAttendance}
                              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                isSelected
                                  ? `${statusStyles[status]} border-transparent font-medium`
                                  : isPlaceholder
                                  ? "border-gray-200 text-gray-400 bg-gray-50 hover:border-gray-300 hover:text-gray-500"
                                  : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                              } ${!canManageAttendance ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              title={!canManageAttendance ? "You don't have permission to manage attendance" : isPlaceholder ? "Click to mark attendance" : ""}
                            >
                              {statusLabels[status]}
                            </button>
                            {isLateSelected && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="time"
                                  value={currentLateTime}
                                  onChange={(e) => {
                                    const newTime = e.target.value;
                                    // Update local state immediately for responsive UI
                                    setLateTimeInputs((prev) => {
                                      const newMap = new Map(prev);
                                      newMap.set(entryKey, newTime);
                                      return newMap;
                                    });
                                    // Update backend immediately when time changes
                                    if (newTime && canManageAttendance) {
                                      updateStatus(entry, "late", newTime);
                                    }
                                  }}
                                  onBlur={() => {
                                    // Ensure final value is saved
                                    const time = lateTimeInputs.get(entryKey) || entry.late_time;
                                    if (time && canManageAttendance) {
                                      updateStatus(entry, "late", time);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const time = lateTimeInputs.get(entryKey) || entry.late_time;
                                      if (time && canManageAttendance) {
                                        updateStatus(entry, "late", time);
                                        (e.target as HTMLInputElement).blur();
                                      }
                                    }
                                  }}
                                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  disabled={!canManageAttendance}
                                  title="Enter late arrival time"
                                />
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {(() => {
                    const entryKey = `${entry.person_id}-${entry.date || date}`;
                    // Prioritize backend value, fallback to local state
                    const displayTime = entry.late_time || lateTimeInputs.get(entryKey);
                    
                    if (entry.status === "late" && displayTime) {
                      return (
                        <span className="text-sm text-gray-700 font-medium">
                          {displayTime}
                        </span>
                      );
                    }
                    return <span className="text-sm text-gray-400">—</span>;
                  })()}
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    value={entry.note ?? ""}
                    onChange={(e) => canManageAttendance && void updateNote(entry, e.target.value)}
                    disabled={!canManageAttendance}
                    placeholder="Optional note"
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${!canManageAttendance ? "bg-gray-100 cursor-not-allowed" : ""}`}
                    title={!canManageAttendance ? "You don't have permission to edit attendance notes" : ""}
                  />
                </td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
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

