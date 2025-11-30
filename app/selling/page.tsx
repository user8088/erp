import SalesOrderTrendsChart from "../components/Selling/SalesOrderTrendsChart";
import SellingQuickAccess from "../components/Selling/SellingQuickAccess";
import SellingReports from "../components/Selling/SellingReports";
import SellingAdditionalSections from "../components/Selling/SellingAdditionalSections";

export default function SellingPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      <SalesOrderTrendsChart />
      <SellingQuickAccess />
      <SellingReports />
      <div className="mt-8">
        <SellingAdditionalSections />
      </div>
    </div>
  );
}

