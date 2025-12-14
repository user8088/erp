"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { purchaseOrdersApi } from "../../lib/apiClient";

export default function BuyingShortcuts() {
  const [purchaseOrdersCount, setPurchaseOrdersCount] = useState<number | null>(null);
  const [loadingPOs, setLoadingPOs] = useState(false);

  useEffect(() => {
    // Fetch purchase orders count
    const fetchPurchaseOrdersCount = async () => {
      setLoadingPOs(true);
      try {
        const response = await purchaseOrdersApi.getPurchaseOrders({ per_page: 1 });
        setPurchaseOrdersCount(response.meta.total);
      } catch (error) {
        console.error("Failed to fetch purchase orders count:", error);
      } finally {
        setLoadingPOs(false);
      }
    };

    fetchPurchaseOrdersCount();
  }, []);

  const shortcuts = [
    {
      label: "Purchase Orders",
      href: "/stock/purchase-orders/new",
      badge: purchaseOrdersCount !== null ? `${purchaseOrdersCount} Created` : loadingPOs ? "Loading..." : "—",
      badgeColor: "bg-yellow-100 text-yellow-700",
    },
    { label: "Purchase Invoices", href: "/buying/purchase-invoices" },
    { label: "Supplier Invoices", href: "/supplier/invoices" },
    { label: "Suppliers", href: "/suppliers" },
  ];

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Shortcuts</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors group"
          >
            <span className="text-sm text-gray-700">{shortcut.label}</span>
            <div className="flex items-center gap-2">
              {shortcut.badge && (
                <span className={`px-2 py-0.5 ${shortcut.badgeColor} text-xs rounded-full font-medium`}>
                  {shortcut.badge}
                </span>
              )}
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

