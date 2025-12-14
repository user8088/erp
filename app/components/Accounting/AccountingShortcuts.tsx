import { ArrowRight } from "lucide-react";
import Link from "next/link";

const shortcuts = [
  { label: "Chart of Accounts", href: "/chart-of-accounts" },
  { label: "Journal Entry", href: "/journal-entry/new" },
  { label: "Accounts Receivable", href: "/accounting/receivables" },
  { label: "Accounts Payable", href: "/accounting/payables" },
  { label: "Financial Reports", href: "/accounting/financial-reports" },
];

export default function AccountingShortcuts() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Shortcuts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors group"
          >
            <span className="text-sm text-gray-700">{shortcut.label}</span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}

