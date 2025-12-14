import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  Buying: [
    { label: "Purchase Orders", href: "/stock/purchase-orders/new" },
    { label: "Purchase Invoices", href: "/buying/purchase-invoices" },
    { label: "Supplier Invoices", href: "/supplier/invoices" },
  ],
  Suppliers: [
    { label: "Suppliers", href: "/suppliers" },
  ],
};

export default function BuyingReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Buying</h3>
          <ul className="space-y-1.5">
            {reports.Buying.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Suppliers</h3>
          <ul className="space-y-1.5">
            {reports.Suppliers.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

