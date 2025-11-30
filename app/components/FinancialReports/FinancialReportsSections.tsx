import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  Ledgers: [
    { label: "General Ledger", href: "/general-ledger" },
    { label: "Customer Ledger Summary", href: "/customer-ledger-summary" },
    { label: "Supplier Ledger Summary", href: "/supplier-ledger-summary" },
  ],
  "Financial Statements": [
    { label: "Trial Balance", href: "/trial-balance" },
    { label: "Profit and Loss Statement", href: "/profit-and-loss-statement" },
    { label: "Balance Sheet", href: "/balance-sheet" },
    { label: "Cash Flow", href: "/cash-flow" },
    { label: "Consolidated Financial Statement", href: "/consolidated-financial-statement" },
  ],
  Profitability: [
    { label: "Gross Profit", href: "/gross-profit" },
    { label: "Profitability Analysis", href: "/profitability-analysis" },
    { label: "Sales Invoice Trends", href: "/sales-invoice-trends" },
    { label: "Purchase Invoice Trends", href: "/purchase-invoice-trends" },
  ],
};

export default function FinancialReportsSections() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Ledgers</h3>
          <ul className="space-y-1.5">
            {reports.Ledgers.map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Financial Statements</h3>
          <ul className="space-y-1.5">
            {reports["Financial Statements"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Profitability</h3>
          <ul className="space-y-1.5">
            {reports.Profitability.map((item) => (
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

