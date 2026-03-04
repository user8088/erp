"use client";

import { useState, useEffect } from "react";
import FinancialCard from "./FinancialCard";
import { financialReportsApi } from "../../lib/apiClient";
import { formatCurrencyPkr } from "../../lib/format";
import { useToast } from "../ui/ToastProvider";
import { DashboardPeriodState } from "../Dashboard/DashboardPeriodFilter";

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

interface FinancialSummaryProps {
  period?: DashboardPeriodState;
  companyId?: number;
}

export default function FinancialSummary({
  period,
  companyId = 1,
}: FinancialSummaryProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FinancialSummaryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters: {
          company_id: number;
          period?: "current_month" | "current_year" | "all_time";
          start_date?: string;
          end_date?: string;
        } = {
          company_id: companyId,
        };

        if (period) {
          if (period.period === "custom") {
            if (period.start_date) {
              filters.start_date = period.start_date;
            }
            if (period.end_date) {
              filters.end_date = period.end_date;
            }
          } else {
            filters.period = period.period;
          }
        } else {
          filters.period = "current_month";
        }

        const summaryData = await financialReportsApi.getFinancialSummary(
          filters
        );
        setSummary(summaryData);
      } catch (e) {
        console.error("Failed to fetch financial summary:", e);
        const errorMessage =
          e instanceof Error ? e.message : "Failed to load financial summary";
        setError(errorMessage);
        // Don't show toast for initial load errors, just log
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [companyId, period?.period, period?.start_date, period?.end_date]);

  const financialData = summary
    ? [
        {
          title: "TOTAL INCOME",
          value: formatCurrencyPkr(summary.summary.total_income),
        },
        {
          title: "TOTAL EXPENSES",
          value: formatCurrencyPkr(summary.summary.total_expenses),
        },
        {
          title: "ACCOUNTS RECEIVABLE",
          value: formatCurrencyPkr(summary.summary.accounts_receivable),
        },
        {
          title: "ACCOUNTS PAYABLE",
          value: formatCurrencyPkr(summary.summary.accounts_payable),
        },
      ]
    : [
        {
          title: "TOTAL INCOME",
          value: loading ? "Loading..." : formatCurrencyPkr(0),
        },
        {
          title: "TOTAL EXPENSES",
          value: loading ? "Loading..." : formatCurrencyPkr(0),
        },
        {
          title: "ACCOUNTS RECEIVABLE",
          value: loading ? "Loading..." : formatCurrencyPkr(0),
        },
        {
          title: "ACCOUNTS PAYABLE",
          value: loading ? "Loading..." : formatCurrencyPkr(0),
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

