"use client";

import { useState, useEffect, useCallback } from "react";
import ItemDetailTabs from "./ItemDetailTabs";
import ItemDetailsForm from "./ItemDetailsForm";
import SalesAnalyticsChart from "./SalesAnalyticsChart";
import StockAnalyticsChart from "./StockAnalyticsChart";
import { stockApi, stockMovementsApi, itemsApi } from "../../lib/apiClient";
import { useToast } from "../ui/ToastProvider";
import type { Item, ItemStock, StockMovement, ItemSale } from "../../lib/types";
import { Package, TrendingUp, TrendingDown, RefreshCw, Calendar, ShoppingCart, User, DollarSign } from "lucide-react";

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
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState("item-details");
  const [stock, setStock] = useState<ItemStock | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [itemSales, setItemSales] = useState<ItemSale[]>([]);
  const [salesSummary, setSalesSummary] = useState<{ total_quantity_sold: number; total_sales_revenue: number } | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);

  const fetchStockInfo = useCallback(async () => {
    if (!itemId) return;

    setLoadingStock(true);
    try {
      const response = await stockApi.getItemStock(Number(itemId));
      setStock(response.stock);
    } catch (error) {
      console.error("Failed to fetch stock:", error);
      setStock(null);
    } finally {
      setLoadingStock(false);
    }
  }, [itemId]);

  const fetchStockMovements = useCallback(async () => {
    if (!itemId) return;

    setLoadingMovements(true);
    try {
      const response = await stockMovementsApi.getStockMovements({
        item_id: Number(itemId),
        per_page: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setStockMovements(response.data);
    } catch (error) {
      console.error("Failed to fetch stock movements:", error);
      setStockMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [itemId]);

  const fetchItemSales = useCallback(async () => {
    if (!itemId) return;

    setLoadingSales(true);
    try {
      const response = await itemsApi.getItemSales(Number(itemId), {
        per_page: 50,
      });
      setItemSales(response.data);
      if (response.summary) {
        setSalesSummary(response.summary);
      }
    } catch (error) {
      console.error("Failed to fetch item sales:", error);
      setItemSales([]);
    } finally {
      setLoadingSales(false);
    }
  }, [itemId]);

  useEffect(() => {
    if (activeTab === "stock-info") {
      fetchStockInfo();
      fetchStockMovements();
    } else if (activeTab === "sales-history") {
      fetchItemSales();
    }
  }, [activeTab, fetchStockInfo, fetchStockMovements, fetchItemSales]);

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
                    {item?.last_purchase_price !== null && item?.last_purchase_price !== undefined ? (
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
                    {item?.lowest_purchase_price !== null && item?.lowest_purchase_price !== undefined ? (
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
                    {item?.highest_purchase_price !== null && item?.highest_purchase_price !== undefined ? (
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

                {/* Total Quantity Sold */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Quantity Sold
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    {salesSummary?.total_quantity_sold !== undefined ? (
                      <>{salesSummary.total_quantity_sold.toLocaleString()} {item?.primary_unit || 'units'}</>
                    ) : item?.total_quantity_sold !== undefined ? (
                      <>{item.total_quantity_sold.toLocaleString()} {item?.primary_unit || 'units'}</>
                    ) : (
                      <span className="text-gray-400">0 {item?.primary_unit || 'units'}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total volume sold to date</p>
                </div>

                {/* Total Sales Revenue */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Sales Revenue
                  </label>
                  <div className="text-2xl font-bold text-gray-900">
                    {salesSummary?.total_sales_revenue !== undefined ? (
                      <>PKR {salesSummary.total_sales_revenue.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</>
                    ) : (
                      <span className="text-gray-400">PKR 0.00</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Gross revenue from this item</p>
                </div>
              </div>

              {/* Price Range Analysis */}
              {item && item.lowest_purchase_price !== null && item.highest_purchase_price !== null && (
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

            {/* Sales Analytics Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <SalesAnalyticsChart itemId={Number(itemId)} />
            </div>

            {/* Sales Records */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">Sales History</h2>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Showing all recorded sales
                </div>
              </div>

              {loadingSales ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm">Loading sales records...</p>
                </div>
              ) : itemSales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sale #</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {itemSales.map((sale) => (
                        <tr key={`${sale.sale_id}-${sale.id}`} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">
                                {new Date(sale.sale_date).toLocaleDateString()}
                              </span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-orange-600 whitespace-nowrap font-medium">
                            {sale.sale_number}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-500" />
                              </div>
                              <span className="font-medium truncate max-w-[150px]">{sale.customer_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900 font-semibold">
                            {sale.quantity.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal uppercase">{sale.unit}</span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600">
                            PKR {sale.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-500">
                            {sale.discount_amount > 0 ? (
                              <>-PKR {sale.discount_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                            PKR {sale.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ShoppingCart className="w-8 h-8 text-gray-300" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">No sales records found</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
                    Sales records will appear here as soon as this item is included in a completed sale.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === "stock-info" && (
          <div className="space-y-6">
            {/* Stock Details Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Stock Information</h2>

              {loadingStock ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Loading stock information...</p>
                </div>
              ) : stock ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Current Stock */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Stock
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor(stock.quantity_on_hand).toLocaleString()} {item?.primary_unit || 'units'}
                    </div>
                    {item?.secondary_unit && item?.conversion_rate && (
                      <p className="text-xs text-gray-500 mt-1">
                        ({Math.floor(stock.quantity_on_hand * item.conversion_rate).toLocaleString()} {item.secondary_unit})
                      </p>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Status
                    </label>
                    <div className="mt-1">
                      {(() => {
                        const quantity = Number(stock.quantity_on_hand);
                        const reorderLevel = Number(stock.reorder_level);
                        let status: 'in_stock' | 'low_stock' | 'out_of_stock';
                        if (quantity === 0 || quantity < 0) {
                          status = 'out_of_stock';
                        } else if (quantity > 0 && quantity <= reorderLevel) {
                          status = 'low_stock';
                        } else {
                          status = 'in_stock';
                        }

                        const styles = {
                          in_stock: "bg-green-100 text-green-800 border-green-200",
                          low_stock: "bg-yellow-100 text-yellow-800 border-yellow-200",
                          out_of_stock: "bg-red-100 text-red-800 border-red-200",
                        };

                        const labels = {
                          in_stock: "In Stock",
                          low_stock: "Low Stock",
                          out_of_stock: "Out of Stock",
                        };

                        return (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status === 'in_stock' ? 'bg-green-500' : status === 'low_stock' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                            {labels[status]}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Reorder Level */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      {Math.floor(stock.reorder_level).toLocaleString()} {item?.primary_unit || 'units'}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Minimum stock level before reordering</p>
                  </div>

                  {/* Stock Value */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Value
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      PKR {stock.stock_value.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Total value at selling price</p>
                  </div>

                  {/* Last Restocked */}
                  {stock.last_restocked_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Restocked
                      </label>
                      <div className="text-sm text-gray-900">
                        {new Date(stock.last_restocked_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No stock record found for this item.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Stock information will appear here once inventory is tracked.
                  </p>
                </div>
              )}
            </div>

            {/* Stock Analytics Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <StockAnalyticsChart itemId={Number(itemId)} />
            </div>

            {/* Stock Movements */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Stock Movements</h2>

              {loadingMovements ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Loading stock movements...</p>
                </div>
              ) : stockMovements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date & Time</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Quantity Change</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Previous Stock</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">New Stock</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reference</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Performed By</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stockMovements.map((movement) => {
                        const getMovementIcon = (type: StockMovement['movement_type'], quantity: number) => {
                          if (type === 'adjustment') {
                            return <RefreshCw className="w-4 h-4" />;
                          }
                          return quantity > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
                        };

                        const getMovementColor = (type: StockMovement['movement_type'], quantity: number) => {
                          if (type === 'adjustment') {
                            return 'text-blue-600 bg-blue-50';
                          }
                          return quantity > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
                        };

                        const getMovementLabel = (type: StockMovement['movement_type']) => {
                          const labels = {
                            purchase: "Purchase",
                            sale: "Sale",
                            adjustment: "Adjustment",
                            return: "Return",
                          };
                          return labels[type];
                        };

                        const quantity = Number(movement.quantity);
                        const previousStock = Number(movement.previous_stock);
                        const newStock = Number(movement.new_stock);

                        return (
                          <tr key={movement.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {new Date(movement.created_at).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getMovementColor(movement.movement_type, quantity)}`}>
                                {getMovementIcon(movement.movement_type, quantity)}
                                {getMovementLabel(movement.movement_type)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap text-right">
                              <span className={`font-semibold ${quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {quantity > 0 ? '+' : ''}{Math.floor(quantity).toLocaleString()} {item?.primary_unit || 'units'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap text-right">
                              {Math.floor(previousStock).toLocaleString()} {item?.primary_unit || 'units'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-semibold">
                              {Math.floor(newStock).toLocaleString()} {item?.primary_unit || 'units'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {movement.reference_type && movement.reference_id ? (
                                <span className="font-mono text-xs">
                                  {movement.reference_type}-{movement.reference_id}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {movement.performed_by_name || `User #${movement.performed_by}`}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                              {movement.notes || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm">No stock movements found.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Stock movements will appear here when inventory changes occur.
                  </p>
                </div>
              )}
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
