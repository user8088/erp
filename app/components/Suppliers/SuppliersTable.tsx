"use client";

import { Edit, Trash2, User, Building2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Supplier } from "../../lib/types";

interface SuppliersTableProps {
  suppliers: Supplier[];
  loading?: boolean;
  onDelete?: (id: number) => void;
  onSelectionChange?: (selectedIds: Set<number>) => void;
}

export default function SuppliersTable({ suppliers, loading, onDelete, onSelectionChange }: SuppliersTableProps) {
  const router = useRouter();
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const handleSelectAll = () => {
    const newSelected = selectAll ? new Set<number>() : new Set(suppliers.map((s) => s.id));
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
    setSelectAll(newSelected.size === suppliers.length);
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

  const getStatusBadge = (status: Supplier['status']) => {
    return status === 'active' ? (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
        Inactive
      </span>
    );
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      {loading && suppliers.length === 0 && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading suppliers...</div>
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
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Supplier Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Contact Person</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Phone</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Email</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Total Purchase</th>
            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 whitespace-nowrap">Outstanding Balance</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {suppliers.map((supplier) => {
            return (
              <tr
                key={supplier.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('input[type="checkbox"]') || target.closest('button')) {
                    return;
                  }
                  router.push(`/suppliers/${supplier.id}`);
                }}
              >
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(supplier.id)}
                    onChange={() => handleSelectRow(supplier.id)}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                </td>
                <td className="px-4 py-3">
                  {supplier.picture_url ? (
                    <img
                      src={supplier.picture_url}
                      alt={supplier.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold border border-gray-200">
                      {getInitials(supplier.name)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-mono font-medium">
                    {supplier.serial_number}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                  <div className="flex items-center gap-2">
                    {supplier.name}
                    {supplier.customer_id && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200" title="Also a customer">
                        <User className="w-3 h-3 inline" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {supplier.contact_person || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {supplier.phone || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {supplier.email || "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {getStatusBadge(supplier.status)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-semibold">
                  PKR {Number(supplier.total_purchase_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-right font-bold">
                  {(() => {
                    const effectiveBalance = supplier.outstanding_balance ?? 0;
                    const absBalance = Math.abs(effectiveBalance);

                    if (effectiveBalance < 0) {
                      return (
                        <div className="flex flex-col items-end">
                          <span className="text-blue-600">
                            PKR {absBalance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-blue-500 mt-0.5">
                            Advance Balance
                          </span>
                        </div>
                      );
                    } else if (effectiveBalance > 0) {
                      return (
                        <div className="flex flex-col items-end">
                          <span className="text-red-600">
                            PKR {absBalance.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wider text-red-500 mt-0.5">
                            Payable Amount
                          </span>
                        </div>
                      );
                    } else {
                      return (
                        <span className="text-gray-400 font-medium italic">
                          Clear
                        </span>
                      );
                    }
                  })()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/suppliers/${supplier.id}`);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View supplier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
                            onDelete(supplier.id);
                          }
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          {!loading && suppliers.length === 0 && (
            <tr>
              <td
                colSpan={10}
                className="px-4 py-6 text-sm text-gray-500 text-center"
              >
                No suppliers found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
