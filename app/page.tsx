import ShortcutsSection from "./components/Dashboard/ShortcutsSection";
import ReportsSection from "./components/Dashboard/ReportsSection";
import SettingsSection from "./components/Dashboard/SettingsSection";

export default function StoreDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto min-h-full">
      <ShortcutsSection />
      <ReportsSection />
      <SettingsSection />
    </div>
  );
}
