"use client";

import StockKPIs from "../Stock/StockKPIs";
import CategoryStockChart from "../Stock/WarehouseStockChart";

export default function StockSummary() {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Stock Overview</h2>
      </div>
      <StockKPIs />
      <CategoryStockChart />
    </section>
  );
}

