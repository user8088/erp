import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = [
  { label: "Accounts Receivable", href: "/accounts-receivable" },
  { label: "Accounts Receivable Summary", href: "/accounts-receivable-summary" },
  { label: "Sales Register", href: "/sales-register" },
  { label: "Item-wise Sales Register", href: "/item-wise-sales-register" },
  { label: "Sales Order Analysis", href: "/sales-order-analysis" },
  { label: "Delivered Items To Be Billed", href: "/delivered-items-to-be-billed" },
];

export default function ReceivablesReportsList() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports</h2>
      <ul className="space-y-1.5">
        {reports.map((item) => (
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
    </section>
  );
}

