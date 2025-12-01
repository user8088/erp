import StaffShortcuts from "../components/Staff/StaffShortcuts";
import StaffReports from "../components/Staff/StaffReports";

export default function StaffPage() {
  return (
    <div className="max-w-7xl mx-auto min-h-full">
      <StaffShortcuts />
      <StaffReports />
    </div>
  );
}

