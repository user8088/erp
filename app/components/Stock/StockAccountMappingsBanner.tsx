"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { checkStockAccountMappingsConfigured } from "../../lib/stockAccountMappingsClient";

export default function StockAccountMappingsBanner() {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkMappings = async () => {
      const configured = await checkStockAccountMappingsConfigured();
      if (isMounted && !configured) {
        setShowBanner(true);
      }
    };

    void checkMappings();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className="mb-4">
      <div className="flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-yellow-600" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-yellow-900">
            Stock Account Mappings not configured
          </p>
          <p className="mt-1 text-xs text-yellow-800">
            Purchase orders and supplier payments require Stock Account Mappings to be configured in
            order to create journal entries and track supplier balances correctly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/settings/stock-accounts")}
          className="ml-4 inline-flex items-center rounded-md border border-yellow-300 bg-white px-3 py-1.5 text-xs font-medium text-yellow-900 shadow-sm hover:bg-yellow-50"
        >
          Configure Now
        </button>
      </div>
    </div>
  );
}

