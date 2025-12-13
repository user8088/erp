"use client";

import { useState } from "react";
import type { StaffMember } from "../../lib/types";

interface StaffDetailsFormProps {
  staff: StaffMember;
  onChange?: (staff: StaffMember) => void;
}

export default function StaffDetailsForm({ staff, onChange }: StaffDetailsFormProps) {
  const [local, setLocal] = useState(staff);

  const update = <K extends keyof StaffMember>(key: K, value: StaffMember[K]) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange?.(next);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Full Name"
          value={local.full_name}
          onChange={(v) => update("full_name", v)}
        />
        <Field
          label="Designation"
          value={local.designation ?? ""}
          onChange={(v) => update("designation", v)}
        />
        <Field
          label="Department"
          value={local.department ?? ""}
          onChange={(v) => update("department", v)}
        />
        <Field
          label="Phone"
          value={local.phone ?? ""}
          onChange={(v) => update("phone", v)}
        />
        <Field
          label="Email"
          value={local.email ?? ""}
          onChange={(v) => update("email", v)}
        />
        <Field
          label="Monthly Salary"
          value={local.monthly_salary ? String(local.monthly_salary) : ""}
          onChange={(v) =>
            update("monthly_salary", v ? Number(v) : null)
          }
        />
        <Field
          label="Next Pay Date"
          value={local.next_pay_date ?? ""}
          onChange={(v) => update("next_pay_date", v)}
          type="date"
        />
        <Field
          label="Date of Joining"
          value={local.date_of_joining ?? ""}
          onChange={(v) => update("date_of_joining", v)}
          type="date"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>
  );
}

