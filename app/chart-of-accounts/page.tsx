"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  List,
  TreePine,
  Folder,
  FolderOpen,
  Plus,
} from "lucide-react";

type AccountType = "Asset" | "Liability" | "Equity" | "Income" | "Expense";

type AccountNode = {
  id: string;
  name: string;
  number: string;
  type: AccountType;
  balance: string;
  debitOrCredit: "Dr" | "Cr";
  status?: "Enabled" | "Disabled";
  children?: AccountNode[];
};

const demoAccounts: AccountNode[] = [
  {
    id: "1000",
    name: "Application of Funds (Assets)",
    number: "1000",
    type: "Asset",
    balance: "Rs 293,533.00",
    debitOrCredit: "Dr",
    status: "Enabled",
    children: [
      {
        id: "1100-1600",
        name: "Current Assets",
        number: "1100-1600",
        type: "Asset",
        balance: "Rs 293,533.00",
        debitOrCredit: "Dr",
        status: "Enabled",
      },
      {
        id: "1700",
        name: "Fixed Assets",
        number: "1700",
        type: "Asset",
        balance: "Rs 0.00",
        debitOrCredit: "Cr",
        status: "Enabled",
      },
      {
        id: "1800",
        name: "Investments",
        number: "1800",
        type: "Asset",
        balance: "Rs 0.00",
        debitOrCredit: "Cr",
        status: "Enabled",
      },
      {
        id: "1900",
        name: "Temporary Accounts",
        number: "1900",
        type: "Asset",
        balance: "Rs 0.00",
        debitOrCredit: "Cr",
        status: "Enabled",
      },
    ],
  },
  {
    id: "2000",
    name: "Source of Funds (Liabilities)",
    number: "2000",
    type: "Liability",
    balance: "Rs 184,293.00",
    debitOrCredit: "Cr",
    status: "Enabled",
  },
  {
    id: "3000",
    name: "Equity",
    number: "3000",
    type: "Equity",
    balance: "Rs 0.00",
    debitOrCredit: "Cr",
    status: "Enabled",
  },
  {
    id: "4000",
    name: "Income",
    number: "4000",
    type: "Income",
    balance: "Rs 363,000.00",
    debitOrCredit: "Dr",
    status: "Enabled",
  },
  {
    id: "5000",
    name: "Expenses",
    number: "5000",
    type: "Expense",
    balance: "Rs 253,760.00",
    debitOrCredit: "Dr",
    status: "Enabled",
  },
];

type ViewMode = "tree" | "list";

function flattenAccounts(nodes: AccountNode[], parentName?: string): (AccountNode & { parentName?: string })[] {
  const rows: (AccountNode & { parentName?: string })[] = [];

  for (const node of nodes) {
    rows.push({ ...node, parentName });
    if (node.children && node.children.length > 0) {
      rows.push(...flattenAccounts(node.children, node.name));
    }
  }

  return rows;
}

function getAllAccountIds(nodes: AccountNode[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children && node.children.length > 0) {
      ids.push(...getAllAccountIds(node.children));
    }
  }
  return ids;
}

type TreeRowProps = {
  node: AccountNode;
  level?: number;
  selected: boolean;
  onToggle: (id: string) => void;
};

function TreeRow({ node, level = 0, selected, onToggle }: TreeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 w-12 align-top">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(node.id)}
            className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
          />
        </td>
        <td className="px-4 py-3 align-top">
          <div className="flex items-center gap-2">
            <div
              style={{ paddingLeft: level * 18 }}
              className="flex items-center gap-1"
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  className="p-0.5 rounded hover:bg-gray-100"
                >
                  {expanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
              ) : (
                <span className="w-4 h-4" />
              )}
              {hasChildren ? (
                expanded ? (
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                ) : (
                  <Folder className="w-4 h-4 text-amber-500" />
                )
              ) : (
                <span className="w-4 h-4" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900">
                {node.number} - {node.name}
              </span>
              <span className="text-xs text-gray-500">
                {node.type} · {node.balance} {node.debitOrCredit}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-top w-32">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {node.status ?? "Enabled"}
          </span>
        </td>
      </tr>
      {hasChildren &&
        expanded &&
        node.children!.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            level={level + 1}
            selected={selected}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

function TreeView() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allIds = getAllAccountIds(demoAccounts);
  const selectAll = selectedIds.size === allIds.length && allIds.length > 0;

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
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
              Account
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap w-32">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {demoAccounts.map((root) => (
            <TreeRow
              key={root.id}
              node={root}
              selected={selectedIds.has(root.id)}
              onToggle={handleToggleRow}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListView() {
  const rows = flattenAccounts(demoAccounts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const allIds = rows.map((r) => r.id);
  const selectAll = selectedIds.size === allIds.length && allIds.length > 0;

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
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
              Account Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Account Number
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Root Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap w-32">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
              Balance
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.has(row.id)}
                  onChange={() => handleToggleRow(row.id)}
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                <span className="font-medium text-gray-900">{row.name}</span>
                {row.parentName && (
                  <span className="ml-1 text-xs text-gray-500">
                    ({row.parentName})
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {row.number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {row.type}
              </td>
              <td className="px-4 py-3 whitespace-nowrap w-32">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {row.status ?? "Enabled"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {row.balance} {row.debitOrCredit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("tree");
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto min-h-full py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Chart of Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Chart of accounts helps you manage your accounts and transactions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                viewMode === "tree"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <TreePine className="w-3 h-3" />
              <span>Tree</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                viewMode === "list"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <List className="w-3 h-3" />
              <span>List</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push("/accounting/accounts/new")}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Account</span>
          </button>
        </div>
      </div>

      {viewMode === "tree" ? <TreeView /> : <ListView />}
    </div>
  );
}


