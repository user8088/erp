import ShortcutsSection from "./components/Dashboard/ShortcutsSection";
import ReportsSection from "./components/Dashboard/ReportsSection";

export default function StoreDashboard() {
  return (
    <div className="max-w-7xl mx-auto min-h-full">
      <ShortcutsSection />
      <ReportsSection />
    </div>
  );
}
