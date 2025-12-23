"use client";

import { useState, useEffect } from "react";
import { Tag as TagIcon, Plus, Trash2 } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";
import { customerTagsApi } from "../../lib/apiClient";
import type { CustomerTag } from "../../lib/types";

export default function CustomerTagManagerPage() {
  const { addToast } = useToast();
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#f97316");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  const loadTags = async () => {
    try {
      setLoading(true);
      const response = await customerTagsApi.getTags({ per_page: 100 });
      setTags(response.data);
    } catch (error) {
      console.error("Failed to load tags:", error);
      addToast("Failed to load tags.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTags();
  }, []);

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      if (editingTagId) {
        // Update existing tag
        const response = await customerTagsApi.updateTag(editingTagId, {
          name: trimmed,
          color: newColor,
        });
        setTags(tags.map(t => t.id === editingTagId ? response.tag : t));
        addToast(response.message, "success");
        setEditingTagId(null);
      } else {
        // Create new tag
        const response = await customerTagsApi.createTag({
          name: trimmed,
          color: newColor,
        });
        setTags([...tags, response.tag]);
        addToast(response.message, "success");
      }
      setNewName("");
      setNewColor("#f97316");
    } catch (error: unknown) {
      console.error("Failed to save tag:", error);
      let errorMessage = "Failed to save tag.";
      if (error && typeof error === "object" && "data" in error) {
        const errorData = (error as { data?: { errors?: { name?: string[] }; message?: string } }).data;
        errorMessage = errorData?.errors?.name?.[0] || errorData?.message || errorMessage;
      }
      addToast(errorMessage, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tag: CustomerTag) => {
    setNewName(tag.name);
    setNewColor(tag.color);
    setEditingTagId(tag.id);
  };

  const handleCancelEdit = () => {
    setNewName("");
    setNewColor("#f97316");
    setEditingTagId(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this tag? It will be removed from all customers.")) {
      return;
    }

    try {
      const response = await customerTagsApi.deleteTag(id);
      setTags(tags.filter((t) => t.id !== id));
      addToast(response.message, "success");
    } catch (error) {
      console.error("Failed to delete tag:", error);
      addToast("Failed to delete tag.", "error");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center gap-2">
        <TagIcon className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-semibold text-gray-900">Customer Tag Manager</h1>
      </div>

      {/* New Tag Form */}
      <form onSubmit={handleAddTag} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">
          {editingTagId ? "Edit Tag" : "Create Tag"}
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. VIP, Regular, Corporate, Wholesale"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded-md p-1"
              disabled={saving}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? "Saving..." : editingTagId ? "Update Tag" : "Save Tag"}</span>
          </button>
          {editingTagId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Tags Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
        {loading ? (
          <div className="px-4 py-8 text-center text-gray-500">
            Loading tags...
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Tag</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">Color</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((tag) => (
                <tr key={tag.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-800">{tag.name}</td>
                  <td className="px-4 py-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${tag.color}1A`, color: tag.color }}
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-1"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.color.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleEdit(tag)}
                      className="text-sm text-blue-600 hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.id)}
                      className="text-sm text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {tags.length === 0 && !loading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                    No tags created yet. Create your first customer tag above!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

