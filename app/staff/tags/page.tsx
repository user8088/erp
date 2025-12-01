"use client";

import { useState, useEffect } from "react";
import { Tag as TagIcon, Plus, Trash2 } from "lucide-react";
import { useToast } from "../../components/ui/ToastProvider";

interface Tag {
  id: string;
  name: string;
  color: string;
}

const STORAGE_KEY = "erp_tags";

function loadTags(): Tag[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t: any) =>
        t && typeof t.id === "string" && typeof t.name === "string" && typeof t.color === "string"
    );
  } catch {
    return [];
  }
}

function saveTags(tags: Tag[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  } catch {
    // ignore
  }
}

export default function TagManagerPage() {
  const { addToast } = useToast();
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#f97316");

  useEffect(() => {
    setTags(loadTags());
  }, []);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    const id = trimmed.toLowerCase().replace(/\s+/g, "_");
    const updated: Tag[] = [
      ...tags.filter((t) => t.id !== id),
      { id, name: trimmed, color: newColor },
    ];
    setTags(updated);
    saveTags(updated);
    addToast("Tag saved.", "success");
    setNewName("");
  };

  const handleDelete = (id: string) => {
    const updated = tags.filter((t) => t.id !== id);
    setTags(updated);
    saveTags(updated);
    addToast("Tag deleted.", "success");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 pb-4 border-b border-gray-200 flex items-center gap-2">
        <TagIcon className="w-5 h-5 text-gray-700" />
        <h1 className="text-xl font-semibold text-gray-900">Tag Manager</h1>
      </div>

      {/* New Tag Form */}
      <form onSubmit={handleAddTag} className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Create / Edit Tag</h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Manager, Probation, VIP"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-10 border border-gray-300 rounded-md p-1"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Save Tag</span>
          </button>
        </div>
      </form>

      {/* Tags Table */}
      <div className="bg-white border border-gray-200 rounded-lg">
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
                    onClick={() => {
                      setNewName(tag.name);
                      setNewColor(tag.color);
                    }}
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
            {tags.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500">
                  No tags created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


