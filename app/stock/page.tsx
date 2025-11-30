import StockKPIs from "../components/Stock/StockKPIs";
import WarehouseStockChart from "../components/Stock/WarehouseStockChart";
import StockQuickAccess from "../components/Stock/StockQuickAccess";
import StockReports from "../components/Stock/StockReports";
import StockAdditionalReports from "../components/Stock/StockAdditionalReports";

export default function StockPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      <WarehouseStockChart />
      <StockKPIs />
      <StockQuickAccess />
      <StockReports />
      <StockAdditionalReports />
    </div>
  );
}

