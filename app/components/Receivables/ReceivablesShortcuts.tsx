import { ArrowRight } from "lucide-react";
import Link from "next/link";

const shortcuts = [
  { label: "Sales Invoice", href: "/sales-invoice", badge: 6 },
  { label: "Accounts Receivable", href: "/accounts-receivable" },
  { label: "POS Invoice", href: "/pos-invoice", badge: 0 },
  { label: "Cost Center", href: "/cost-center" },
  { label: "Payment Entry", href: "/payment-entry" },
  { label: "Journal Entry", href: "/journal-entry" },
];

export default function ReceivablesShortcuts() {
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
            <div className="flex items-center gap-2">
              {shortcut.badge !== undefined && (
                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded-full">
                  {shortcut.badge}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

