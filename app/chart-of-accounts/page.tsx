"use client";

import { useEffect, useMemo, useState } from "react";
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
import { accountsApi } from "../lib/apiClient";
import type { Account, AccountTreeNode } from "../lib/types";
import { useUser } from "../components/User/UserContext";

type ViewMode = "tree" | "list";

function mapToTreeNodes(nodes: Account[]): AccountTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    children: node.children ? mapToTreeNodes(node.children) : [],
  }));
}

function flattenAccounts(
  nodes: AccountTreeNode[],
  parentName?: string
): (AccountTreeNode & { parentName?: string })[] {
  const rows: (AccountTreeNode & { parentName?: string })[] = [];

  for (const node of nodes) {
    rows.push({ ...node, parentName });
    if (node.children && node.children.length > 0) {
      rows.push(...flattenAccounts(node.children, node.name));
    }
  }

  return rows;
}

function getAllAccountIds(nodes: AccountTreeNode[]): number[] {
  const ids: number[] = [];
  for (const node of nodes) {
    ids.push(node.id);
    if (node.children && node.children.length > 0) {
      ids.push(...getAllAccountIds(node.children));
    }
  }
  return ids;
}

type TreeRowProps = {
  node: AccountTreeNode;
  level?: number;
  selected: boolean;
  onToggle: (id: number) => void;
};

function TreeRow({ node, level = 0, selected, onToggle }: TreeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <tr
        className="hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("input") || target.closest("button")) return;
          window.location.href = `/accounting/accounts/${node.id}`;
        }}
      >
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
                {(node.number ?? "—") + " - " + node.name}
              </span>
              <span className="text-xs text-gray-500">
                {node.root_type.toUpperCase()}{" "}
                {node.normal_balance ? `· ${node.normal_balance}` : ""}
              </span>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-top w-32">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {node.is_disabled ? "Disabled" : "Enabled"}
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

function TreeView({
  accounts,
  loading,
}: {
  accounts: AccountTreeNode[];
  loading: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const allIds = useMemo(() => getAllAccountIds(accounts), [accounts]);
  const selectAll = selectedIds.size === allIds.length && allIds.length > 0;

  const handleToggleRow = (id: number) => {
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

  if (!loading && accounts.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg bg-white px-6 py-10 text-center text-sm text-gray-500">
        No accounts have been created yet. Use <span className="font-medium">New Account</span> to
        start building your chart of accounts.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto bg-white">
      {loading && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading accounts...</div>
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
              Account
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap w-32">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accounts.map((root) => (
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

function ListView({
  accounts,
  loading,
}: {
  accounts: AccountTreeNode[];
  loading: boolean;
}) {
  const rows = useMemo(() => flattenAccounts(accounts), [accounts]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const allIds = rows.map((r) => r.id);
  const selectAll = selectedIds.size === allIds.length && allIds.length > 0;

  const handleToggleRow = (id: number) => {
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

  if (!loading && rows.length === 0) {
    return (
      <div className="border border-dashed border-gray-300 rounded-lg bg-white px-6 py-10 text-center text-sm text-gray-500">
        No accounts have been created yet. Switch to <span className="font-medium">Tree</span> view
        or use <span className="font-medium">New Account</span> to add your first ledger.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-x-auto">
      {loading && (
        <div className="px-4 py-3 text-sm text-gray-500">Loading accounts...</div>
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
              <tr
                key={row.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("input") || target.closest("button")) return;
                  window.location.href = `/accounting/accounts/${row.id}`;
                }}
              >
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
                {row.number ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                {row.root_type}
              </td>
              <td className="px-4 py-3 whitespace-nowrap w-32">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {row.is_disabled ? "Disabled" : "Enabled"}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                {row.normal_balance ?? "—"}
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
  const { hasAtLeast } = useUser();

  const [accounts, setAccounts] = useState<AccountTreeNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReadAccounting = hasAtLeast("module.accounting", "read");
  const canWriteAccounting = hasAtLeast("module.accounting", "read-write");

  useEffect(() => {
    if (!canReadAccounting) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // TODO: wire real company_id from user/company selection when available
        const tree = await accountsApi.getAccountsTree(1);
        if (!cancelled) {
          setAccounts(mapToTreeNodes(tree));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Failed to load chart of accounts."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [canReadAccounting]);

  if (!canReadAccounting) {
    return (
      <div className="max-w-3xl mx-auto min-h-full py-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Accounting Access Required
        </h1>
        <p className="text-sm text-gray-600">
          You don&apos;t have permission to view the Chart of Accounts. Please
          contact your system administrator if you believe this is a mistake.
        </p>
      </div>
    );
  }

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
          {canWriteAccounting && (
            <button
              type="button"
              onClick={() => router.push("/accounting/accounts/new")}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>New Account</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {viewMode === "tree" ? (
        <TreeView accounts={accounts} loading={loading} />
      ) : (
        <ListView accounts={accounts} loading={loading} />
      )}
    </div>
  );
}



