"use client";

import { useState } from "react";
import { Plus, RefreshCw, Edit, Trash2, Filter, X } from "lucide-react";
import { useRentalCategoriesList, invalidateRentalCategoriesCache } from "../../components/Rentals/RentalCategories/useRentalCategoriesList";
import { rentalApi } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import type { RentalCategory } from "../../lib/types";

export default function RentalCategoriesPage() {
  const {
    categories,
    page,
    perPage,
    total,
    loading,
    error,
    setPage,
    setPerPage,
    filters,
    setFilters,
  } = useRentalCategoriesList();
  
  const { addToast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RentalCategory | null>(null);
  const [formData, setFormData] = useState({ name: "", serial_alias: "", description: "", status: "active" as "active" | "inactive" });
  const [saving, setSaving] = useState(false);

  const handleRefresh = () => {
    invalidateRentalCategoriesCache();
    setPage(1);
  };

  const handleAdd = () => {
    setFormData({ name: "", serial_alias: "", description: "", status: "active" });
    setEditingCategory(null);
    setShowAddModal(true);
  };

  const handleEdit = (category: RentalCategory) => {
    setFormData({ 
      name: category.name, 
      serial_alias: category.serial_alias || "",
      description: category.description || "",
      status: category.status,
    });
    setEditingCategory(category);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast("Category name is required.", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        serial_alias: formData.serial_alias.trim().toUpperCase() || null,
        description: formData.description.trim() || null,
        status: formData.status,
      };

      if (editingCategory) {
        await rentalApi.updateCategory(editingCategory.id, payload);
        addToast("Rental category updated successfully.", "success");
      } else {
        await rentalApi.createCategory(payload);
        addToast("Rental category created successfully.", "success");
      }

      invalidateRentalCategoriesCache();
      setPage(1);
      setShowAddModal(false);
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object" && "data" in e) {
        const errorData = (e as { data: unknown }).data;
        if (errorData && typeof errorData === "object" && "errors" in errorData) {
          const backendErrors = (errorData as { errors: Record<string, string[]> }).errors;
          const firstError = Object.values(backendErrors)[0]?.[0];
          if (firstError) {
            addToast(firstError, "error");
            return;
          }
        }
      }
      
      addToast(`Failed to ${editingCategory ? "update" : "create"} rental category.`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this rental category?")) {
      return;
    }
    try {
      await rentalApi.deleteCategory(id);
      addToast("Rental category deleted successfully.", "success");
      invalidateRentalCategoriesCache();
      setPage(1);
    } catch (e: unknown) {
      console.error(e);
      
      if (e && typeof e === "object") {
        if ("data" in e) {
          const errorData = (e as { data: unknown }).data;
          if (errorData && typeof errorData === "object" && "error" in errorData) {
            const errorMessage = (errorData as { error: string }).error;
            addToast(errorMessage, "error");
            return;
          }
        }
      }
      
      addToast("Failed to delete rental category.", "error");
    }
  };

  const lastPage = Math.ceil(total / perPage);
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(page * perPage, total);

  return (
    <div className="max-w-full mx-auto min-h-full">
      {/* Action Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm text-gray-700"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {filters.search && (
              <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                1
              </span>
            )}
          </button>
          {filters.search && (
            <button
              onClick={() => setFilters({})}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              aria-label="Clear filters"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <input
            type="text"
            placeholder="Search categories..."
            value={filters.search || ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 min-w-[300px]"
          />
        </div>
      )}

      {error && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Categories Table */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading && categories.length === 0 && (
          <div className="px-4 py-3 text-sm text-gray-500">Loading rental categories...</div>
        )}
        <table className="w-full min-w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category Name</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Category Code/Alias</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Description</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Created</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => {
              return (
                <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap font-medium">
                    {category.name}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {category.serial_alias ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-mono font-semibold">
                        {category.serial_alias}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      category.status === "active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-gray-100 text-gray-800"
                    }`}>
                      {category.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {category.description || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {new Date(category.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && categories.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-sm text-gray-500 text-center"
                >
                  No rental categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {start} to {end} of {total} categories
          </div>
          <div className="flex items-center gap-3">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Previous
              </button>
              <span className="px-3 text-sm text-gray-600">
                Page {page} of {lastPage}
              </span>
              <button
                type="button"
                disabled={page >= lastPage}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? "Edit Rental Category" : "New Rental Category"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="e.g., Construction Equipment"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Code / Serial Alias
                </label>
                <input
                  type="text"
                  value={formData.serial_alias}
                  onChange={(e) => setFormData({ ...formData, serial_alias: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                  placeholder="e.g., CE"
                  maxLength={10}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Uppercase alphanumeric only. Used for SKU generation (e.g., CE-000001)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

