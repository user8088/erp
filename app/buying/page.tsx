import PurchaseOrderTrendsChart from "../components/Buying/PurchaseOrderTrendsChart";
import BuyingShortcuts from "../components/Buying/BuyingShortcuts";
import BuyingReports from "../components/Buying/BuyingReports";

export default function BuyingPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      <PurchaseOrderTrendsChart />
      <BuyingShortcuts />
      <BuyingReports />
    </div>
  );
}

