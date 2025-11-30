import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  "Items Catalogue": [
    { label: "Item", href: "/item" },
    { label: "Item Group", href: "/item-group" },
    { label: "Product Bundle", href: "/product-bundle" },
    { label: "Shipping Rule", href: "/shipping-rule" },
    { label: "Item Alternative", href: "/item-alternative" },
    { label: "Item Manufacturer", href: "/item-manufacturer" },
  ],
  "Stock Transactions": [
    { label: "Material Request", href: "/material-request" },
    { label: "Stock Entry", href: "/stock-entry" },
    { label: "Delivery Note", href: "/delivery-note" },
    { label: "Purchase Receipt", href: "/purchase-receipt" },
    { label: "Pick List", href: "/pick-list" },
    { label: "Delivery Trip", href: "/delivery-trip" },
  ],
  "Stock Reports": [
    { label: "Stock Ledger", href: "/stock-ledger" },
    { label: "Stock Balance", href: "/stock-balance" },
    { label: "Stock Projected Qty", href: "/stock-projected-qty" },
    { label: "Stock Summary", href: "/stock-summary" },
    { label: "Stock Ageing", href: "/stock-ageing" },
    { label: "Item Price Stock", href: "/item-price-stock" },
    { label: "Warehouse Wise Stock Balance", href: "/warehouse-wise-stock-balance" },
  ],
  Settings: [
    { label: "Stock Settings", href: "/stock-settings" },
    { label: "Warehouse", href: "/warehouse" },
    { label: "Unit of Measure (UOM)", href: "/uom" },
    { label: "Item Variant Settings", href: "/item-variant-settings" },
    { label: "Brand", href: "/brand" },
    { label: "Item Attribute", href: "/item-attribute" },
    { label: "UOM Conversion Factor", href: "/uom-conversion-factor" },
  ],
  "Serial No and Batch": [
    { label: "Serial No", href: "/serial-no" },
    { label: "Batch", href: "/batch" },
    { label: "Installation Note", href: "/installation-note" },
    { label: "Serial No Service Contract Expiry", href: "/serial-no-service-contract-expiry" },
    { label: "Serial No Status", href: "/serial-no-status" },
    { label: "Serial No Warranty Expiry", href: "/serial-no-warranty-expiry" },
  ],
  Tools: [
    { label: "Stock Reconciliation", href: "/stock-reconciliation" },
    { label: "Landed Cost Voucher", href: "/landed-cost-voucher" },
    { label: "Packing Slip", href: "/packing-slip" },
    { label: "Quality Inspection", href: "/quality-inspection" },
    { label: "Quality Inspection Template", href: "/quality-inspection-template" },
    { label: "Quick Stock Balance", href: "/quick-stock-balance" },
  ],
};

export default function StockReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Masters & Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Items Catalogue</h3>
          <ul className="space-y-1.5">
            {reports["Items Catalogue"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Stock Transactions</h3>
          <ul className="space-y-1.5">
            {reports["Stock Transactions"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Stock Reports</h3>
          <ul className="space-y-1.5">
            {reports["Stock Reports"].map((item) => (
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Serial No and Batch</h3>
          <ul className="space-y-1.5">
            {reports["Serial No and Batch"].map((item) => (
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
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tools</h3>
          <ul className="space-y-1.5">
            {reports.Tools.map((item) => (
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

