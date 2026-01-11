"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, RefreshCw, Settings2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import CategoryStockChart from "../components/Stock/WarehouseStockChart";
import StockTabs from "../components/Stock/StockTabs";
import InventoryTable from "../components/Stock/InventoryTable";
import PurchaseOrdersTable from "../components/Stock/PurchaseOrdersTable";
import StockMovementsTable from "../components/Stock/StockMovementsTable";
import LowStockAlertsTable from "../components/Stock/LowStockAlertsTable";
import StockAdjustmentModal from "../components/Stock/StockAdjustmentModal";
import { useToast } from "../components/ui/ToastProvider";
import { stockApi, purchaseOrdersApi, stockMovementsApi } from "../lib/apiClient";
import type { ItemStock, PurchaseOrder, StockMovement } from "../lib/types";

export default function StockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // Get initial tab from URL params or default to "inventory"
  const initialTab = searchParams.get("tab") || "inventory";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemStock | null>(null);

  // Data states - initialize with empty arrays (no dummy data)
  const [inventory, setInventory] = useState<ItemStock[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [lowStockItems, setLowStockItems] = useState<ItemStock[]>([]);

  // Track which tabs have been loaded to prevent unnecessary API calls
  const loadedTabsRef = useRef<Set<string>>(new Set());

  // Loading states
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Fetch inventory data
  const fetchInventory = useCallback(async (force = false) => {
    // Only fetch if not already loaded or if forced
    if (!force && loadedTabsRef.current.has("inventory")) {
      return;
    }

    setLoadingInventory(true);
    try {
      const response = await stockApi.getStock({ per_page: 20 });
      setInventory(response.data);
      loadedTabsRef.current.add("inventory");
    } catch {
      console.error("Failed to fetch inventory");
      addToast("Failed to load inventory", "error");
      setInventory([]);
    } finally {
      setLoadingInventory(false);
    }
  }, [addToast]);

  // Fetch purchase orders
  const fetchPurchaseOrders = useCallback(async (force = false) => {
    // Only fetch if not already loaded or if forced
    if (!force && loadedTabsRef.current.has("purchase-orders")) {
      return;
    }

    setLoadingPOs(true);
    try {
      const response = await purchaseOrdersApi.getPurchaseOrders({ per_page: 20, sort_by: "order_date", sort_order: "desc" });
      setPurchaseOrders(response.data);
      loadedTabsRef.current.add("purchase-orders");
    } catch {
      console.error("Failed to fetch purchase orders");
      addToast("Failed to load purchase orders", "error");
      setPurchaseOrders([]);
    } finally {
      setLoadingPOs(false);
    }
  }, [addToast]);

  // Fetch stock movements
  const fetchStockMovements = useCallback(async (force = false) => {
    // Only fetch if not already loaded or if forced
    if (!force && loadedTabsRef.current.has("movements")) {
      return;
    }

    setLoadingMovements(true);
    try {
      const response = await stockMovementsApi.getStockMovements({ per_page: 20, sort_by: "created_at", sort_order: "desc" });
      setStockMovements(response.data);
      loadedTabsRef.current.add("movements");
    } catch {
      console.error("Failed to fetch stock movements");
      addToast("Failed to load stock movements", "error");
      setStockMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  }, [addToast]);

  // Fetch low stock alerts
  const fetchLowStockAlerts = useCallback(async (force = false) => {
    // Only fetch if not already loaded or if forced
    if (!force && loadedTabsRef.current.has("alerts")) {
      return;
    }

    setLoadingAlerts(true);
    try {
      const response = await stockApi.getStock({ status: 'low_stock', per_page: 100 });
      const outOfStock = await stockApi.getStock({ status: 'out_of_stock', per_page: 100 });
      setLowStockItems([...response.data, ...outOfStock.data]);
      loadedTabsRef.current.add("alerts");
    } catch {
      console.error("Failed to fetch low stock alerts");
      addToast("Failed to load alerts", "error");
      setLowStockItems([]);
    } finally {
      setLoadingAlerts(false);
    }
  }, [addToast]);

  // Fetch data based on active tab - only fetch once per tab
  useEffect(() => {
    if (activeTab === "inventory") {
      fetchInventory();
    } else if (activeTab === "purchase-orders") {
      fetchPurchaseOrders();
    } else if (activeTab === "movements") {
      fetchStockMovements();
    } else if (activeTab === "alerts") {
      fetchLowStockAlerts();
    }
  }, [activeTab, fetchInventory, fetchPurchaseOrders, fetchStockMovements, fetchLowStockAlerts]);

  const handleRefresh = () => {
    // Force refresh by clearing the loaded flag and fetching again
    if (activeTab === "inventory") {
      loadedTabsRef.current.delete("inventory");
      fetchInventory(true);
    } else if (activeTab === "purchase-orders") {
      loadedTabsRef.current.delete("purchase-orders");
      fetchPurchaseOrders(true);
    } else if (activeTab === "movements") {
      loadedTabsRef.current.delete("movements");
      fetchStockMovements(true);
    } else if (activeTab === "alerts") {
      loadedTabsRef.current.delete("alerts");
      fetchLowStockAlerts(true);
    }
  };

  const handleAdjustStock = (itemId: number) => {
    const item = inventory.find(i => i.item_id === itemId);
    if (item) {
      setSelectedItem(item);
      setIsAdjustModalOpen(true);
    }
  };

  const handleSaveAdjustment = async (quantity: number, notes: string) => {
    if (!selectedItem) return;

    try {
      const response = await stockApi.adjustStock({
        item_id: selectedItem.item_id,
        quantity,
        notes,
      });
      addToast(response.message || `Stock adjusted successfully for ${selectedItem.item?.name}`, "success");
      setIsAdjustModalOpen(false);
      // Force refresh inventory after stock adjustment
      loadedTabsRef.current.delete("inventory");
      fetchInventory(true);
      // Also refresh movements and alerts as they may be affected
      loadedTabsRef.current.delete("movements");
      loadedTabsRef.current.delete("alerts");
      if (activeTab === "movements") {
        fetchStockMovements(true);
      } else if (activeTab === "alerts") {
        fetchLowStockAlerts(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to adjust stock";
      addToast(errorMessage, "error");
      throw error;
    }
  };

  const handleDeletePO = async (id: number) => {
    if (!confirm("Are you sure you want to delete this purchase order?")) return;

    try {
      await purchaseOrdersApi.deletePurchaseOrder(id);
      addToast("Purchase order deleted successfully", "success");
      // Force refresh purchase orders after deletion
      loadedTabsRef.current.delete("purchase-orders");
      fetchPurchaseOrders(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete purchase order";
      addToast(errorMessage, "error");
    }
  };

  const handleReorderLevelChange = async (itemId: number, newLevel: number) => {
    try {
      const response = await stockApi.updateReorderLevel(itemId, newLevel);
      addToast(response.message || "Reorder level updated successfully", "success");
      // Force refresh inventory and alerts after reorder level change
      loadedTabsRef.current.delete("inventory");
      loadedTabsRef.current.delete("alerts");
      fetchInventory(true);
      if (activeTab === "alerts") {
        fetchLowStockAlerts(true);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update reorder level";
      addToast(errorMessage, "error");
      throw error;
    }
  };

  const handleSuggestReorderLevel = async (itemId: number): Promise<number | null> => {
    try {
      const response = await stockApi.suggestReorderLevel(itemId);
      addToast(
        `Suggested: ${response.suggested_reorder_level} (based on ${response.calculation.total_sold_last_30_days} units sold in last 30 days)`,
        "success"
      );
      return response.suggested_reorder_level;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to get suggestion";
      addToast(errorMessage, "error");
      return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage inventory, purchase orders, and stock movements</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/stock/settings")}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
            title="Purchase Order Accounting Settings"
          >
            <Settings2 className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {activeTab === "purchase-orders" && (
            <button
              onClick={() => router.push("/stock/purchase-orders/new")}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Chart */}
      <CategoryStockChart />

      {/* Tabs */}
      <StockTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "inventory" && (
          <InventoryTable
            stock={inventory}
            loading={loadingInventory}
            onAdjustStock={handleAdjustStock}
            onReorderLevelChange={handleReorderLevelChange}
            onSuggestReorderLevel={handleSuggestReorderLevel}
          />
        )}

        {activeTab === "purchase-orders" && (
          <PurchaseOrdersTable
            orders={purchaseOrders}
            loading={loadingPOs}
            onDelete={handleDeletePO}
          />
        )}

        {activeTab === "movements" && (
          <StockMovementsTable
            movements={stockMovements}
            loading={loadingMovements}
          />
        )}

        {activeTab === "alerts" && (
          <LowStockAlertsTable
            stock={lowStockItems}
            loading={loadingAlerts}
          />
        )}
      </div>

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        item={selectedItem?.item || null}
        currentStock={selectedItem?.quantity_on_hand || 0}
        onSave={handleSaveAdjustment}
      />
    </div>
  );
}

