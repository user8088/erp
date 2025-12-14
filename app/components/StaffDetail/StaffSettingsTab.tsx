"use client";

import { useState, useEffect } from "react";
import { Calendar, Tag, Settings as SettingsIcon, X, Plus } from "lucide-react";
import { staffApi } from "../../lib/apiClient";
import type { StaffMember } from "../../lib/types";
import { useToast } from "../ui/ToastProvider";

interface StaffSettingsTabProps {
  staff: StaffMember;
  onStaffUpdated?: (staff: StaffMember) => void;
  onSavingChange?: (saving: boolean) => void;
}

export default function StaffSettingsTab({
  staff,
  onStaffUpdated,
  onSavingChange,
}: StaffSettingsTabProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [nextPayDate, setNextPayDate] = useState(
    staff.next_pay_date || ""
  );
  const [tags, setTags] = useState<string[]>(staff.tags || []);
  const [newTag, setNewTag] = useState("");
  const [metadata, setMetadata] = useState<string>(
    JSON.stringify(staff.metadata || {}, null, 2)
  );
  const [metadataError, setMetadataError] = useState<string>("");

  useEffect(() => {
    setNextPayDate(staff.next_pay_date || "");
    setTags(staff.tags || []);
    setMetadata(JSON.stringify(staff.metadata || {}, null, 2));
  }, [staff]);

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setSaving(true);
    onSavingChange?.(true);
    setMetadataError("");

    try {
      // Validate metadata JSON
      let parsedMetadata = {};
      if (metadata.trim()) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          setMetadataError("Invalid JSON format");
          return;
        }
      }

      const payload: {
        next_pay_date?: string | null;
        tags?: string[];
        metadata?: Record<string, unknown>;
      } = {};

      if (nextPayDate !== (staff.next_pay_date || "")) {
        payload.next_pay_date = nextPayDate || null;
      }

      if (JSON.stringify(tags.sort()) !== JSON.stringify((staff.tags || []).sort())) {
        payload.tags = tags;
      }

      if (JSON.stringify(parsedMetadata) !== JSON.stringify(staff.metadata || {})) {
        payload.metadata = parsedMetadata;
      }

      if (Object.keys(payload).length === 0) {
        addToast("No changes to save.", "info");
        return;
      }

      const updated = await staffApi.update(staff.id, payload);
      
      // Handle response - API might return { staff: StaffMember } or StaffMember directly
      const updatedStaff = 'staff' in updated ? updated.staff : updated;
      
      onStaffUpdated?.(updatedStaff);
      addToast("Settings updated successfully.", "success");
    } catch (e) {
      console.error("Failed to update settings:", e);
      const errorMessage =
        e && typeof e === "object" && "message" in e
          ? String((e as { message: unknown }).message)
          : "Failed to update settings.";
      addToast(errorMessage, "error");
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
            <p className="text-sm text-gray-500">
              Configure salary cycle, tags, and custom metadata
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Next Pay Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                Next Pay Date
              </div>
            </label>
            <input
              type="date"
              value={nextPayDate}
              onChange={(e) => setNextPayDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Manually override the next salary payment date. If not set, it will be
              automatically calculated (1 month after last payment).
            </p>
            {staff.last_paid_on && (
              <p className="text-xs text-gray-400 mt-1">
                Last paid: {staff.last_paid_on} • Auto-calculated would be:{" "}
                {(() => {
                  const lastPaid = new Date(staff.last_paid_on);
                  lastPaid.setMonth(lastPaid.getMonth() + 1);
                  return lastPaid.toISOString().split("T")[0];
                })()}
              </p>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-gray-500" />
                Tags
              </div>
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag (e.g., senior, sales, remote)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No tags added yet</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Tags help categorize and filter staff members (e.g., "senior", "sales",
              "remote", "fulltime").
            </p>
          </div>

          {/* Metadata */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Metadata (JSON)
            </label>
            <textarea
              value={metadata}
              onChange={(e) => {
                setMetadata(e.target.value);
                setMetadataError("");
              }}
              rows={8}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs ${
                metadataError ? "border-red-300" : "border-gray-300"
              }`}
              placeholder='{\n  "custom_field": "value",\n  "notes": "Additional information"\n}'
            />
            {metadataError && (
              <p className="text-xs text-red-600 mt-1">{metadataError}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Store custom JSON data for this staff member. Must be valid JSON format.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

