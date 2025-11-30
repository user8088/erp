import { ArrowRight } from "lucide-react";
import Link from "next/link";

const settings = [
  { label: "Import Data", href: "/import-data" },
  { label: "Opening Invoice Creation Tool", href: "/opening-invoice-tool" },
  { label: "Chart of Accounts Importer", href: "/chart-of-accounts-importer" },
  { label: "Letter Head", href: "/letter-head" },
  { label: "Email Account", href: "/email-account" },
];

export default function SettingsSection() {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Data Import and Settings</h2>
      <div className="space-y-2">
        {settings.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors group"
          >
            <span className="text-sm text-gray-700">{item.label}</span>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  );
}

