import { ArrowRight } from "lucide-react";
import Link from "next/link";

const reports = {
  salaryManagement: [
    { label: "Staff Salary", href: "/staff/salary" },
    { label: "Staff Advance", href: "/staff/advance" },
    { label: "Salary Reports", href: "/staff/salary-reports" },
  ],
  shiftManagement: [
    { label: "Attendance", href: "/staff/attendance" },
    { label: "Attendance Reports", href: "/staff/attendance-reports" },
  ],
};

export default function StaffReports() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Reports & Masters</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Salary Management</h3>
          <ul className="space-y-1.5">
            {reports.salaryManagement.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Shift Management</h3>
          <ul className="space-y-1.5">
            {reports.shiftManagement.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-gray-900 transition-colors group py-1"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

