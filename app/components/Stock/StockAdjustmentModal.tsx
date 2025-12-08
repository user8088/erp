"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Item } from "../../lib/types";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  currentStock: number;
  onSave: (quantity: number, notes: string) => Promise<void>;
}

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  item,
  currentStock,
  onSave,
}: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract'>('add');
  const [quantity, setQuantity] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<'primary' | 'secondary'>('primary');
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdjustmentType('add');
      setQuantity("");
      setSelectedUnit('primary');
      setNotes("");
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0 || !item) return;

    let quantityInPrimaryUnit = Number(quantity);
    
    // Convert secondary unit to primary unit if needed
    if (selectedUnit === 'secondary' && item.secondary_unit && item.conversion_rate) {
      quantityInPrimaryUnit = Number(quantity) / item.conversion_rate;
    }

    const adjustmentQuantity = adjustmentType === 'add' ? quantityInPrimaryUnit : -quantityInPrimaryUnit;
    
    setLoading(true);
    try {
      await onSave(adjustmentQuantity, notes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  // Calculate new stock based on selected unit
  let quantityInPrimaryUnit = Number(quantity) || 0;
  if (selectedUnit === 'secondary' && item.secondary_unit && item.conversion_rate) {
    quantityInPrimaryUnit = quantityInPrimaryUnit / item.conversion_rate;
  }

  const newStock = adjustmentType === 'add' 
    ? currentStock + quantityInPrimaryUnit
    : currentStock - quantityInPrimaryUnit;

  const secondaryStock = item.secondary_unit && item.conversion_rate 
    ? currentStock * item.conversion_rate 
    : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Adjust Stock</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Item Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-500 mt-1">Serial: {item.serial_number}</p>
            <div className="text-sm text-gray-700 mt-2">
              <p>Current Stock: <span className="font-semibold">{currentStock} {item.primary_unit}</span></p>
              {secondaryStock && (
                <p className="text-xs text-gray-500 mt-0.5">
                  ({secondaryStock.toFixed(2)} {item.secondary_unit})
                </p>
              )}
            </div>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adjustment Type
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setAdjustmentType('add')}
                className={`flex-1 px-4 py-2 rounded-md border-2 font-medium transition-colors ${
                  adjustmentType === 'add'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Add Stock
              </button>
              <button
                type="button"
                onClick={() => setAdjustmentType('subtract')}
                className={`flex-1 px-4 py-2 rounded-md border-2 font-medium transition-colors ${
                  adjustmentType === 'subtract'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                }`}
              >
                Remove Stock
              </button>
            </div>
          </div>

          {/* Unit Selection */}
          {item.secondary_unit && item.conversion_rate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Unit
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedUnit('primary')}
                  className={`flex-1 px-4 py-2 rounded-md border-2 font-medium transition-colors ${
                    selectedUnit === 'primary'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {item.primary_unit}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUnit('secondary')}
                  className={`flex-1 px-4 py-2 rounded-md border-2 font-medium transition-colors ${
                    selectedUnit === 'secondary'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {item.secondary_unit}
                </button>
              </div>
              {item.conversion_rate && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  1 {item.primary_unit} = {item.conversion_rate} {item.secondary_unit}
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity ({selectedUnit === 'primary' ? item.primary_unit : (item.secondary_unit || item.primary_unit)})
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder={`Enter quantity in ${selectedUnit === 'primary' ? item.primary_unit : (item.secondary_unit || item.primary_unit)}`}
              required
            />
          </div>

          {/* New Stock Preview */}
          {quantity && Number(quantity) > 0 && (
            <div className={`p-3 rounded-lg ${newStock < 0 ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
              <p className="text-sm font-medium text-gray-700">
                New Stock Level: <span className={`text-lg font-bold ${newStock < 0 ? 'text-red-600' : 'text-blue-600'}`}>
                  {newStock.toFixed(2)} {item.primary_unit}
                </span>
              </p>
              {item.secondary_unit && item.conversion_rate && (
                <p className="text-xs text-gray-600 mt-1">
                  ({(newStock * item.conversion_rate).toFixed(2)} {item.secondary_unit})
                </p>
              )}
              {newStock < 0 && (
                <p className="text-xs text-red-600 mt-1">Warning: Stock cannot be negative!</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Reason for adjustment..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !quantity || Number(quantity) <= 0 || newStock < 0}
              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
