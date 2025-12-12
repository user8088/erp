"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CalendarClock, Link2, ShieldCheck } from "lucide-react";
import type { StaffMember } from "../../lib/types";

interface StaffTableProps {
  staff: StaffMember[];
  loading?: boolean;
}

export default function StaffTable({ staff, loading }: StaffTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(staff.map((member) => member.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id: string | number) => {
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRows(next);
    setSelectAll(next.size === staff.length);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && staff.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading staff...</div>
      )}
      <table className="w-full min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left w-12">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
              />
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Name & Role
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Contact
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Salary
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Next Pay Date
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              ERP User
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {staff.map((member) => {
            const statusLabel =
              member.status === "active"
                ? "Active"
                : member.status === "on_leave"
                ? "On Leave"
                : "Inactive";
            const statusColor =
              member.status === "active"
                ? "bg-green-100 text-green-800"
                : member.status === "on_leave"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-red-100 text-red-800";
            const phone = member.phone ?? "-";
            const dept = member.department ? ` • ${member.department}` : "";

            return (
              <tr
                key={member.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (
                    target.closest('input[type="checkbox"]') ||
                    target.closest('button')
                  ) {
                    return;
                  }
                  router.push(`/staff/members/${member.id}`);
                }}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(member.id)}
                    onChange={() => handleSelectRow(member.id)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-700">
                      {(member.full_name || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.full_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {member.designation}
                        {dept}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{phone}</span>
                    <span className="text-xs text-gray-500">
                      {member.email ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
                  >
                    {statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {member.monthly_salary
                    ? `PKR ${member.monthly_salary.toLocaleString()}`
                    : "—"}
                  <div className="text-xs text-gray-500">
                    {member.last_paid_on
                      ? `Last paid ${member.last_paid_on}`
                      : "Not paid yet"}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-gray-500" />
                    <div>
                      <div className="text-gray-900">
                        {member.next_pay_date ?? "—"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Can pay early
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {member.is_erp_user ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-100">
                        <ShieldCheck className="w-3 h-3" />
                        ERP User
                      </span>
                      {member.erp_user_id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/staff/users/${member.erp_user_id}`);
                          }}
                          className="text-xs text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" />
                          View User
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/staff/users/new?staff_id=${member.id}`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <BadgeCheck className="w-3 h-3 text-gray-500" />
                      Make ERP User
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

