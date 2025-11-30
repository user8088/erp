"use client";

import FinancialCard from "./FinancialCard";

const financialData = [
  {
    title: "TOTAL OUTGOING BILLS",
    value: "Rs 20.00 K",
  },
  {
    title: "TOTAL INCOMING BILLS",
    value: "Rs 3.49 L",
  },
  {
    title: "TOTAL INCOMING PAYMENT",
    value: "Rs 0.00",
  },
  {
    title: "TOTAL OUTGOING PAYMENT",
    value: "Rs 1.65 L",
  },
];

export default function FinancialSummary() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {financialData.map((card, index) => (
        <FinancialCard key={index} title={card.title} value={card.value} />
      ))}
    </div>
  );
}

