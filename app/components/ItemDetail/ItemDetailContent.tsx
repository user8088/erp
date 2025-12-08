"use client";

import { useState } from "react";
import ItemDetailTabs from "./ItemDetailTabs";
import ItemDetailsForm from "./ItemDetailsForm";
import type { Item } from "../../lib/types";

interface ItemDetailContentProps {
  itemId: string;
  item: Item | null;
  onItemChange: (item: Item) => void;
  saveSignal?: number;
  onSavingChange?: (saving: boolean) => void;
}

export default function ItemDetailContent({
  itemId,
  item,
  onItemChange,
  saveSignal,
  onSavingChange,
}: ItemDetailContentProps) {
  const [activeTab, setActiveTab] = useState("item-details");

  return (
    <div className="flex-1">
      <ItemDetailTabs activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="mt-4">
        {activeTab === "item-details" && (
          <ItemDetailsForm
            itemId={itemId}
            item={item}
            onItemUpdated={onItemChange}
            externalSaveSignal={saveSignal}
            onSavingChange={onSavingChange}
          />
        )}
        {activeTab === "sales-history" && (
          <div className="space-y-6">
            {/* Price Summary Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Pricing & Profit</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Last Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Purchase Price
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    {item?.last_purchase_price !== null ? (
                      <>PKR {item.last_purchase_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Most recent purchase price</p>
                </div>

                {/* Total Profit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Profit
                  </label>
                  <div className={`text-2xl font-bold ${(item?.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    PKR {item?.total_profit.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }) || "0.00"}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cumulative profit from sales</p>
                </div>

                {/* Lowest Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lowest Purchase Price
                  </label>
                  <div className="text-2xl font-bold text-green-600">
                    {item?.lowest_purchase_price !== null ? (
                      <>PKR {item.lowest_purchase_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Best deal ever recorded</p>
                </div>

                {/* Highest Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Highest Purchase Price
                  </label>
                  <div className="text-2xl font-bold text-orange-600">
                    {item?.highest_purchase_price !== null ? (
                      <>PKR {item.highest_purchase_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Highest price ever paid</p>
                </div>
              </div>

              {/* Price Range Analysis */}
              {item?.lowest_purchase_price !== null && item?.highest_purchase_price !== null && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Price Range</p>
                      <p className="text-xs text-gray-500">Difference between highest and lowest</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        PKR {(item.highest_purchase_price - item.lowest_purchase_price).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(((item.highest_purchase_price - item.lowest_purchase_price) / item.lowest_purchase_price) * 100).toFixed(1)}% variation
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sales Records */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Sales Records</h2>
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No sales records found for this item.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Sales records will appear here when available.
                </p>
              </div>
            </div>
          </div>
        )}
        {activeTab === "stock-info" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Stock Information</h2>
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">Stock information not available yet.</p>
              <p className="text-xs mt-1 text-gray-400">
                This section will show inventory levels, stock movements, and warehouse locations.
              </p>
            </div>
          </div>
        )}
        {activeTab === "settings" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Item Settings</h2>
            <p className="text-sm text-gray-500">Item-specific settings will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
