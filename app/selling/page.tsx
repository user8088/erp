import SellingChartsPanel from "../components/Selling/SellingChartsPanel";
import SellingQuickAccess from "../components/Selling/SellingQuickAccess";
import SellingReports from "../components/Selling/SellingReports";

export default function SellingPage() {
  return (
    <div className="max-w-7xl mx-auto min-h-full space-y-6 px-3 sm:px-4 lg:px-0 pb-8">
      <SellingChartsPanel />
      <SellingQuickAccess />
      <SellingReports />
    </div>
  );
}

