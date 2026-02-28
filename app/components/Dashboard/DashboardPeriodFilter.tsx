"use client";

import { useMemo } from "react";

export type DashboardPeriodType = "current_month" | "current_year" | "custom";

export interface DashboardPeriodState {
  period: DashboardPeriodType;
  start_date?: string;
  end_date?: string;
}

interface DashboardPeriodFilterProps {
  value: DashboardPeriodState;
  onChange: (value: DashboardPeriodState) => void;
}

const PERIOD_OPTIONS: { value: DashboardPeriodType; label: string }[] = [
  { value: "current_month", label: "Current month" },
  { value: "current_year", label: "Current year" },
  { value: "custom", label: "Custom range" },
];

export default function DashboardPeriodFilter({
  value,
  onChange,
}: DashboardPeriodFilterProps) {
  const { period, start_date, end_date } = value;

  const isCustom = period === "custom";

  const today = useMemo(() => new Date(), []);

  const handlePeriodChange = (newPeriod: DashboardPeriodType) => {
    if (newPeriod === "custom" && period !== "custom") {
      const year = today.getFullYear();
      const month = today.getMonth() + 1;
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const end = `${year}-${String(month).padStart(2, "0")}-${String(
        new Date(year, month, 0).getDate()
      ).padStart(2, "0")}`;
      onChange({ period: "custom", start_date: start, end_date: end });
    } else if (newPeriod !== "custom") {
      onChange({ period: newPeriod });
    } else {
      onChange({ period: "custom", start_date, end_date });
    }
  };

  const handleDateChange = (field: "start_date" | "end_date", date: string) => {
    onChange({
      ...value,
      [field]: date || undefined,
    });
  };

  return (
    <section className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">ERP Overview</h1>
        <p className="text-xs text-gray-500">
          High-level statistics across all modules, powered by live data.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Period
          </label>
          <select
            className="w-40 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            value={period}
            onChange={(e) =>
              handlePeriodChange(e.target.value as DashboardPeriodType)
            }
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {isCustom && (
          <div className="flex gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start date
              </label>
              <input
                type="date"
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={start_date ?? ""}
                onChange={(e) => handleDateChange("start_date", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End date
              </label>
              <input
                type="date"
                className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={end_date ?? ""}
                onChange={(e) => handleDateChange("end_date", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

