import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  Invoicing: [
    { label: "Purchase Invoice", href: "/purchase-invoice" },
    { label: "Supplier", href: "/supplier" },
  ],
  Payments: [
    { label: "Payment Entry", href: "/payment-entry" },
    { label: "Journal Entry", href: "/journal-entry" },
    { label: "Payment Reconciliation", href: "/payment-reconciliation" },
  ],
  Reports: [
    { label: "Accounts Payable", href: "/accounts-payable" },
    { label: "Accounts Payable Summary", href: "/accounts-payable-summary" },
    { label: "Purchase Register", href: "/purchase-register" },
    { label: "Item-wise Purchase Register", href: "/item-wise-purchase-register" },
    { label: "Purchase Order Analysis", href: "/purchase-order-analysis" },
    { label: "Received Items To Be Billed", href: "/received-items-to-be-billed" },
    { label: "Supplier Ledger Summary", href: "/supplier-ledger-summary" },
  ],
};

export default function PayablesReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Invoicing</h3>
          <ul className="space-y-1.5">
            {reports.Invoicing.map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Reports</h3>
          <ul className="space-y-1.5">
            {reports.Reports.map((item) => (
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

