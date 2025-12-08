"use client";

import { useState, useEffect, useCallback } from "react";
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

// Mock data for fallback - will be replaced by API calls
const mockInventoryData = [
  {
    id: 1,
    item_id: 1,
    item: {
      id: 1,
      serial_number: "CONST-000001",
      name: "Portland Cement 50kg",
      brand: "Fauji",
      category_id: 1,
      category: { id: 1, name: "Construction Material", alias: "CONST", description: null, created_at: "", updated_at: "" },
      picture_url: null,
      total_profit: 15000,
      last_purchase_price: 850,
      lowest_purchase_price: 820,
      highest_purchase_price: 900,
      selling_price: 1200, // Selling price to customers
      primary_unit: "bag",
      secondary_unit: "kg",
      conversion_rate: 50, // 1 bag = 50 kg
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-12-05T10:30:00Z",
    },
    quantity_on_hand: 450, // 450 bags
    reorder_level: 200,
    stock_value: 540000, // 450 bags × PKR 1200/bag = PKR 540,000 (selling value)
    last_restocked_at: "2025-12-05T10:30:00Z",
    created_at: "",
    updated_at: "",
  },
  {
    id: 2,
    item_id: 2,
    item: {
      id: 2,
      serial_number: "CONST-000002",
      name: "Steel Rebar 12mm",
      brand: "Amreli",
      category_id: 1,
      category: { id: 1, name: "Construction Material", alias: "CONST", description: null, created_at: "", updated_at: "" },
      picture_url: null,
      total_profit: 8500,
      last_purchase_price: 120,
      lowest_purchase_price: 115,
      highest_purchase_price: 130,
      selling_price: 180, // Selling price to customers
      primary_unit: "piece",
      secondary_unit: "meter",
      conversion_rate: 6, // 1 piece = 6 meters
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-12-01T14:20:00Z",
    },
    quantity_on_hand: 50, // 50 pieces
    reorder_level: 100,
    stock_value: 9000, // 50 pieces × PKR 180/piece = PKR 9,000 (selling value)
    last_restocked_at: "2025-12-01T14:20:00Z",
    created_at: "",
    updated_at: "",
  },
];

const mockPurchaseOrdersData = [
  {
    id: 1,
    po_number: "PO-20251207-001",
    supplier_id: null,
    supplier_name: "ABC Suppliers",
    order_date: "2025-12-07",
    expected_delivery_date: "2025-12-15",
    received_date: null,
    status: "sent" as const,
    subtotal: 125000,
    tax_percentage: 18,
    tax_amount: 22500,
    discount: 0,
    total: 147500,
    notes: null,
    created_by: 1,
    created_at: "",
    updated_at: "",
    items: [
      {
        id: 1,
        purchase_order_id: 1,
        item_id: 1,
        quantity_ordered: 100,
        quantity_received: 0,
        unit_price: 850,
        total: 85000,
      },
      {
        id: 2,
        purchase_order_id: 1,
        item_id: 2,
        quantity_ordered: 200,
        quantity_received: 0,
        unit_price: 120,
        total: 24000,
      },
    ],
  },
];

const mockMovementsData = [
  {
    id: 1,
    item_id: 1,
    item: {
      id: 1,
      serial_number: "CONST-000001",
      name: "Portland Cement 50kg",
      brand: "Fauji",
      category_id: 1,
      category: { id: 1, name: "Construction Material", alias: "CONST", description: null, created_at: "", updated_at: "" },
      picture_url: null,
      total_profit: 15000,
      last_purchase_price: 850,
        lowest_purchase_price: 820,
        highest_purchase_price: 900,
        selling_price: 1200,
        primary_unit: "bag",
        secondary_unit: "kg",
        conversion_rate: 50,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-12-07T10:30:00Z",
    },
    movement_type: "purchase" as const,
    quantity: 100,
    previous_stock: 350,
    new_stock: 450,
    reference_type: "purchase_order",
    reference_id: 1,
    notes: "Received from ABC Suppliers",
    performed_by: 1,
    performed_by_name: "Admin User",
    created_at: "2025-12-07T10:30:00Z",
  },
  {
    id: 2,
    item_id: 2,
    item: {
      id: 2,
      serial_number: "CONST-000002",
      name: "Steel Rebar 12mm",
      brand: "Amreli",
      category_id: 1,
      category: { id: 1, name: "Construction Material", alias: "CONST", description: null, created_at: "", updated_at: "" },
      picture_url: null,
      total_profit: 8500,
      last_purchase_price: 120,
        lowest_purchase_price: 115,
        highest_purchase_price: 130,
        selling_price: 180,
        primary_unit: "piece",
        secondary_unit: "meter",
        conversion_rate: 6,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-12-06T15:45:00Z",
    },
    movement_type: "adjustment" as const,
    quantity: -20,
    previous_stock: 70,
    new_stock: 50,
    reference_type: "adjustment",
    reference_id: null,
    notes: "Damaged stock write-off",
    performed_by: 1,
    performed_by_name: "Admin User",
    created_at: "2025-12-06T15:45:00Z",
  },
];

