import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  Selling: [
    { label: "Customer", href: "/customer" },
    { label: "Quotation", href: "/quotation" },
    { label: "Sales Order", href: "/sales-order" },
    { label: "Sales Invoice", href: "/sales-invoice" },
    { label: "Blanket Order", href: "/blanket-order" },
    { label: "Sales Partner", href: "/sales-partner" },
    { label: "Sales Person", href: "/sales-person" },
  ],
  "Point of Sale": [
    { label: "Point-of-Sale Profile", href: "/pos-profile" },
    { label: "POS Settings", href: "/pos-settings" },
    { label: "POS Opening Entry", href: "/pos-opening-entry" },
    { label: "POS Closing Entry", href: "/pos-closing-entry" },
    { label: "Loyalty Program", href: "/loyalty-program" },
    { label: "Loyalty Point Entry", href: "/loyalty-point-entry" },
  ],
  "Items and Pricing": [
    { label: "Item", href: "/item" },
    { label: "Item Price", href: "/item-price" },
    { label: "Price List", href: "/price-list" },
    { label: "Item Group", href: "/item-group" },
    { label: "Product Bundle", href: "/product-bundle" },
    { label: "Promotional Scheme", href: "/promotional-scheme" },
    { label: "Pricing Rule", href: "/pricing-rule" },
    { label: "Shipping Rule", href: "/shipping-rule" },
    { label: "Coupon Code", href: "/coupon-code" },
  ],
};

export default function SellingReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Selling</h3>
          <ul className="space-y-1.5">
            {reports.Selling.map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Point of Sale</h3>
          <ul className="space-y-1.5">
            {reports["Point of Sale"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Items and Pricing</h3>
          <ul className="space-y-1.5">
            {reports["Items and Pricing"].map((item) => (
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

