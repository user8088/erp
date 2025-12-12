"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { staffApi } from "../../../lib/apiClient";
import { useToast } from "../../../components/ui/ToastProvider";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "on_leave", label: "On Leave" },
  { value: "inactive", label: "Inactive" },
];

export default function NewStaffPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: "",
    full_name: "",
    designation: "",
    department: "",
    phone: "",
    email: "",
    status: "active",
    date_of_joining: "",
    monthly_salary: "",
  });

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      addToast("Full name is required.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code || undefined,
        full_name: form.full_name.trim(),
        designation: form.designation || "Staff",
        department: form.department || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        status: form.status as "active" | "on_leave" | "inactive",
        date_of_joining: form.date_of_joining || undefined,
        monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : null,
      };
      const res = await staffApi.create(payload);
      addToast("Staff created.", "success");
      const id =
        (res as { staff?: { id?: string | number } }).staff?.id ??
        (res as { id?: string | number }).id;
      if (id) {
        router.push(`/staff/members/${id}`);
      } else {
        router.push("/staff/members");
      }
    } catch (e) {
      console.error(e);
      addToast("Failed to create staff.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">New Staff</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Code"
            value={form.code}
            onChange={(v) => handleChange("code", v)}
            placeholder="STF-001"
          />
          <Field
            label="Full Name *"
            value={form.full_name}
            onChange={(v) => handleChange("full_name", v)}
            placeholder="Jane Doe"
          />
          <Field
            label="Designation"
            value={form.designation}
            onChange={(v) => handleChange("designation", v)}
            placeholder="Accountant"
          />
          <Field
            label="Department"
            value={form.department}
            onChange={(v) => handleChange("department", v)}
            placeholder="Finance"
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(v) => handleChange("phone", v)}
            placeholder="0300-0000000"
          />
          <Field
            label="Email"
            value={form.email}
            onChange={(v) => handleChange("email", v)}
            type="email"
            placeholder="user@example.com"
          />
          <Field
            label="Date of Joining"
            value={form.date_of_joining}
            onChange={(v) => handleChange("date_of_joining", v)}
            type="date"
          />
          <Field
            label="Monthly Salary"
            value={form.monthly_salary}
            onChange={(v) => handleChange("monthly_salary", v)}
            type="number"
            placeholder="60000"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Staff"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
      />
    </div>
  );
}

