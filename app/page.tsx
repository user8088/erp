"use client";

import { useState } from "react";
import ShortcutsSection from "./components/Dashboard/ShortcutsSection";
import ReportsSection from "./components/Dashboard/ReportsSection";
import DashboardPeriodFilter, {
  DashboardPeriodState,
} from "./components/Dashboard/DashboardPeriodFilter";
import FinancialSummary from "./components/Accounting/FinancialSummary";
import SellingSummary from "./components/Dashboard/SellingSummary";
import SellingChartsPanelHome from "./components/Selling/SellingChartsPanelHome";
import StockSummary from "./components/Dashboard/StockSummary";
import CustomerSummary from "./components/Dashboard/CustomerSummary";
import StaffSummary from "./components/Dashboard/StaffSummary";
import RentalSummary from "./components/Dashboard/RentalSummary";
import TransportSummary from "./components/Dashboard/TransportSummary";

export default function StoreDashboard() {
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriodState>({
    period: "current_month",
  });

  return (
    <div className="max-w-7xl mx-auto min-h-full space-y-6 px-3 sm:px-4 lg:px-0 pb-10">
      <DashboardPeriodFilter
        value={dashboardPeriod}
        onChange={setDashboardPeriod}
      />
      <div className="space-y-8">
        {/* Accounting overview row */}
        <FinancialSummary period={dashboardPeriod} />

        {/* Selling overview row */}
        <SellingSummary period={dashboardPeriod} />

        {/* Sales charts row */}
        <SellingChartsPanelHome period={dashboardPeriod} />

        {/* Stock overview row */}
        <StockSummary />

        {/* Customers, Staff, Rentals each in their own full-width row */}
        <CustomerSummary />
        <StaffSummary />
        <RentalSummary />

        {/* Transport overview row */}
        <TransportSummary />
      </div>
      <ShortcutsSection />
      <ReportsSection />
    </div>
  );
}
