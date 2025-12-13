"use client";

interface StatusBadgeProps {
  status: "available" | "rented" | "maintenance" | "active" | "completed" | "returned" | "overdue";
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors = {
    available: "bg-green-100 text-green-800",
    rented: "bg-orange-100 text-orange-800",
    maintenance: "bg-yellow-100 text-yellow-800",
    active: "bg-blue-100 text-blue-800",
    completed: "bg-gray-100 text-gray-800",
    returned: "bg-green-100 text-green-800",
    overdue: "bg-red-100 text-red-800",
  };

  const labels = {
    available: "Available",
    rented: "Rented",
    maintenance: "Maintenance",
    active: "Active",
    completed: "Completed",
    returned: "Returned",
    overdue: "Overdue",
  };

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

