import { ArrowRight } from "lucide-react";
import Link from "next/link";

const topLinks = [
  { label: "Sales Partner", href: "/sales-partner" },
  { label: "Sales Person", href: "/sales-person" },
  { label: "Loyalty Point Entry", href: "/loyalty-point-entry" },
  { label: "Promotional Scheme", href: "/promotional-scheme" },
  { label: "Pricing Rule", href: "/pricing-rule" },
  { label: "Shipping Rule", href: "/shipping-rule" },
  { label: "Coupon Code", href: "/coupon-code" },
];

const settings = [
  { label: "Selling Settings", href: "/selling-settings" },
  { label: "Terms and Conditions Template", href: "/terms-and-conditions-template" },
  { label: "Sales Taxes and Charges Template", href: "/sales-taxes-template" },
  { label: "Lead Source", href: "/lead-source" },
  { label: "Customer Group", href: "/customer-group" },
  { label: "Contact", href: "/contact" },
  { label: "Address", href: "/address" },
  { label: "Territory", href: "/territory" },
  { label: "Campaign", href: "/campaign" },
];

const keyReports = [
  { label: "Sales Analytics", href: "/sales-analytics" },
  { label: "Sales Order Analysis", href: "/sales-order-analysis" },
  { label: "Sales Funnel", href: "/sales-funnel" },
  { label: "Sales Order Trends", href: "/sales-order-trends" },
  { label: "Quotation Trends", href: "/quotation-trends" },
  { label: "Customer Acquisition and Loyalty", href: "/customer-acquisition-loyalty" },
  { label: "Inactive Customers", href: "/inactive-customers" },
  { label: "Sales Person-wise Transaction Summary", href: "/sales-person-transaction-summary" },
  { label: "Item-wise Sales History", href: "/item-wise-sales-history" },
];

const otherReports = [
  { label: "Customer Addresses And Contacts", href: "/customer-addresses-contacts" },
  { label: "Available Stock for Packing Items", href: "/available-stock-packing" },
  { label: "Pending SO Items For Purchase Request", href: "/pending-so-items" },
  { label: "Delivery Note Trends", href: "/delivery-note-trends" },
  { label: "Sales Invoice Trends", href: "/sales-invoice-trends" },
  { label: "Customer Credit Balance", href: "/customer-credit-balance" },
  { label: "Customers Without Any Sales Transactions...", href: "/customers-no-sales" },
  { label: "Sales Partners Commission", href: "/sales-partners-commission" },
  { label: "Territory Target Variance Based On Item Gr...", href: "/territory-target-variance" },
  { label: "Sales Person Target Variance Based On Ite...", href: "/sales-person-target-variance" },
  { label: "Sales Partner Target Variance Based On Ite...", href: "/sales-partner-target-variance" },
];

export default function SellingAdditionalSections() {
  return (
    <div className="space-y-8">
      {/* Settings, Key Reports, and Other Reports in a grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings - Left Column */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
          <ul className="space-y-1.5">
            {settings.map((item) => (
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

        {/* Key Reports - Middle Column */}
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

        {/* Other Reports - Right Column */}
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
    </div>
  );
}

