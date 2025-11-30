import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  Buying: [
    { label: "Material Request", href: "/material-request" },
    { label: "Purchase Order", href: "/purchase-order" },
    { label: "Purchase Invoice", href: "/purchase-invoice" },
    { label: "Request for Quotation", href: "/request-for-quotation" },
    { label: "Supplier Quotation", href: "/supplier-quotation" },
  ],
  Supplier: [
    { label: "Supplier", href: "/supplier" },
    { label: "Supplier Group", href: "/supplier-group" },
    { label: "Contact", href: "/contact" },
    { label: "Address", href: "/address" },
  ],
  "Items & Pricing": [
    { label: "Item", href: "/item" },
    { label: "Item Price", href: "/item-price" },
    { label: "Price List", href: "/price-list" },
    { label: "Product Bundle", href: "/product-bundle" },
    { label: "Item Group", href: "/item-group" },
    { label: "Promotional Scheme", href: "/promotional-scheme" },
    { label: "Pricing Rule", href: "/pricing-rule" },
  ],
  "Supplier Scorecard": [
    { label: "Supplier Scorecard", href: "/supplier-scorecard" },
    { label: "Supplier Scorecard Variable", href: "/supplier-scorecard-variable" },
    { label: "Supplier Scorecard Criteria", href: "/supplier-scorecard-criteria" },
    { label: "Supplier Scorecard Standing", href: "/supplier-scorecard-standing" },
  ],
  Settings: [
    { label: "Buying Settings", href: "/buying-settings" },
    { label: "Purchase Taxes and Charges Template", href: "/purchase-taxes-template" },
    { label: "Terms and Conditions Template", href: "/terms-and-conditions-template" },
  ],
  "Key Reports": [
    { label: "Purchase Analytics", href: "/purchase-analytics" },
    { label: "Purchase Order Analysis", href: "/purchase-order-analysis" },
    { label: "Supplier-Wise Sales Analytics", href: "/supplier-wise-sales-analytics" },
    { label: "Items to Order and Receive", href: "/items-to-order-and-receive" },
    { label: "Purchase Order Trends", href: "/purchase-order-trends" },
    { label: "Procurement Tracker", href: "/procurement-tracker" },
  ],
};

export default function BuyingReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-6">
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
            <h3 className="text-sm font-medium text-gray-700 mb-3">Supplier</h3>
            <ul className="space-y-1.5">
              {reports.Supplier.map((item) => (
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
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Items & Pricing</h3>
            <ul className="space-y-1.5">
              {reports["Items & Pricing"].map((item) => (
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
            <h3 className="text-sm font-medium text-gray-700 mb-3">Supplier Scorecard</h3>
            <ul className="space-y-1.5">
              {reports["Supplier Scorecard"].map((item) => (
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
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Settings</h3>
            <ul className="space-y-1.5">
              {reports.Settings.map((item) => (
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
            <h3 className="text-sm font-medium text-gray-700 mb-3">Key Reports</h3>
            <ul className="space-y-1.5">
              {reports["Key Reports"].map((item) => (
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
      </div>
    </section>
  );
}

