"use client";

interface PaymentStatusBadgeProps {
  status: "paid" | "partially_paid" | "late" | "unpaid";
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const colors = {
    paid: "bg-green-100 text-green-800",
    partially_paid: "bg-yellow-100 text-yellow-800",
    late: "bg-red-100 text-red-800",
    unpaid: "bg-gray-100 text-gray-800",
  };

  const labels = {
    paid: "Paid",
    partially_paid: "Partially Paid",
    late: "Late",
    unpaid: "Unpaid",
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

