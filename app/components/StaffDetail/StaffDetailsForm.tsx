"use client";

import { useState, useEffect } from "react";
import type { StaffMember } from "../../lib/types";
import { staffApi, ApiError } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";

interface StaffDetailsFormProps {
  staff: StaffMember;
  onChange?: (staff: StaffMember) => void;
  saveSignal?: number;
  onStaffUpdated?: (staff: StaffMember) => void;
  onSavingChange?: (saving: boolean) => void;
}

export default function StaffDetailsForm({ 
  staff, 
  onChange,
  saveSignal,
  onStaffUpdated,
  onSavingChange,
}: StaffDetailsFormProps) {
  const { addToast } = useToast();
  const [local, setLocal] = useState(staff);

  // Sync local state when staff prop changes
  useEffect(() => {
    setLocal(staff);
  }, [staff]);

  // Handle save signal from parent
  useEffect(() => {
    if (saveSignal && saveSignal > 0) {
      void handleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  const handleSave = async () => {
    if (!staff) return;
    onSavingChange?.(true);
    try {
      const payload = {
        full_name: local.full_name,
        designation: local.designation || null,
        department: local.department || null,
        phone: local.phone || null,
        email: local.email || null,
        monthly_salary: local.monthly_salary || null,
        next_pay_date: local.next_pay_date || null,
        date_of_joining: local.date_of_joining || null,
        status: staff.status, // Keep existing status
      };

      const response = await staffApi.update(staff.id, payload);
      // API returns { staff: StaffMember } according to type, but backend might return directly
      // Handle both cases for safety
      let updatedStaff: StaffMember;
      if ('staff' in response && response.staff) {
        updatedStaff = response.staff;
      } else if ('id' in response && response.id) {
        updatedStaff = response as unknown as StaffMember;
      } else {
        throw new Error("Invalid response from server");
      }
      
      setLocal(updatedStaff);
      onStaffUpdated?.(updatedStaff);
      onChange?.(updatedStaff);
      
      addToast("Staff member updated successfully.", "success");
    } catch (e) {
      console.error("Failed to update staff:", e);
      
      // Handle validation errors from backend
      if (e instanceof ApiError) {
        if (e.status === 422 && e.data && typeof e.data === "object" && "errors" in e.data) {
          const backendErrors = (e.data as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
          } else {
            addToast("Failed to update staff member. Please check the form.", "error");
          }
        } else {
          addToast(e.message || "Failed to update staff member.", "error");
        }
      } else {
        addToast("Failed to update staff member. Please try again.", "error");
      }
    } finally {
      onSavingChange?.(false);
    }
  };

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

