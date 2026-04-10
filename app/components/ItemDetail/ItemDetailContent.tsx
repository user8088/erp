"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ItemDetailTabs from "./ItemDetailTabs";
import ItemDetailsForm from "./ItemDetailsForm";
import SalesAnalyticsChart from "./SalesAnalyticsChart";
import StockAnalyticsChart from "./StockAnalyticsChart";
import { stockApi, stockMovementsApi, itemsApi, invoicesApi, purchaseOrdersApi } from "../../lib/apiClient";
import type { Item, ItemStock, StockMovement, ItemSale, ItemBatchHistoryEntry } from "../../lib/types";
import { Package, TrendingUp, TrendingDown, RefreshCw, Calendar, ShoppingCart, User, Eye, Download, DollarSign, Search } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useToast } from "../ui/ToastProvider";

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
  const [stock, setStock] = useState<ItemStock | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [itemSales, setItemSales] = useState<ItemSale[]>([]);
  const [salesSummary, setSalesSummary] = useState<{ total_quantity_sold: number; total_sales_revenue: number } | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingSales, setLoadingSales] = useState(false);
  const [batchHistory, setBatchHistory] = useState<ItemBatchHistoryEntry[]>([]);
  const [loadingBatchHistory, setLoadingBatchHistory] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const { addToast } = useToast();

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

  const fetchBatchHistory = useCallback(async () => {
    if (!itemId) return;

    setLoadingBatchHistory(true);
    try {
      const response = await itemsApi.getItemBatches(Number(itemId), {
        per_page: 100,
      });
      setBatchHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch item batch history:", error);
      setBatchHistory([]);
    } finally {
      setLoadingBatchHistory(false);
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

  const handleDownloadInvoice = useCallback(async (invoiceId?: number, poId?: number) => {
    try {
      let blob: Blob | null = null;
      let filename = "supplier-invoice";

      if (invoiceId) {
        blob = await invoicesApi.downloadInvoice(invoiceId);
        filename = `supplier-invoice-${invoiceId}`;
      } else if (poId) {
        blob = await purchaseOrdersApi.downloadSupplierInvoiceAttachment(poId);
        filename = `supplier-invoice-attachment-${poId}`;
      }

      if (!blob) {
        addToast("No invoice available for download", "error");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      addToast("Failed to download supplier invoice", "error");
    }
  }, [addToast]);

  const handlePreviewInvoice = useCallback(async (invoiceId?: number, poId?: number) => {
    try {
      let blob: Blob | null = null;

      if (invoiceId) {
        blob = await invoicesApi.downloadInvoice(invoiceId);
      } else if (poId) {
        blob = await purchaseOrdersApi.downloadSupplierInvoiceAttachment(poId);
      }

      if (!blob) {
        addToast("No invoice available for preview", "error");
        return;
      }

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      addToast("Failed to preview supplier invoice", "error");
    }
  }, [addToast]);

  useEffect(() => {
    if (activeTab === "stock-info") {
      fetchStockInfo();
      fetchStockMovements();
      fetchBatchHistory();
    } else if (activeTab === "sales-history") {
      fetchItemSales();
      fetchBatchHistory();
    } else if (activeTab === "supplier-costs") {
      fetchBatchHistory();
      fetchItemSales();
    }
  }, [activeTab, fetchStockInfo, fetchStockMovements, fetchBatchHistory, fetchItemSales]);

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

            {/* Batch Sales Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base font-semibold text-gray-900">Batch Sales Breakdown</h2>
                <div className="text-xs text-gray-500">
                  Sold and returned quantities by stock batch
                </div>
              </div>

              {loadingBatchHistory ? (
                <div className="text-center py-10 text-gray-500">
                  <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm">Loading batch sales data...</p>
                </div>
              ) : batchHistory.filter((batch) => batch.quantities.sold_qty > 0 || batch.quantities.returned_qty > 0).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">PO / Supplier</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Sold Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Returned Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Net Sold</th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue Basis</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {batchHistory
                        .filter((batch) => batch.quantities.sold_qty > 0 || batch.quantities.returned_qty > 0)
                        .map((batch) => (
                          <tr key={batch.batch_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                              <div className="font-medium text-gray-900">#{batch.batch_id}</div>
                              <div className="text-[11px] text-gray-500">
                                {batch.received_at ? new Date(batch.received_at).toLocaleDateString() : "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="font-medium text-gray-900">{batch.purchase_order?.po_number || "—"}</div>
                              <div className="text-[11px] text-gray-500">
                                {batch.purchase_order?.supplier_name || batch.purchase_order?.supplier?.name || "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                              {batch.quantities.sold_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-700">
                              {batch.quantities.returned_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-green-700">
                              {batch.quantities.net_sold_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 whitespace-nowrap">
                              PKR{" "}
                              {(batch.quantities.net_sold_qty * batch.costing.unit_cost).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">No batch sales found</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Batch-level sold and returned quantities will show here after completed sales.
                  </p>
                </div>
              )}
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

            {/* Stock Batches Queue */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Stock Batch Details</h2>

              {loadingBatchHistory ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">Loading batch information...</p>
                </div>
              ) : batchHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Purchase Context</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Purchased</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Remaining</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Consumed</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Sold</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Net Sold</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Cost</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {batchHistory.map((batch, index) => {
                        const isCurrentActive = batch.status === "active" && index === 0;
                        return (
                          <tr key={batch.batch_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              <div className="font-medium">#{batch.batch_id}</div>
                              <div className="text-[11px] text-gray-500">
                                {batch.received_at
                                  ? new Date(batch.received_at).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : "—"}
                              </div>
                              {isCurrentActive && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-100 text-indigo-800">
                                  Current batch
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              <div className="font-medium text-gray-900">
                                PO: {batch.purchase_order?.po_number || "—"}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                Supplier: {batch.purchase_order?.supplier_name || batch.purchase_order?.supplier?.name || "—"}
                              </div>
                              <div className="text-[11px] text-gray-500">
                                Invoice: {batch.supplier_invoice?.invoice_number || "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                              {batch.quantities.purchased_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                              {batch.quantities.remaining_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                              {batch.quantities.consumed_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                              {batch.quantities.sold_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right font-semibold text-green-700">
                              {batch.quantities.net_sold_qty.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item?.primary_unit || "units"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-right">
                              PKR{" "}
                              {batch.costing.unit_cost.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  batch.status === "active"
                                    ? "bg-green-100 text-green-800"
                                    : batch.status === "depleted"
                                    ? "bg-gray-100 text-gray-700"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {batch.status === "active"
                                  ? "Active"
                                  : batch.status === "depleted"
                                  ? "Depleted"
                                  : "Cancelled"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : stock && stock.quantity_on_hand > 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No batch-tracked lots found for this item.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    This item currently has legacy aggregate stock only. New receipts will appear here as batches.
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No batches found for this item.</p>
                  <p className="text-xs mt-1 text-gray-400">
                    Batches will appear here once stock is received using the new batch-based system.
                  </p>
                </div>
              )}
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
        {activeTab === "supplier-costs" && (
          <div className="space-y-6">
            {(loadingBatchHistory || loadingSales) ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center py-12 text-gray-500">
                <div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-sm">Loading supplier cost data...</p>
              </div>
            ) : batchHistory.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm">No purchase batches found for this item.</p>
                <p className="text-xs mt-1 text-gray-400">
                  Supplier cost data will appear once this item is received through purchase orders.
                </p>
              </div>
            ) : (() => {
              const catalogPrice = item?.selling_price ?? null;
              const actualTotalRevenue = salesSummary?.total_sales_revenue ?? null;
              const actualTotalQtySold = salesSummary?.total_quantity_sold ?? null;
              const actualAvgSellPrice =
                actualTotalRevenue != null && actualTotalQtySold != null && actualTotalQtySold > 0
                  ? actualTotalRevenue / actualTotalQtySold
                  : null;
              const effectiveSellPrice = actualAvgSellPrice ?? catalogPrice;
              const usesActualSales = actualAvgSellPrice != null;

              const batchRows = batchHistory.map(batch => {
                const unitCost = batch.costing.unit_cost;
                const totalCost = batch.costing.total_cost;
                const qtyPurchased = batch.quantities.purchased_qty;
                const qtySold = batch.quantities.net_sold_qty;
                const qtyRemaining = batch.quantities.remaining_qty;

                const hasRealRevenue = batch.revenue != null && batch.revenue.total_revenue > 0;
                const batchRevenue = hasRealRevenue
                  ? batch.revenue!.total_revenue
                  : (effectiveSellPrice != null ? qtySold * effectiveSellPrice : null);
                const batchProfit = hasRealRevenue
                  ? batch.revenue!.profit
                  : (batchRevenue != null ? batchRevenue - (qtySold * unitCost) : null);
                const marginPct = hasRealRevenue
                  ? batch.revenue!.margin_pct
                  : (batchRevenue && batchRevenue > 0 ? ((batchProfit ?? 0) / batchRevenue) * 100 : null);
                const profitPerUnit = qtySold > 0 && batchProfit != null
                  ? batchProfit / qtySold
                  : (effectiveSellPrice != null ? effectiveSellPrice - unitCost : null);

                const supplierName =
                  batch.purchase_order?.supplier_name ||
                  batch.purchase_order?.supplier?.name ||
                  null;

                const invoiceNumber = batch.supplier_invoice?.invoice_number || null;
                const invoiceId = batch.supplier_invoice?.id || undefined;
                const hasPdf = Boolean(batch.supplier_invoice?.pdf_path);
                const poId = batch.purchase_order?.id || undefined;

                return {
                  batchId: batch.batch_id,
                  status: batch.status,
                  receivedAt: batch.received_at,
                  poNumber: batch.purchase_order?.po_number || null,
                  poId,
                  supplierName,
                  invoiceNumber,
                  invoiceId,
                  hasPdf,
                  unitCost,
                  totalCost,
                  qtyPurchased,
                  qtySold,
                  qtyRemaining,
                  batchRevenue,
                  batchProfit,
                  profitPerUnit,
                  marginPct,
                  hasRealRevenue,
                };
              });

              const totalCostAll = batchRows.reduce((s, r) => s + r.totalCost, 0);
              const totalQtyPurchased = batchRows.reduce((s, r) => s + r.qtyPurchased, 0);
              const totalQtySold = batchRows.reduce((s, r) => s + r.qtySold, 0);
              const anyBatchHasRealRevenue = batchRows.some(r => r.hasRealRevenue);
              const allBatchesHaveRealRevenue = batchRows.every(r => r.hasRealRevenue || r.qtySold === 0);
              const totalRevenueDisplay = anyBatchHasRealRevenue
                ? batchRows.reduce((s, r) => s + (r.batchRevenue ?? 0), 0)
                : usesActualSales
                  ? actualTotalRevenue!
                  : (effectiveSellPrice != null ? batchRows.reduce((s, r) => s + (r.batchRevenue ?? 0), 0) : null);
              const totalProfitDisplay = anyBatchHasRealRevenue
                ? batchRows.reduce((s, r) => s + (r.batchProfit ?? 0), 0)
                : (totalRevenueDisplay != null ? totalRevenueDisplay - batchRows.reduce((s, r) => s + r.qtySold * r.unitCost, 0) : null);
              const overallMargin =
                totalRevenueDisplay && totalRevenueDisplay > 0
                  ? ((totalProfitDisplay ?? 0) / totalRevenueDisplay) * 100
                  : null;

              const bySupplier = batchRows.reduce((acc, r) => {
                const key = r.supplierName || "Unknown";
                const existing = acc.get(key);
                if (existing) {
                  existing.totalCost += r.totalCost;
                  existing.totalQty += r.qtyPurchased;
                  existing.batchCount += 1;
                  existing.avgUnitCost = existing.totalCost / existing.totalQty;
                } else {
                  acc.set(key, {
                    totalCost: r.totalCost,
                    totalQty: r.qtyPurchased,
                    batchCount: 1,
                    avgUnitCost: r.unitCost,
                  });
                }
                return acc;
              }, new Map<string, { totalCost: number; totalQty: number; batchCount: number; avgUnitCost: number }>());

              const formatPKR = (n: number) =>
                `PKR ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

              return (
                <>
                  {/* Summary Cards */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-4">Cost & Profit Overview</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-orange-700 mb-1">
                          {usesActualSales ? "Avg Actual Sell Price" : "Catalog Sell Price"}
                        </p>
                        <p className="text-xl font-bold text-orange-900">
                          {effectiveSellPrice != null ? `${formatPKR(effectiveSellPrice)}/${item?.primary_unit || "unit"}` : "Not set"}
                        </p>
                        {effectiveSellPrice != null && totalQtyPurchased > 0 && (
                          <p className="text-[10px] text-orange-600 mt-1">
                            {usesActualSales && catalogPrice != null
                              ? `Catalog: ${formatPKR(catalogPrice)} · Actual avg: ${formatPKR(effectiveSellPrice)}`
                              : `Avg cost ${formatPKR(totalCostAll / totalQtyPurchased)}/unit · Spread ${formatPKR(effectiveSellPrice - (totalCostAll / totalQtyPurchased))}/unit`}
                          </p>
                        )}
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-red-700 mb-1">Total Purchase Cost</p>
                        <p className="text-xl font-bold text-red-900">{formatPKR(totalCostAll)}</p>
                        <p className="text-[10px] text-red-600 mt-1">
                          {totalQtyPurchased.toLocaleString()} {item?.primary_unit || "units"} across {batchRows.length} batch{batchRows.length !== 1 ? "es" : ""}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-blue-700 mb-1">
                          {anyBatchHasRealRevenue ? "Actual Revenue (Sold)" : usesActualSales ? "Actual Revenue (Sold)" : "Estimated Revenue (Sold)"}
                        </p>
                        <p className="text-xl font-bold text-blue-900">
                          {totalRevenueDisplay != null ? formatPKR(totalRevenueDisplay) : "—"}
                        </p>
                        <p className="text-[10px] text-blue-600 mt-1">
                          {anyBatchHasRealRevenue
                            ? `${totalQtySold.toLocaleString()} ${item?.primary_unit || "units"} sold · From batch-level actuals`
                            : usesActualSales
                              ? `${(actualTotalQtySold ?? 0).toLocaleString()} ${item?.primary_unit || "units"} sold · From sales records`
                              : effectiveSellPrice != null
                                ? `${totalQtySold.toLocaleString()} ${item?.primary_unit || "units"} sold @ ${formatPKR(effectiveSellPrice)}/unit`
                                : "No sales data yet"}
                        </p>
                      </div>
                      <div className={`border rounded-lg p-4 ${
                        totalProfitDisplay == null ? "bg-gray-50 border-gray-200" :
                        totalProfitDisplay >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                      }`}>
                        <p className={`text-xs font-medium mb-1 ${
                          totalProfitDisplay == null ? "text-gray-700" :
                          totalProfitDisplay >= 0 ? "text-green-700" : "text-red-700"
                        }`}>
                          {(anyBatchHasRealRevenue || usesActualSales) ? "" : "Est. "}{totalProfitDisplay != null && totalProfitDisplay < 0 ? "Loss" : "Profit"} (Sold)
                        </p>
                        <p className={`text-xl font-bold ${
                          totalProfitDisplay == null ? "text-gray-400" :
                          totalProfitDisplay >= 0 ? "text-green-900" : "text-red-900"
                        }`}>
                          {totalProfitDisplay != null ? formatPKR(Math.abs(totalProfitDisplay)) : "—"}
                        </p>
                        {effectiveSellPrice == null && !anyBatchHasRealRevenue && (
                          <p className="text-[10px] text-gray-500 mt-1">No sales or selling price data</p>
                        )}
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-xs font-medium text-gray-700 mb-1">Overall Margin</p>
                        <p className={`text-xl font-bold ${
                          overallMargin == null ? "text-gray-400" :
                          overallMargin >= 0 ? "text-green-900" : "text-red-900"
                        }`}>
                          {overallMargin != null ? `${overallMargin.toFixed(1)}%` : "—"}
                        </p>
                        {effectiveSellPrice != null && (
                          <p className="text-[10px] text-gray-500 mt-1">
                            Avg cost {formatPKR(totalCostAll / totalQtyPurchased)}/unit vs sell {formatPKR(effectiveSellPrice)}/unit
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Profit & Loss Chart */}
                  {batchRows.length > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-900">Profit & Loss Trend</h3>
                        <p className="text-xs text-gray-500 mt-0.5">Cost vs revenue per batch with cumulative profit trajectory</p>
                      </div>
                      {(() => {
                        let cumCost = 0;
                        let cumRevenue = 0;
                        let cumProfit = 0;
                        const chartData = [...batchRows]
                          .sort((a, b) => {
                            if (!a.receivedAt && !b.receivedAt) return 0;
                            if (!a.receivedAt) return -1;
                            if (!b.receivedAt) return 1;
                            return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
                          })
                          .map((row) => {
                            cumCost += row.totalCost;
                            cumRevenue += row.batchRevenue ?? 0;
                            cumProfit += row.batchProfit ?? 0;
                            return {
                              name: `#${row.batchId}`,
                              date: row.receivedAt ? new Date(row.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : `#${row.batchId}`,
                              cost: row.totalCost,
                              revenue: row.batchRevenue ?? 0,
                              profit: row.batchProfit ?? 0,
                              cumCost,
                              cumRevenue,
                              cumProfit,
                            };
                          });

                        const formatAxis = (value: number) =>
                          value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value);

                        const PnLTooltip = ({ active, payload, label }: any) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm min-w-[200px]">
                                <p className="font-semibold text-gray-800 mb-2 border-b pb-1.5">Batch {label}</p>
                                {payload.map((entry: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between gap-4 mb-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-gray-600 text-xs">{entry.name}</span>
                                    </div>
                                    <span className={`font-medium text-xs ${
                                      entry.name.includes("Profit") && Number(entry.value) < 0 ? "text-red-600" : "text-gray-900"
                                    }`}>
                                      PKR {Number(entry.value).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        };

                        return (
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                  dataKey="date"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: "#6B7280", fontSize: 11 }}
                                  dy={8}
                                />
                                <YAxis
                                  yAxisId="left"
                                  orientation="left"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: "#6B7280", fontSize: 11 }}
                                  tickFormatter={formatAxis}
                                />
                                <YAxis
                                  yAxisId="right"
                                  orientation="right"
                                  axisLine={false}
                                  tickLine={false}
                                  tick={{ fill: "#6B7280", fontSize: 11 }}
                                  tickFormatter={formatAxis}
                                />
                                <Tooltip content={<PnLTooltip />} cursor={{ fill: "#F9FAFB" }} />
                                <Legend wrapperStyle={{ paddingTop: "16px", fontSize: "12px" }} />

                                <Bar yAxisId="left" dataKey="cost" name="Batch Cost" fill="#ef4444" opacity={0.7} radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar yAxisId="left" dataKey="revenue" name="Batch Revenue" fill="#3b82f6" opacity={0.7} radius={[4, 4, 0, 0]} barSize={24} />

                                <Area
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="cumProfit"
                                  name="Cumulative Profit"
                                  stroke="#22c55e"
                                  strokeWidth={2.5}
                                  fill="url(#profitGrad)"
                                  dot={{ r: 4, fill: "#22c55e", stroke: "#fff", strokeWidth: 2 }}
                                  activeDot={{ r: 6 }}
                                />
                                <Line
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="cumCost"
                                  name="Cumulative Cost"
                                  stroke="#ef4444"
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                                <Line
                                  yAxisId="right"
                                  type="monotone"
                                  dataKey="cumRevenue"
                                  name="Cumulative Revenue"
                                  stroke="#3b82f6"
                                  strokeWidth={2}
                                  strokeDasharray="5 5"
                                  dot={false}
                                />
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Supplier Breakdown */}
                  {bySupplier.size > 0 && (
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Cost by Supplier</h3>
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Supplier</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Batches</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Qty</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Cost</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Avg Unit Cost</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Sell Price</th>
                              {effectiveSellPrice != null && (
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margin/Unit</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {Array.from(bySupplier.entries()).map(([supplier, data]) => {
                              const margin = effectiveSellPrice != null ? effectiveSellPrice - data.avgUnitCost : null;
                              return (
                                <tr key={supplier} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{supplier}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{data.batchCount}</td>
                                  <td className="px-4 py-3 text-sm text-gray-600 text-right">
                                    {data.totalQty.toLocaleString()} {item?.primary_unit || "units"}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                    {formatPKR(data.totalCost)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700 text-right">
                                    {formatPKR(data.avgUnitCost)}
                                  </td>
                                  <td className={`px-4 py-3 text-sm font-medium text-right ${
                                    effectiveSellPrice == null ? "text-gray-400" : "text-gray-900"
                                  }`}>
                                    {effectiveSellPrice != null ? formatPKR(effectiveSellPrice) : <span className="italic">Not set</span>}
                                  </td>
                                  {effectiveSellPrice != null && (
                                    <td className={`px-4 py-3 text-sm font-bold text-right ${
                                      margin != null && margin >= 0 ? "text-green-700" : "text-red-700"
                                    }`}>
                                      {margin != null
                                        ? `${margin >= 0 ? "+" : ""}${formatPKR(margin)}`
                                        : "—"}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Per-Batch Cost & Profit Breakdown */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Profit & Loss by Batch</h3>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search invoice #..."
                          value={invoiceSearch}
                          onChange={(e) => setInvoiceSearch(e.target.value)}
                          className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-56"
                        />
                        {invoiceSearch && (
                          <button
                            type="button"
                            onClick={() => setInvoiceSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const invoiceColorPalette = [
                        "bg-blue-100",
                        "bg-emerald-100",
                        "bg-violet-100",
                        "bg-amber-100",
                        "bg-cyan-100",
                        "bg-rose-100",
                        "bg-indigo-100",
                        "bg-teal-100",
                      ];

                      const invoiceGroups = new Map<string, number>();
                      batchRows.forEach(r => {
                        if (r.invoiceNumber) {
                          invoiceGroups.set(r.invoiceNumber, (invoiceGroups.get(r.invoiceNumber) ?? 0) + 1);
                        }
                      });

                      const invoiceColorMap = new Map<string, string>();
                      let colorIdx = 0;
                      invoiceGroups.forEach((count, invNum) => {
                        if (count > 1) {
                          invoiceColorMap.set(invNum, invoiceColorPalette[colorIdx % invoiceColorPalette.length]);
                          colorIdx++;
                        }
                      });

                      const searchLower = invoiceSearch.trim().toLowerCase();
                      const filteredRows = searchLower
                        ? batchRows.filter(r => r.invoiceNumber?.toLowerCase().includes(searchLower))
                        : batchRows;

                      return (
                        <>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">PO / Supplier</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty Bought</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty Sold</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Unit Cost</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Sell Price</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total Cost</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Revenue</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Profit / Loss</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margin</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Invoice #</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Invoice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="px-4 py-8 text-center text-sm text-gray-500">
                                No batches match &ldquo;{invoiceSearch}&rdquo;
                              </td>
                            </tr>
                          ) : filteredRows.map((row) => {
                            const rowTint = row.invoiceNumber ? (invoiceColorMap.get(row.invoiceNumber) ?? "") : "";
                            return (
                            <tr key={row.batchId} className={`${rowTint} hover:brightness-95`}>
                              <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                <div className="font-medium">#{row.batchId}</div>
                                <div className="text-[11px] text-gray-500">
                                  {row.receivedAt ? new Date(row.receivedAt).toLocaleDateString() : "—"}
                                </div>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                                  row.status === "active" ? "bg-green-100 text-green-800" :
                                  row.status === "depleted" ? "bg-gray-100 text-gray-600" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="font-medium text-gray-900">{row.poNumber || "—"}</div>
                                <div className="text-[11px] text-gray-500">{row.supplierName || "—"}</div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                                {row.qtyPurchased.toLocaleString()} {item?.primary_unit || "units"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                                {row.qtySold.toLocaleString()} {item?.primary_unit || "units"}
                                {row.qtyRemaining > 0 && (
                                  <div className="text-[10px] text-gray-400">{row.qtyRemaining.toLocaleString()} remaining</div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                                {formatPKR(row.unitCost)}
                              </td>
                              <td className={`px-4 py-3 text-sm text-right whitespace-nowrap font-medium ${
                                effectiveSellPrice == null ? "text-gray-400" :
                                effectiveSellPrice > row.unitCost ? "text-green-700" :
                                effectiveSellPrice < row.unitCost ? "text-red-700" : "text-gray-700"
                              }`}>
                                {effectiveSellPrice != null ? (
                                  <div>
                                    {formatPKR(effectiveSellPrice)}
                                    <div className={`text-[10px] ${
                                      row.profitPerUnit != null && row.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"
                                    }`}>
                                      {row.profitPerUnit != null
                                        ? `${row.profitPerUnit >= 0 ? "+" : ""}${formatPKR(row.profitPerUnit)}/unit`
                                        : ""}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="italic">Not set</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                                {formatPKR(row.totalCost)}
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-700 font-medium text-right whitespace-nowrap">
                                {row.batchRevenue != null ? formatPKR(row.batchRevenue) : "—"}
                              </td>
                              <td className={`px-4 py-3 text-sm font-bold text-right whitespace-nowrap ${
                                row.batchProfit == null ? "text-gray-400" :
                                row.batchProfit >= 0 ? "text-green-700" : "text-red-700"
                              }`}>
                                {row.batchProfit != null
                                  ? `${row.batchProfit >= 0 ? "+" : ""}${formatPKR(row.batchProfit)}`
                                  : "—"}
                              </td>
                              <td className={`px-4 py-3 text-sm font-semibold text-right whitespace-nowrap ${
                                row.marginPct == null ? "text-gray-400" :
                                row.marginPct >= 0 ? "text-green-700" : "text-red-700"
                              }`}>
                                {row.marginPct != null ? `${row.marginPct.toFixed(1)}%` : "—"}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                {row.invoiceNumber || "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {(row.invoiceId || row.hasPdf) ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handlePreviewInvoice(row.invoiceId, row.poId)}
                                        className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                        title="Preview invoice"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDownloadInvoice(row.invoiceId, row.poId)}
                                        className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors"
                                        title="Download invoice"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 italic">
                      {allBatchesHaveRealRevenue
                        ? "* Revenue and profit figures are from actual batch-level sales data."
                        : anyBatchHasRealRevenue
                          ? "* Batches with sales use actual revenue. Others use estimated figures."
                          : effectiveSellPrice != null
                            ? (usesActualSales
                              ? `* Revenue based on actual avg selling price (${formatPKR(effectiveSellPrice)}/${item?.primary_unit || "unit"}). Per-batch figures use this average.`
                              : `* Profit estimates use catalog selling price (${formatPKR(effectiveSellPrice)}/${item?.primary_unit || "unit"}). Actual profit may differ.`)
                            : ""}
                    </p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Actual Sales Transactions */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900">Actual Sales Transactions</h3>
                      {itemSales.length > 0 && (
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>
                            Catalog: <span className="font-semibold text-gray-700">{catalogPrice != null ? formatPKR(catalogPrice) : "—"}</span>
                          </span>
                          {actualAvgSellPrice != null && (
                            <span>
                              Avg actual: <span className="font-semibold text-orange-700">{formatPKR(actualAvgSellPrice)}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {itemSales.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm">No sales recorded yet for this item.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Sale #</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Customer</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Qty</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actual Unit Price</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">vs Cost</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Discount</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {itemSales.map((sale) => {
                              const batchCost = sale.batch_unit_cost ?? null;
                              const avgBatchCost = totalQtyPurchased > 0 ? totalCostAll / totalQtyPurchased : 0;
                              const costForComparison = batchCost ?? avgBatchCost;
                              const profitVsCost = sale.unit_price - costForComparison;
                              const matchedBatch = sale.batch_id
                                ? batchRows.find(b => b.batchId === sale.batch_id)
                                : null;
                              return (
                                <tr key={`${sale.sale_id}-${sale.id}`} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                    {new Date(sale.sale_date).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-mono text-orange-600 font-medium whitespace-nowrap">
                                    {sale.sale_number}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-700 truncate max-w-[150px]">
                                    {sale.customer_name}
                                  </td>
                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    {sale.batch_id ? (
                                      <div>
                                        <span className="font-medium text-gray-900">#{sale.batch_id}</span>
                                        {matchedBatch && (
                                          <div className="text-[10px] text-gray-500">
                                            {matchedBatch.supplierName || matchedBatch.poNumber || ""}
                                          </div>
                                        )}
                                        {batchCost != null && (
                                          <div className="text-[10px] text-gray-400">
                                            cost: {formatPKR(batchCost)}/unit
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400 italic">—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                                    {sale.quantity.toLocaleString()} {sale.unit || item?.primary_unit || "units"}
                                  </td>
                                  <td className="px-4 py-3 text-right whitespace-nowrap">
                                    <span className="text-sm font-bold text-gray-900">{formatPKR(sale.unit_price)}</span>
                                    {catalogPrice != null && sale.unit_price !== catalogPrice && (
                                      <div className={`text-[10px] font-medium ${sale.unit_price > catalogPrice ? "text-green-600" : "text-red-600"}`}>
                                        {sale.unit_price > catalogPrice ? "+" : ""}{formatPKR(sale.unit_price - catalogPrice)} vs catalog
                                      </div>
                                    )}
                                  </td>
                                  <td className={`px-4 py-3 text-right whitespace-nowrap ${
                                    profitVsCost >= 0 ? "text-green-700" : "text-red-700"
                                  }`}>
                                    <span className="text-sm font-semibold">
                                      {profitVsCost >= 0 ? "+" : ""}{formatPKR(profitVsCost)}/unit
                                    </span>
                                    {!batchCost && (
                                      <div className="text-[10px] text-gray-400 font-normal">vs avg cost</div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right text-red-500 whitespace-nowrap">
                                    {sale.discount_amount > 0
                                      ? `-${formatPKR(sale.discount_amount)}`
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right whitespace-nowrap">
                                    {formatPKR(sale.total_amount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {itemSales.length > 0 && (
                            <tfoot className="bg-gray-50 border-t border-gray-300">
                              <tr>
                                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">Totals</td>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                  {itemSales.reduce((s, sale) => s + sale.quantity, 0).toLocaleString()} {item?.primary_unit || "units"}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500 text-right italic">
                                  avg {actualAvgSellPrice != null ? formatPKR(actualAvgSellPrice) : "—"}
                                </td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-sm text-red-500 text-right font-medium">
                                  {(() => {
                                    const totalDisc = itemSales.reduce((s, sale) => s + sale.discount_amount, 0);
                                    return totalDisc > 0 ? `-${formatPKR(totalDisc)}` : "—";
                                  })()}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                  {formatPKR(itemSales.reduce((s, sale) => s + sale.total_amount, 0))}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Cumulative P&L Running Total */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Cumulative Profit & Loss</h3>
                    {effectiveSellPrice == null ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No sales data or selling price available to compute cumulative P&L.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Batch</th>
                              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Batch Cost</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Batch Profit</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Running Cost</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Running Profit</th>
                              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Running Margin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {(() => {
                              let runningCost = 0;
                              let runningProfit = 0;
                              let runningRevenue = 0;
                              return batchRows.map((row) => {
                                runningCost += row.totalCost;
                                runningProfit += row.batchProfit ?? 0;
                                runningRevenue += row.batchRevenue ?? 0;
                                const runMargin = runningRevenue > 0 ? (runningProfit / runningRevenue) * 100 : 0;
                                return (
                                  <tr key={`cum-${row.batchId}`} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">#{row.batchId}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                      {row.receivedAt ? new Date(row.receivedAt).toLocaleDateString() : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPKR(row.totalCost)}</td>
                                    <td className={`px-4 py-3 text-sm font-medium text-right ${
                                      (row.batchProfit ?? 0) >= 0 ? "text-green-700" : "text-red-700"
                                    }`}>
                                      {row.batchProfit != null
                                        ? `${row.batchProfit >= 0 ? "+" : ""}${formatPKR(row.batchProfit)}`
                                        : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                      {formatPKR(runningCost)}
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-bold text-right ${
                                      runningProfit >= 0 ? "text-green-700" : "text-red-700"
                                    }`}>
                                      {`${runningProfit >= 0 ? "+" : ""}${formatPKR(runningProfit)}`}
                                    </td>
                                    <td className={`px-4 py-3 text-sm font-semibold text-right ${
                                      runMargin >= 0 ? "text-green-700" : "text-red-700"
                                    }`}>
                                      {runMargin.toFixed(1)}%
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
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
