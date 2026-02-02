"use client";

import { stockApi } from "./apiClient";
import { ApiError } from "./apiClient";

/**
 * Check if stock account mappings are configured.
 * Returns true when mappings exist, false otherwise.
 */
export async function checkStockAccountMappingsConfigured(): Promise<boolean> {
  try {
    const response = await stockApi.getAccountMappings();
    return response.mappings !== null;
  } catch (error) {
    // Fallback to false on network / unexpected errors
    console.error("Failed to check stock account mappings:", error);
    return false;
  }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // Prefer backend-provided message when available
    if (error.data && typeof error.data === "object") {
      const data = error.data as {
        message?: string;
        error?: string;
        errors?: Record<string, string[]>;
      };
      if (data.message || data.error) {
        return data.message ?? data.error ?? error.message;
      }
      if (data.errors) {
        const firstError = Object.values(data.errors)[0]?.[0];
        if (firstError) {
          return firstError;
        }
      }
    }
    return error.message;
  }

  if (error && typeof error === "object") {
    const maybeError = error as { message?: string };
    if (maybeError.message && typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}

function isStockAccountMappingsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("account mappings not configured") ||
    lower.includes("stock account mappings")
  );
}

/**
 * Handle backend errors related to missing stock account mappings.
 *
 * If the error indicates that mappings are not configured, this will:
 * - Show a confirmation dialog explaining the problem
 * - Optionally redirect to the Stock Account Mappings settings page
 *
 * Returns true if the error was handled (and the caller should skip
 * its normal error handling), false otherwise.
 */
export function handleStockAccountMappingError(
  error: unknown,
  navigate: (path: string) => void
): boolean {
  const message = extractErrorMessage(error);

  if (!isStockAccountMappingsError(message)) {
    return false;
  }

  const dialogTitle = "Account Mappings Required";
  const dialogBody =
    "Stock Account Mappings are not configured.\n\n" +
    "To receive stock and track supplier balances correctly, you need to configure:\n" +
    "- Inventory Account (Asset)\n" +
    "- Accounts Payable Account (Liability)\n\n" +
    "Would you like to open Stock Account Mappings settings now?";

  if (typeof window !== "undefined") {
    const goToSettings = window.confirm(`${dialogTitle}\n\n${dialogBody}`);
    if (goToSettings) {
      navigate("/settings/stock-accounts");
    }
  } else {
    navigate("/settings/stock-accounts");
  }

  return true;
}