export default function StockPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  
  // Get initial tab from URL params or default to "inventory"
  const initialTab = searchParams.get("tab") || "inventory";
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemStock | null>(null);

  // Data states - initialize with mock data
  const [inventory, setInventory] = useState<ItemStock[]>(mockInventoryData);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(mockPurchaseOrdersData);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(mockMovementsData);
  const [lowStockItems, setLowStockItems] = useState<ItemStock[]>(
    mockInventoryData.filter(item => item.quantity_on_hand <= item.reorder_level)
  );

  // Loading states
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Fetch inventory data
  const fetchInventory = useCallback(async () => {
    setLoadingInventory(true);
    try {
      const response = await stockApi.getStock({ per_page: 20 });
      setInventory(response.data);
    } catch {
      console.error("Failed to fetch inventory");
      addToast("Failed to load inventory", "error");
      // Keep mock data on error
      setInventory(mockInventoryData);
    } finally {
      setLoadingInventory(false);
    }
  }, [addToast]);

  // Fetch purchase orders
  const fetchPurchaseOrders = useCallback(async () => {
    setLoadingPOs(true);
    try {
      const response = await purchaseOrdersApi.getPurchaseOrders({ per_page: 20, sort_by: "order_date", sort_order: "desc" });
      setPurchaseOrders(response.data);
    } catch {
      console.error("Failed to fetch purchase orders");
      addToast("Failed to load purchase orders", "error");
      // Keep mock data on error
      setPurchaseOrders(mockPurchaseOrdersData);
    } finally {
      setLoadingPOs(false);
    }
  }, [addToast]);

  // Fetch stock movements
  const fetchStockMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const response = await stockMovementsApi.getStockMovements({ per_page: 20, sort_by: "created_at", sort_order: "desc" });
      setStockMovements(response.data);
    } catch {
      console.error("Failed to fetch stock movements");
      addToast("Failed to load stock movements", "error");
      // Keep mock data on error
      setStockMovements(mockMovementsData);
    } finally {
      setLoadingMovements(false);
    }
  }, [addToast]);

  // Fetch low stock alerts
  const fetchLowStockAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const response = await stockApi.getStock({ status: 'low_stock', per_page: 100 });
      const outOfStock = await stockApi.getStock({ status: 'out_of_stock', per_page: 100 });
      setLowStockItems([...response.data, ...outOfStock.data]);
    } catch {
      console.error("Failed to fetch low stock alerts");
      addToast("Failed to load alerts", "error");
      // Keep mock data on error
      const lowStock = mockInventoryData.filter(item => item.quantity_on_hand <= item.reorder_level);
      setLowStockItems(lowStock);
    } finally {
      setLoadingAlerts(false);
    }
  }, [addToast]);

  // Fetch data based on active tab
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
    if (activeTab === "inventory") {
      fetchInventory();
    } else if (activeTab === "purchase-orders") {
      fetchPurchaseOrders();
    } else if (activeTab === "movements") {
      fetchStockMovements();
    } else if (activeTab === "alerts") {
      fetchLowStockAlerts();
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
      // Refresh inventory
      fetchInventory();
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
      // Refresh purchase orders
      fetchPurchaseOrders();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete purchase order";
      addToast(errorMessage, "error");
    }
  };

  const handleReorderLevelChange = async (itemId: number, newLevel: number) => {
    try {
      const response = await stockApi.updateReorderLevel(itemId, newLevel);
      addToast(response.message || "Reorder level updated successfully", "success");
      // Refresh inventory to show updated status
      fetchInventory();
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

