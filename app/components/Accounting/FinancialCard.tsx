"use client";

import { MoreVertical } from "lucide-react";

interface FinancialCardProps {
  title: string;
  value: string;
}

export default function FinancialCard({ title, value }: FinancialCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 relative">
      <button className="absolute top-4 right-4 p-1 hover:bg-gray-50 rounded transition-colors">
        <MoreVertical className="w-4 h-4 text-gray-600" />
      </button>
      <div className="pr-8">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {title}
        </h3>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

