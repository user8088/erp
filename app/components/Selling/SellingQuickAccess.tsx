"use client";

import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { salesApi } from "../../lib/apiClient";

export default function SellingQuickAccess() {
  const [ordersToDeliver, setOrdersToDeliver] = useState<number | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const fetchOrdersCount = async () => {
      setLoadingOrders(true);
      try {
        const response = await salesApi.getSales({
          sale_type: 'delivery',
          status: 'draft',
          per_page: 1,
        });
        setOrdersToDeliver(response.meta.total);
      } catch (error) {
        console.error("Failed to fetch orders count:", error);
        setOrdersToDeliver(null);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrdersCount();
  }, []);

  const shortcuts = [
    { label: "Sale Invoices", href: "/selling/sale-invoices" },
    { label: "Customer Invoices", href: "/customer/invoices" },
    { label: "Point of Sale", href: "/selling/point-of-sale" },
    { 
      label: "Sales Order", 
      href: "/selling/sales-orders", 
      badge: ordersToDeliver !== null 
        ? `${ordersToDeliver} To Deliver` 
        : loadingOrders 
        ? "Loading..." 
        : "—", 
      badgeColor: "bg-orange-100 text-orange-700" 
    },
    { label: "Customers", href: "/customer" },
  ];
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
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

