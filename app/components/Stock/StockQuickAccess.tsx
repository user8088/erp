import { ArrowRight } from "lucide-react";
import Link from "next/link";

const shortcuts = [
  { label: "Item", href: "/item", badge: "10 Available", badgeColor: "bg-green-100 text-green-700" },
  { label: "Material Request", href: "/material-request", badge: "0 Pending", badgeColor: "bg-gray-100 text-gray-700" },
  { label: "Stock Entry", href: "/stock-entry" },
  { label: "Purchase Receipt", href: "/purchase-receipt", badge: "0 To Bill", badgeColor: "bg-gray-100 text-gray-700" },
  { label: "Delivery Note", href: "/delivery-note", badge: "0 To Bill", badgeColor: "bg-gray-100 text-gray-700" },
  { label: "Stock Ledger", href: "/stock-ledger" },
  { label: "Stock Balance", href: "/stock-balance" },
  { label: "Dashboard", href: "/dashboard" },
];

export default function StockQuickAccess() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors group"
          >
            <span className="text-sm text-gray-700">{shortcut.label}</span>
            <div className="flex items-center gap-2">
              {shortcut.badge && (
                <span className={`px-2 py-0.5 ${shortcut.badgeColor} text-xs rounded-full font-medium`}>
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

