"use client";

import { Edit, Trash2, Star } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "../../lib/types";

interface CustomersTableProps {
  customers: Customer[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  onBulkDelete?: (ids: number[]) => void;
  onSelectionChange?: (selectedIds: Set<number>) => void;
}

export default function CustomersTable({ customers, loading, onDelete, onBulkDelete, onSelectionChange }: CustomersTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    const newSelected = selectAll ? new Set<number>() : new Set(customers.map((customer) => customer.id));
    setSelectedRows(newSelected);
    setSelectAll(!selectAll);
    onSelectionChange?.(newSelected);
  };

  const handleSelectRow = (id: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
    setSelectAll(newSelected.size === customers.length);
    onSelectionChange?.(newSelected);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && customers.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading customers...</div>
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
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Picture</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Serial #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Phone Number</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Address</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Rating</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {customers.map((customer) => {
              const statusLabel = customer.status === "clear" ? "Clear" : "Has Dues";
              const statusColor = customer.status === "clear" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800";

              return (
                <tr
                  key={customer.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                      return;
                    }
                    router.push(`/customer/${customer.id}`);
                  }}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.has(customer.id)}
                      onChange={() => handleSelectRow(customer.id)}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {customer.picture_url ? (
                      <img
                        src={customer.picture_url}
                        alt={customer.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold">
                        {getInitials(customer.name)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {customer.serial_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {customer.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {customer.phone || "—"}
                  </td>
                  <td
                    className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate"
                    title={customer.address || ""}
                  >
                    {customer.address || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-semibold text-gray-900">{customer.rating}</span>
                      <span className="text-gray-500">/10</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/customer/${customer.id}`);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit customer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${customer.name}?`)) {
                              onDelete(customer.id);
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && customers.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
