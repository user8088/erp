"use client";

import { ReactNode } from "react";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  rightElement?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  minHeight?: number;
}

export default function ChartContainer({
  title,
  subtitle,
  rightElement,
  children,
  loading = false,
  error,
  minHeight = 260,
}: ChartContainerProps) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {rightElement && <div className="flex-shrink-0">{rightElement}</div>}
      </div>

      {error && !loading && (
        <div
          style={{ minHeight }}
          className="flex items-center justify-center text-xs text-red-500 bg-red-50/60 rounded-lg border border-red-100"
        >
          {error}
        </div>
      )}

      {!error && loading && (
        <div
          style={{ minHeight }}
          className="flex items-center justify-center bg-gray-50 rounded-lg border border-gray-100"
        >
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Loading chart...</p>
          </div>
        </div>
      )}

      {!error && !loading && (
        <div style={{ minHeight }} className="relative">
          {children}
        </div>
      )}
    </section>
  );
}

