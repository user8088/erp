"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { vehiclesApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Vehicle, VehicleMaintenance, VehicleMaintenanceStatistics } from "../../lib/types";

interface VehicleMaintenanceProps {
  vehicleId: string;
  vehicle: Vehicle | null;
}

export default function VehicleMaintenance({ vehicleId, vehicle }: VehicleMaintenanceProps) {
  const { addToast } = useToast();
  const [maintenanceRecords, setMaintenanceRecords] = useState<VehicleMaintenance[]>([]);
  const [statistics, setStatistics] = useState<VehicleMaintenanceStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VehicleMaintenance | null>(null);
  const [formData, setFormData] = useState({
    type: "",
    description: "",
    amount: "",
    maintenance_date: "",
    notes: "",
  });

  useEffect(() => {
    loadMaintenance();
    loadStatistics();
  }, [vehicleId]);

  const loadMaintenance = async () => {
    setLoading(true);
    try {
      const data = await vehiclesApi.getVehicleMaintenance(Number(vehicleId), {
        per_page: 100,
        sort_order: "desc",
      });
      setMaintenanceRecords(data.data);
    } catch (e) {
      console.error(e);
      addToast("Failed to load maintenance records.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await vehiclesApi.getMaintenanceStatistics(Number(vehicleId));
      setStatistics(stats);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdd = () => {
    setEditingRecord(null);
    setFormData({
      type: "",
      description: "",
      amount: "",
      maintenance_date: new Date().toISOString().split('T')[0],
      notes: "",
    });
    setShowModal(true);
  };

  const handleEdit = (record: VehicleMaintenance) => {
    setEditingRecord(record);
    setFormData({
      type: record.type,
      description: record.description || "",
      amount: String(record.amount),
      maintenance_date: record.maintenance_date,
      notes: record.notes || "",
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;
    
    try {
      await vehiclesApi.deleteMaintenanceRecord(Number(vehicleId), id);
      addToast("Maintenance record deleted successfully.", "success");
      loadMaintenance();
      loadStatistics();
    } catch (e) {
      console.error(e);
      addToast("Failed to delete maintenance record.", "error");
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        type: formData.type,
        description: formData.description || null,
        amount: Number(formData.amount),
        maintenance_date: formData.maintenance_date,
        notes: formData.notes || null,
      };

      if (editingRecord) {
        await vehiclesApi.updateMaintenanceRecord(Number(vehicleId), editingRecord.id, payload);
        addToast("Maintenance record updated successfully.", "success");
      } else {
        await vehiclesApi.createMaintenanceRecord(Number(vehicleId), payload);
        addToast("Maintenance record created successfully.", "success");
      }

      setShowModal(false);
      loadMaintenance();
      loadStatistics();
    } catch (e) {
      console.error(e);
      addToast("Failed to save maintenance record.", "error");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Maintenance Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Maintenance Costs</p>
              <p className="text-2xl font-semibold text-gray-900">{formatCurrency(statistics.total_maintenance_costs)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-semibold text-gray-900">{statistics.total_records}</p>
            </div>
          </div>
          {Object.keys(statistics.maintenance_by_type).length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">By Type:</p>
              <div className="space-y-2">
                {Object.entries(statistics.maintenance_by_type).map(([type, data]) => (
                  <div key={type} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 capitalize">{type}:</span>
                    <span className="font-medium text-gray-900">
                      {data.count} records - {formatCurrency(data.total_amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Maintenance Records */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Maintenance Records</h3>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Maintenance
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500 py-4">Loading maintenance records...</div>
        ) : maintenanceRecords.length === 0 ? (
          <div className="text-sm text-gray-500 py-4">No maintenance records found.</div>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {maintenanceRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(record.maintenance_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 capitalize">{record.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.description || "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatCurrency(record.amount)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(record)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRecord ? "Edit Maintenance Record" : "Add Maintenance Record"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., repair, service, fuel"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.maintenance_date}
                  onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

