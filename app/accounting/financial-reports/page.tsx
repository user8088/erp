import FinancialReportsSections from "../../components/FinancialReports/FinancialReportsSections";
import OtherReports from "../../components/FinancialReports/OtherReports";

export default function FinancialReportsPage() {
  return (
    <div className="max-w-7xl mx-auto min-h-full">
      <FinancialReportsSections />
      <OtherReports />
    </div>
  );
}

