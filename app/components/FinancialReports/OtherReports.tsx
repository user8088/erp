import { ArrowRight } from "lucide-react";
import Link from "next/link";

const otherReports = [
  { label: "Trial Balance for Party", href: "/trial-balance-for-party" },
  { label: "Payment Period Based On Invoice Date", href: "/payment-period-based-on-invoice-date" },
  { label: "Sales Partners Commission", href: "/sales-partners-commission" },
  { label: "Customer Credit Balance", href: "/customer-credit-balance" },
  { label: "Sales Payment Summary", href: "/sales-payment-summary" },
  { label: "Address And Contacts", href: "/address-and-contacts" },
];

export default function OtherReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Other Reports</h2>
      <ul className="space-y-1.5">
        {otherReports.map((item) => (
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

