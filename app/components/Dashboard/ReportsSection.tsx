import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  accounting: [
    { label: "Chart of Accounts", href: "/chart-of-accounts" },
    { label: "Company", href: "/company" },
    { label: "Customer", href: "/customer" },
    { label: "Supplier", href: "/supplier" },
  ],
  stock: [
    { label: "Item", href: "/item" },
    { label: "Warehouse", href: "/warehouse" },
    { label: "Brand", href: "/brand" },
    { label: "Unit of Measure (UOM)", href: "/uom" },
    { label: "Stock Reconciliation", href: "/stock-reconciliation" },
  ],
  crm: [
    { label: "Lead", href: "/lead" },
    { label: "Customer Group", href: "/customer-group" },
    { label: "Territory", href: "/territory" },
  ],
};

export default function ReportsSection() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Accounting</h3>
          <ul className="space-y-1.5">
            {reports.accounting.map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Stock</h3>
          <ul className="space-y-1.5">
            {reports.stock.map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">CRM</h3>
          <ul className="space-y-1.5">
            {reports.crm.map((item) => (
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

