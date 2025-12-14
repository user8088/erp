import SalesOrderTrendsChart from "../components/Selling/SalesOrderTrendsChart";
import SellingQuickAccess from "../components/Selling/SellingQuickAccess";
import SellingReports from "../components/Selling/SellingReports";

export default function SellingPage() {
  return (
    <div className="max-w-7xl mx-auto min-h-full">
      <SalesOrderTrendsChart />
      <SellingQuickAccess />
      <SellingReports />
    </div>
  );
}

