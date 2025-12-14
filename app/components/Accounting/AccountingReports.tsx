import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  "Accounting": [
    { label: "Chart of Accounts", href: "/chart-of-accounts" },
    { label: "Accounts Receivable", href: "/accounting/receivables" },
    { label: "Accounts Payable", href: "/accounting/payables" },
    { label: "Financial Reports", href: "/accounting/financial-reports" },
  ],
  "Journal Entries": [
    { label: "New Journal Entry", href: "/journal-entry/new" },
  ],
  "Invoices": [
    { label: "Sale Invoices", href: "/selling/sale-invoices" },
    { label: "Purchase Invoices", href: "/buying/purchase-invoices" },
    { label: "Customer Invoices", href: "/customer/invoices" },
    { label: "Supplier Invoices", href: "/supplier/invoices" },
  ],
};

export default function AccountingReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Accounting</h3>
          <ul className="space-y-1.5">
            {reports["Accounting"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Journal Entries</h3>
          <ul className="space-y-1.5">
            {reports["Journal Entries"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Invoices</h3>
          <ul className="space-y-1.5">
            {reports["Invoices"].map((item) => (
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

