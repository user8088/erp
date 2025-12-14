"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient, staffApi, ApiError } from "../../../lib/apiClient";
import type { User, Role, Paginated } from "../../../lib/types";
import { useToast } from "../../../components/ui/ToastProvider";

export default function NewUserPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get("staff_id");
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    username: "",
    firstName: "",
    middleName: "",
    lastName: "",
    language: "en",
    timeZone: "Asia/Karachi",
    password: "",
    passwordConfirmation: "",
  });
  const [saving, setSaving] = useState(false);
  const [staffInfo, setStaffInfo] = useState<{ name: string; email?: string } | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  useEffect(() => {
    if (staffId) {
      const loadStaff = async () => {
        try {
          const staff = await staffApi.get(Number(staffId));
          setStaffInfo({ name: staff.full_name, email: staff.email || undefined });
          // Pre-fill form with staff info
          setFormData(prev => ({
            ...prev,
            firstName: staff.full_name.split(" ")[0] || "",
            lastName: staff.full_name.split(" ").slice(1).join(" ") || "",
            email: staff.email || "",
          }));
        } catch (e) {
          console.error("Failed to load staff info:", e);
        }
      };
      void loadStaff();
    }
  }, [staffId]);

  // Load available roles
  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await apiClient.get<Paginated<Role>>("/roles", { per_page: 100 });
        setRoles(res.data || []);
      } catch (e) {
        console.error("Failed to load roles:", e);
        addToast("Failed to load roles.", "error");
      } finally {
        setLoadingRoles(false);
      }
    };
    void loadRoles();
  }, [addToast]);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email || !formData.firstName || !formData.password) {
      addToast("Email, First Name and Password are required.", "error");
      return;
    }

    if (staffId && selectedRoleIds.length === 0) {
      addToast("Please select at least one role.", "error");
      return;
    }

    if (!validateEmail(formData.email)) {
      addToast("Please enter a valid email address.", "error");
      return;
    }

    if (formData.password.length < 8) {
      addToast("Password must be at least 8 characters long.", "error");
      return;
    }

    if (formData.password !== formData.passwordConfirmation) {
      addToast("Password and confirmation do not match.", "error");
      return;
    }

    setSaving(true);
    try {
      if (staffId) {
        // Create user from staff using staff API
        await staffApi.createUser(Number(staffId), {
          email: formData.email,
          password: formData.password,
          password_confirmation: formData.passwordConfirmation,
          full_name: [formData.firstName, formData.middleName, formData.lastName].filter(Boolean).join(" "),
          role_ids: selectedRoleIds,
          phone: undefined,
        });
        addToast("ERP user created and linked to staff member successfully.", "success");
        router.push(`/staff/members/${staffId}`);
      } else {
        // Create regular user
        const res = await apiClient.post<{ user: User }>("/users", {
          email: formData.email,
          username: formData.username || null,
          first_name: formData.firstName,
          middle_name: formData.middleName || null,
          last_name: formData.lastName || null,
          language: formData.language,
          time_zone: formData.timeZone,
          status: "active",
          password: formData.password,
          role_ids: [],
        });
        addToast("User created successfully.", "success");
        router.push(`/staff/users/${res.user.id}`);
      }
    } catch (e) {
      console.error(e);
      if (e instanceof ApiError) {
        // Handle specific error messages
        if (e.status === 422) {
          const errorData = e.data as { message?: string; errors?: Record<string, string[]> };
          if (errorData.errors) {
            const firstError = Object.values(errorData.errors).flat()[0];
            addToast(firstError || "Validation failed", "error");
          } else {
            addToast(errorData.message || "Validation failed", "error");
          }
        } else if (e.status === 409) {
          addToast("This email is already registered. Please use a different email.", "error");
        } else {
          addToast(e.message || "Failed to create user.", "error");
        }
      } else {
        const message =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: unknown }).message)
            : "Failed to create user.";
        addToast(message, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto min-h-full">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {staffId ? "Create ERP User from Staff" : "New User"}
          </h1>
          {staffInfo && (
            <p className="text-sm text-gray-600 mt-1">
              Creating user for staff: {staffInfo.name}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Middle Name
            </label>
            <input
              type="text"
              value={formData.middleName}
              onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.passwordConfirmation}
              onChange={(e) => setFormData({ ...formData, passwordConfirmation: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Zone
            </label>
            <input
              type="text"
              value={formData.timeZone}
              onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Role Selection - Only show when creating user from staff */}
        {staffId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Roles <span className="text-red-500">*</span>
            </label>
            {loadingRoles ? (
              <p className="text-sm text-gray-500">Loading roles...</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles available. Please create roles first.</p>
            ) : (
              <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-gray-50">
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(Number(role.id))}
                        onChange={(e) => {
                          const roleId = Number(role.id);
                          if (e.target.checked) {
                            setSelectedRoleIds([...selectedRoleIds, roleId]);
                          } else {
                            setSelectedRoleIds(selectedRoleIds.filter((id) => id !== roleId));
                          }
                        }}
                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{role.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {selectedRoleIds.length === 0 && !loadingRoles && roles.length > 0 && (
              <p className="text-xs text-red-500 mt-1">Please select at least one role</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create User"}
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


