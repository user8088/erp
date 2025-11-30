import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  "Accounting Masters": [
    { label: "Company", href: "/company" },
    { label: "Chart of Accounts", href: "/chart-of-accounts" },
    { label: "Accounts Settings", href: "/accounts-settings" },
    { label: "Fiscal Year", href: "/fiscal-year" },
  ],
  Payments: [
    { label: "Payment Entry", href: "/payment-entry" },
    { label: "Journal Entry", href: "/journal-entry" },
    { label: "Journal Entry Template", href: "/journal-entry-template" },
    { label: "Terms and Conditions", href: "/terms-and-conditions" },
  ],
  "Tax Masters": [
    { label: "Sales Taxes and Charges Template", href: "/sales-taxes-template" },
    { label: "Purchase Taxes and Charges Template", href: "/purchase-taxes-template" },
    { label: "Item Tax Template", href: "/item-tax-template" },
    { label: "Tax Category", href: "/tax-category" },
  ],
};

export default function AccountingReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Accounting Masters</h3>
          <ul className="space-y-1.5">
            {reports["Accounting Masters"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Payments</h3>
          <ul className="space-y-1.5">
            {reports.Payments.map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tax Masters</h3>
          <ul className="space-y-1.5">
            {reports["Tax Masters"].map((item) => (
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

