import ReceivablesShortcuts from "../../components/Receivables/ReceivablesShortcuts";
import ReceivablesReports from "../../components/Receivables/ReceivablesReports";
import ReceivablesReportsList from "../../components/Receivables/ReceivablesReportsList";

export default function ReceivablesPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      <ReceivablesShortcuts />
      <ReceivablesReports />
      <ReceivablesReportsList />
    </div>
  );
}

