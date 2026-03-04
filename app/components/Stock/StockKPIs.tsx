import { useEffect, useState } from "react";
import StockKPICard from "./StockKPICard";
import { stockApi } from "../../lib/apiClient";
import { formatCurrencyPkr } from "../../lib/format";

interface StockKPI {
  title: string;
  value: string;
}

export default function StockKPIs() {
  const [kpis, setKpis] = useState<StockKPI[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKpis = async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await stockApi.getCategoryStockValueSummary();
        const totalValue = summary.summary.total_value;
        const totalCategories = summary.summary.total_categories;
        const totalItems = summary.summary.total_items;

        setKpis([
          {
            title: "TOTAL STOCK VALUE",
            value: formatCurrencyPkr(totalValue),
          },
          {
            title: "TOTAL CATEGORIES",
            value: `${totalCategories}`,
          },
          {
            title: "TOTAL ACTIVE ITEMS",
            value: `${totalItems}`,
          },
        ]);
      } catch (err) {
        console.error("Failed to load stock KPIs:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load stock KPIs";
        setError(message);
        setKpis([]);
      } finally {
        setLoading(false);
      }
    };

    fetchKpis();
  }, []);

  const displayData: StockKPI[] =
    kpis.length > 0
      ? kpis
      : [
          {
            title: "TOTAL STOCK VALUE",
            value: loading ? "Loading..." : formatCurrencyPkr(0),
          },
          {
            title: "TOTAL CATEGORIES",
            value: loading ? "Loading..." : "0",
          },
          {
            title: "TOTAL ACTIVE ITEMS",
            value: loading ? "Loading..." : "0",
          },
        ];

  return (
    <div className="mb-6">
      {error && (
        <p className="text-xs text-red-500 mb-2">
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayData.map((kpi) => (
          <StockKPICard key={kpi.title} title={kpi.title} value={kpi.value} />
        ))}
      </div>
    </div>
  );
}

