"use client";

import type { DashboardPeriodState } from "../Dashboard/DashboardPeriodFilter";
import SellingChartsPanel from "./SellingChartsPanel";

interface SellingChartsPanelHomeProps {
  period: DashboardPeriodState;
}

export default function SellingChartsPanelHome({
  period,
}: SellingChartsPanelHomeProps) {
  return <SellingChartsPanel period={period} compact />;
}

