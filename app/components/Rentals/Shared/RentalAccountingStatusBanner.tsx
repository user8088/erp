"use client";

import { AlertTriangle, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRentalAccountMappings } from "./useRentalAccountMappings";

export default function RentalAccountingStatusBanner() {
  const router = useRouter();
  const { isConfigured, hasRequiredMappings, loading } = useRentalAccountMappings();

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (hasRequiredMappings) {
    return null; // All required mappings are configured
  }

  const missingMappings: string[] = [];
  if (!isConfigured.cash && !isConfigured.bank) {
    missingMappings.push("Cash or Bank account");
  }
  if (!isConfigured.ar) {
    missingMappings.push("Accounts Receivable");
  }
  if (!isConfigured.assets) {
    missingMappings.push("Rental Assets");
  }
  if (!isConfigured.securityDeposits) {
    missingMappings.push("Security Deposits");
  }
  if (!isConfigured.income) {
    missingMappings.push("Rental Income");
  }

  return (
    <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-orange-900 mb-1">
            Rental Accounting Not Fully Configured
          </h3>
          <p className="text-sm text-orange-800 mb-2">
            Some required account mappings are missing. This may prevent rental operations from working correctly.
          </p>
          <p className="text-xs text-orange-700 mb-3">
            Missing: {missingMappings.join(", ")}
          </p>
          <button
            onClick={() => router.push("/rental/settings")}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-900 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            Configure in Rental Settings
          </button>
        </div>
      </div>
    </div>
  );
}
