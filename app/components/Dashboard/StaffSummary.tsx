"use client";

import { useEffect, useMemo, useState } from "react";
import { staffApi, attendanceApi } from "../../lib/apiClient";

interface StaffKPI {
  label: string;
  value: string;
}

export default function StaffSummary() {
  const [kpis, setKpis] = useState<StaffKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const [activeStaffRes, attendanceRes] = await Promise.all([
          staffApi.list({ status: "active", per_page: 1 }),
          attendanceApi.list({
            date: today,
            summary: true,
            per_page: 1,
            person_type: "staff",
          }),
        ]);

        const activeStaff =
          "meta" in activeStaffRes ? activeStaffRes.meta.total : 0;
        const present = attendanceRes.summary?.present ?? 0;
        const absent = attendanceRes.summary?.absent ?? 0;

        setKpis([
          {
            label: "ACTIVE STAFF",
            value: `${activeStaff}`,
          },
          {
            label: "PRESENT TODAY",
            value: `${present}`,
          },
          {
            label: "ABSENT TODAY",
            value: `${absent}`,
          },
        ]);
      } catch (e) {
        console.error("Failed to load staff summary:", e);
        const message =
          e instanceof Error ? e.message : "Failed to load staff summary";
        setError(message);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, [today]);

  const displayData: StaffKPI[] =
    kpis.length > 0
      ? kpis
      : [
          {
            label: "ACTIVE STAFF",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "PRESENT TODAY",
            value: loading ? "Loading..." : "0",
          },
          {
            label: "ABSENT TODAY",
            value: loading ? "Loading..." : "0",
          },
        ];

  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Staff</h2>
        {error && (
          <span className="text-xs text-red-500 truncate max-w-xs">
            {error}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayData.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-gray-200 rounded-lg p-4"
          >
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {kpi.label}
            </p>
            <p className="text-xl font-semibold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

