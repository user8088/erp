import ProfitLossChart from "../components/Accounting/ProfitLossChart";
import FinancialSummary from "../components/Accounting/FinancialSummary";
import AccountingShortcuts from "../components/Accounting/AccountingShortcuts";
import AccountingReports from "../components/Accounting/AccountingReports";

export default function AccountingPage() {
  return (
    <div className="max-w-7xl mx-auto min-h-full">
      <ProfitLossChart />
      <FinancialSummary />
      <AccountingShortcuts />
      <AccountingReports />
    </div>
  );
}

