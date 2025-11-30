import StockKPICard from "./StockKPICard";

const kpiData = [
  {
    title: "TOTAL STOCK VALUE",
    value: "95.390 K",
  },
  {
    title: "TOTAL WAREHOUSES",
    value: "5",
  },
  {
    title: "TOTAL ACTIVE ITEMS",
    value: "10",
  },
];

export default function StockKPIs() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {kpiData.map((kpi, index) => (
        <StockKPICard key={index} title={kpi.title} value={kpi.value} />
      ))}
    </div>
  );
}

