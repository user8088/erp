"use client";

import { MoreVertical } from "lucide-react";

interface StockKPICardProps {
  title: string;
  value: string;
}

export default function StockKPICard({ title, value }: StockKPICardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 relative overflow-hidden min-w-0">
      <button className="absolute top-3 right-3 p-1.5 hover:bg-gray-50 rounded transition-colors shrink-0">
        <MoreVertical className="w-4 h-4 text-gray-500" />
      </button>
      <div className="pr-10 min-w-0">
        <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          {title}
        </h3>
        <p className="text-lg sm:text-xl font-semibold text-gray-900 tabular-nums truncate" title={value}>
          {value}
        </p>
      </div>
    </div>
  );
}

