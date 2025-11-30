import { ArrowRight } from "lucide-react";
import Link from "next/link";

const keyReports = [
  { label: "Stock Analytics", href: "/stock-analytics" },
  { label: "Delivery Note Trends", href: "/delivery-note-trends" },
  { label: "Purchase Receipt Trends", href: "/purchase-receipt-trends" },
  { label: "Sales Order Analysis", href: "/sales-order-analysis" },
  { label: "Purchase Order Analysis", href: "/purchase-order-analysis" },
  { label: "Item Shortage Report", href: "/item-shortage-report" },
  { label: "Batch-Wise Balance History", href: "/batch-wise-balance-history" },
];

const otherReports = [
  { label: "Requested Items To Be Transferred", href: "/requested-items-transfer" },
  { label: "Batch Item Expiry Status", href: "/batch-item-expiry-status" },
  { label: "Item Prices", href: "/item-prices" },
  { label: "Itemwise Recommended Reorder Level", href: "/itemwise-reorder-level" },
  { label: "Item Variant Details", href: "/item-variant-details" },
  { label: "Subcontracted Raw Materials To Be Transf...", href: "/subcontracted-raw-materials" },
  { label: "Subcontracted Item To Be Received", href: "/subcontracted-item-received" },
];

export default function StockAdditionalReports() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Reports</h2>
        <ul className="space-y-1.5">
          {keyReports.map((item) => (
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
      </div>
    </div>
  );
}

