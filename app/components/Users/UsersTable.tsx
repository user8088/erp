"use client";

import { MessageCircle, Heart, Clock } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "../../lib/types";

interface UsersTableProps {
  users: User[];
  loading?: boolean;
}

export default function UsersTable({ users, loading }: UsersTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(
    new Set()
  );
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(users.map((user) => user.id)));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectRow = (id: string | number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === users.length);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && users.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading users...</div>
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
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Full Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">User Type</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">ID</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Phone Number</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Address</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Last Updated On</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => {
            const statusLabel =
              user.status === "active" ? "Active" : "Inactive";
            const lastUpdated = user.updated_at ?? "";
            const phone = user.phone ?? "";
            const address = user.address ?? "";
            const idDisplay = user.email || String(user.id);

            return (
            <tr
              key={user.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={(e) => {
                // Don't navigate if clicking on checkbox or action buttons
                const target = e.target as HTMLElement;
                if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                  return;
                }
                router.push(`/staff/users/${user.id}`);
              }}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedRows.has(user.id)}
                  onChange={() => handleSelectRow(user.id)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                {user.full_name}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {statusLabel}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {user.user_type ?? ""}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {idDisplay}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {phone}
              </td>
              <td
                className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate"
                title={address}
              >
                {address}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-xs text-gray-500">
                    {lastUpdated || "-"}
                  </span>
                  <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">0</span>
                  </button>
                  <button className="text-gray-500 hover:text-red-500 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}

