"use client";

import { useState, useEffect } from "react";
import FinancialCard from "./FinancialCard";
import { financialReportsApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";

interface FinancialSummaryData {
  company_id: number;
  period: string;
  start_date?: string;
  end_date?: string;
  summary: {
    total_income: number;
    total_expenses: number;
    accounts_receivable: number;
    accounts_payable: number;
  };
  breakdown?: {
    income?: Record<string, number>;
    expenses?: Record<string, number>;
  };
  generated_at: string;
}

const formatAmount = (amount: number): string => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 100000) {
    return `Rs ${(amount / 100000).toFixed(2)} L`;
  } else if (absAmount >= 1000) {
    return `Rs ${(amount / 1000).toFixed(2)} K`;
  }
  return `Rs ${amount.toFixed(2)}`;
};

export default function FinancialSummary() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const companyId = 1; // TODO: Get from user context when available
        const summaryData = await financialReportsApi.getFinancialSummary({
          company_id: companyId,
          period: "current_month", // Default to current month
        });
        setSummary(summaryData);
      } catch (e) {
        console.error("Failed to fetch financial summary:", e);
        const errorMessage = e instanceof Error ? e.message : "Failed to load financial summary";
        setError(errorMessage);
        // Don't show toast for initial load errors, just log
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  const financialData = summary
    ? [
        {
          title: "TOTAL INCOME",
          value: formatAmount(summary.summary.total_income),
        },
        {
          title: "TOTAL EXPENSES",
          value: formatAmount(summary.summary.total_expenses),
        },
        {
          title: "ACCOUNTS RECEIVABLE",
          value: formatAmount(summary.summary.accounts_receivable),
        },
        {
          title: "ACCOUNTS PAYABLE",
          value: formatAmount(summary.summary.accounts_payable),
        },
      ]
    : [
        {
          title: "TOTAL INCOME",
          value: loading ? "Loading..." : "Rs 0.00",
        },
        {
          title: "TOTAL EXPENSES",
          value: loading ? "Loading..." : "Rs 0.00",
        },
        {
          title: "ACCOUNTS RECEIVABLE",
          value: loading ? "Loading..." : "Rs 0.00",
        },
        {
          title: "ACCOUNTS PAYABLE",
          value: loading ? "Loading..." : "Rs 0.00",
        },
      ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {financialData.map((card, index) => (
        <FinancialCard key={index} title={card.title} value={card.value} />
      ))}
    </div>
  );
}

