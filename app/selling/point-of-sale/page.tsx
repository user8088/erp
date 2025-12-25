"use client";

import { useState, useEffect, useCallback } from "react";
import { stockApi, customersApi, salesApi, accountsApi, accountMappingsApi, vehiclesApi, ApiError, type ProcessSalePayload } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import type { ItemStock, Customer, Account, Vehicle, Sale } from "../../lib/types";
import { Package, ShoppingCart, User, Search, Plus, Minus, Trash2, Truck, Loader2 } from "lucide-react";

interface CartItem {
  itemStock: ItemStock;
  quantity: number;
  unitPrice: number; // Adjusted selling price (can be changed)
  originalPrice: number; // Original selling price from item
  discount: number; // Discount percentage (0-100)
  discountedPrice: number;
  deliveryCharge: number; // Delivery charge for this item (only for order sales)
}

export default function PointOfSalePage() {
  const { addToast } = useToast();
  const [stockItems, setStockItems] = useState<ItemStock[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saleType, setSaleType] = useState<"walk-in" | "delivery">("walk-in");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedPaymentAccount, setSelectedPaymentAccount] = useState<number | null>(null);
  const [useAdvance, setUseAdvance] = useState(false);
  const [processingSale, setProcessingSale] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Fetch stocked items
  const fetchStockItems = useCallback(async () => {
    setLoadingStock(true);
    try {
      const response = await stockApi.getStock({
        per_page: 1000,
        sort_by: "item_name",
        sort_order: "asc",
      });
      // Filter out items with null/undefined item references
      const validItems = response.data.filter(item => item.item !== null && item.item !== undefined);
      setStockItems(validItems);
    } catch (error) {
      console.error("Failed to fetch stock items:", error);
      addToast("Failed to load stock items", "error");
      setStockItems([]);
    } finally {
      setLoadingStock(false);
    }
  }, [addToast]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoadingCustomers(true);
    try {
      const response = await customersApi.getCustomers({
        per_page: 1000,
      });
      setCustomers(response.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      addToast("Failed to load customers", "error");
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  }, [addToast]);

  // Fetch vehicles
  const fetchVehicles = useCallback(async () => {
    try {
      const response = await vehiclesApi.getVehicles({
        status: "active",
        per_page: 1000,
        sort_by: "name",
        sort_order: "asc",
      });
      setVehicles(response.data);
    } catch (error) {
      console.error("Failed to fetch vehicles:", error);
      // Don't show error toast, just continue without vehicles
      setVehicles([]);
    }
  }, []);

  // Fetch payment accounts (Cash, Bank accounts)
  const fetchPaymentAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      // Get account mappings to find cash/bank accounts
      const mappingsResponse = await accountMappingsApi.getAccountMappings();
      const cashMapping = mappingsResponse.data.find(m => m.mapping_type === 'pos_cash');
      const bankMapping = mappingsResponse.data.find(m => m.mapping_type === 'pos_bank');
      
      // Fetch all asset accounts (Cash and Bank are typically assets)
      const accountsResponse = await accountsApi.getAccounts({
        company_id: 1,
        root_type: 'asset',
        is_group: false,
        per_page: 1000,
      });

      // Filter for cash and bank accounts, or use mapped accounts
      const relevantAccounts = accountsResponse.data.filter(acc => {
        if (cashMapping && acc.id === cashMapping.account_id) return true;
        if (bankMapping && acc.id === bankMapping.account_id) return true;
        // Also include accounts with "cash" or "bank" in name
        const nameLower = acc.name.toLowerCase();
        return nameLower.includes('cash') || nameLower.includes('bank');
      });

      setPaymentAccounts(relevantAccounts);
      
      // Auto-select cash account if available
      if (cashMapping && relevantAccounts.find(a => a.id === cashMapping.account_id)) {
        setSelectedPaymentAccount(cashMapping.account_id);
      } else if (relevantAccounts.length > 0) {
        setSelectedPaymentAccount(relevantAccounts[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch payment accounts:", error);
      // Don't show error toast, just continue without account selection
    } finally {
      setLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    fetchStockItems();
    fetchCustomers();
    fetchVehicles();
    fetchPaymentAccounts();
  }, [fetchStockItems, fetchCustomers, fetchVehicles, fetchPaymentAccounts]);

  // Filter stock items by search query
  const filteredItems = stockItems.filter((item) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.item?.name?.toLowerCase().includes(query) ||
      item.item?.serial_number?.toLowerCase().includes(query) ||
      item.item?.brand?.toLowerCase().includes(query) ||
      item.item?.category?.name?.toLowerCase().includes(query)
    );
  });

  // Filter customers by search query
  const filteredCustomers = customers.filter((customer) => {
    if (!customerSearchQuery) return true;
    const query = customerSearchQuery.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(query) ||
      customer.serial_number?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  // Add item to cart
  const addToCart = (itemStock: ItemStock) => {
    const existingItem = cart.find((item) => item.itemStock.id === itemStock.id);
    
    if (existingItem) {
      // Increase quantity if already in cart
      setCart(
        cart.map((item) =>
          item.itemStock.id === itemStock.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                discountedPrice: calculateDiscountedPrice(item.unitPrice, item.discount),
              }
            : item
        )
      );
    } else {
      // Add new item to cart
      const sellingPrice = itemStock.item?.selling_price ?? 0;
      const newItem: CartItem = {
        itemStock,
        quantity: 1,
        unitPrice: sellingPrice,
        originalPrice: sellingPrice,
        discount: 0,
        discountedPrice: sellingPrice,
        deliveryCharge: 0,
      };
      setCart([...cart, newItem]);
    }
  };

  // Calculate discounted price
  const calculateDiscountedPrice = (unitPrice: number, discount: number): number => {
    return unitPrice * (1 - discount / 100);
  };

  // Update quantity
  const updateQuantity = (itemId: number, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.itemStock.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return {
            ...item,
            quantity: newQuantity,
            discountedPrice: calculateDiscountedPrice(item.unitPrice, item.discount),
          };
        }
        return item;
      })
    );
  };

  // Update unit price
  const updateUnitPrice = (itemId: number, unitPrice: number) => {
    setCart(
      cart.map((item) => {
        if (item.itemStock.id === itemId) {
          const newPrice = Math.max(0, unitPrice);
          // Ensure originalPrice exists (for items added before this field was added)
          const originalPrice = item.originalPrice ?? item.unitPrice;
          
          return {
            ...item,
            unitPrice: newPrice,
            originalPrice: originalPrice,
            discountedPrice: calculateDiscountedPrice(newPrice, item.discount),
          };
        }
        return item;
      })
    );
  };

  // Update discount
  const updateDiscount = (itemId: number, discount: number) => {
    setCart(
      cart.map((item) => {
        if (item.itemStock.id === itemId) {
          const clampedDiscount = Math.max(0, Math.min(100, discount));
          
          return {
            ...item,
            discount: clampedDiscount,
            discountedPrice: calculateDiscountedPrice(item.unitPrice, clampedDiscount),
          };
        }
        return item;
      })
    );
  };

  // Update delivery charge
  const updateDeliveryCharge = (itemId: number, deliveryCharge: number) => {
    setCart(
      cart.map((item) => {
        if (item.itemStock.id === itemId) {
          return {
            ...item,
            deliveryCharge: Math.max(0, deliveryCharge),
          };
        }
        return item;
      })
    );
  };

  // Remove item from cart
  const removeFromCart = (itemId: number) => {
    setCart(cart.filter((item) => item.itemStock.id !== itemId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.discountedPrice * item.quantity, 0);
  const totalDiscount = cart.reduce(
    (sum, item) => sum + (item.unitPrice - item.discountedPrice) * item.quantity,
    0
  );
  const totalDeliveryCharges = saleType === "delivery" 
    ? cart.reduce((sum, item) => sum + item.deliveryCharge, 0)
    : 0;
  const total = subtotal + totalDeliveryCharges;


  // Reset sale type to walk-in when guest mode is enabled
  useEffect(() => {
    if (isGuestMode && saleType === "delivery") {
      setSaleType("walk-in");
      addToast("Guest sales are only available for walk-in sales", "info");
    }
  }, [isGuestMode, saleType, addToast]);

  // Process Sale
  const handleProcessSale = async () => {
    // Validation for guest mode
    if (isGuestMode) {
      if (saleType === "delivery") {
        addToast("Guest sales are only available for walk-in sales", "error");
        return;
      }
      if (!selectedPaymentAccount) {
        addToast("Please select a payment account", "error");
        return;
      }
      
      // For guest sales, validate that no items have been discounted below original price
      // and that the total payment equals the expected amount
      const hasPriceReduction = cart.some(item => {
        const originalPrice = item.originalPrice ?? item.itemStock.item?.selling_price ?? 0;
        return item.discountedPrice < originalPrice;
      });
      
      if (hasPriceReduction) {
        addToast("Guest customers cannot have prices reduced below the original selling price", "error");
        return;
      }
      
      // Validate payment amount (should always equal total, but check for safety)
      const paymentAmount = total;
      if (Math.abs(paymentAmount - total) > 0.01) { // Allow small floating point differences
        if (paymentAmount > total) {
          addToast("Guest customers cannot pay excess/advance amount", "error");
        } else {
          addToast("Guest due is not allowed", "error");
        }
        return;
      }
    } else {
      // Regular customer validation
      if (!selectedCustomer || cart.length === 0) return;

      // For walk-in sales, payment account is required
      if (saleType === "walk-in" && !selectedPaymentAccount) {
        addToast("Please select a payment account", "error");
        return;
      }
    }

    setProcessingSale(true);
    try {
      // Prepare sale items
      const saleItems = cart.map(item => ({
        item_id: item.itemStock.item!.id,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        discount_percentage: item.discount,
        delivery_charge: saleType === "delivery" ? item.deliveryCharge : 0,
      }));

      // For guest sales, backend will use system guest customer
      // Pass 0 as customer_id when is_guest is true - backend will use guest customer
      const customerId = isGuestMode ? 0 : (selectedCustomer?.id || 0);

      console.log("[POS] Creating sale:", {
        sale_type: saleType,
        customer_id: customerId,
        is_guest: isGuestMode,
        items_count: saleItems.length,
        items: saleItems,
      });

      // Create sale (draft)
      const saleResponse = await salesApi.createSale({
        sale_type: saleType,
        customer_id: customerId,
        is_guest: isGuestMode,
        vehicle_id: saleType === "delivery" ? selectedVehicle?.id || null : null,
        delivery_address: saleType === "delivery" && !isGuestMode && selectedCustomer ? selectedCustomer.address || null : null,
        // IMPORTANT: maintenance cost is defined on the vehicle profile, not per order in POS.
        // Backend should use the vehicle's configured maintenance cost when calculating profitability.
        items: saleItems,
      });

      console.log("[POS] Sale created:", saleResponse);
      console.log("[POS] Sale response structure:", {
        hasSale: !!saleResponse.sale,
        hasId: !!saleResponse.sale?.id,
        keys: Object.keys(saleResponse || {}),
        fullResponse: JSON.stringify(saleResponse, null, 2),
      });

      // Extract sale from response
      // API might return { sale: Sale } or just Sale directly
      let sale = saleResponse.sale;
      
      // If saleResponse.sale doesn't exist, check if saleResponse itself is the sale
      if (!sale && saleResponse && typeof saleResponse === 'object') {
        // Check if the response has sale-like properties (id, sale_number, etc.)
        if ('id' in saleResponse || 'sale_number' in saleResponse) {
          console.log("[POS] Response appears to be a direct sale object");
          sale = saleResponse as unknown as Sale;
        }
      }
      
      if (!sale || !sale.id) {
        console.error("[POS] Invalid sale response:", saleResponse);
        console.error("[POS] Extracted sale:", sale);
        console.error("[POS] Response type:", typeof saleResponse);
        console.error("[POS] Response keys:", saleResponse ? Object.keys(saleResponse) : 'null');
        addToast("Failed to create sale: Invalid response from server", "error");
        setProcessingSale(false);
        return;
      }

      console.log("[POS] Using sale:", { id: sale.id, sale_number: sale.sale_number });

      // Process sale
      const processPayload: ProcessSalePayload = {};
      
      // For walk-in sales, include payment info
      if (saleType === "walk-in") {
        processPayload.payment_method = "cash" as const;
        processPayload.payment_account_id = selectedPaymentAccount!;
        // For guest sales, payment equals total (calculated from cart items)
        processPayload.amount_paid = total;
        // Guest sales cannot use advance
        processPayload.use_advance = isGuestMode ? false : useAdvance;
        processPayload.is_guest = isGuestMode;
      }

      console.log("[POS] Processing sale:", { sale_id: sale.id, payload: processPayload });
      const processResponse = await salesApi.processSale(sale.id, processPayload);
      console.log("[POS] Sale processed:", processResponse);

      // Success!
      const successMessage = saleType === "walk-in" 
        ? `Walk-in sale processed successfully! Sale #${sale.sale_number}` 
        : `Delivery sale processed successfully! Sale #${sale.sale_number}`;
      
      addToast(successMessage, "success");

      // Reset cart and form
      setCart([]);
      setSelectedCustomer(null);
      setSelectedVehicle(null);
      setUseAdvance(false);
      setSearchQuery(""); // Clear search as well
      setCustomerSearchQuery(""); // Clear customer search
      setIsGuestMode(false); // Reset guest mode

      // Refresh stock items to reflect updated quantities
      await fetchStockItems();
    } catch (error) {
      console.error("Failed to process sale:", error);
      
      if (error instanceof ApiError) {
        // Handle validation errors (422) with field-specific messages
        if (error.status === 422 || error.status === 400) {
          const errorData = error.data as { message?: string; errors?: Record<string, string[]> };
          
          // Check for guest-specific error messages and show user-friendly versions
          const errorMessage = errorData.message || "";
          if (isGuestMode) {
            if (errorMessage.includes("advance") || errorMessage.includes("excess") || errorMessage.includes("exceeds")) {
              addToast("Guest customers cannot pay excess/advance amount", "error");
            } else if (errorMessage.includes("due") || errorMessage.includes("outstanding") || errorMessage.includes("less than")) {
              addToast("Guest due is not allowed", "error");
            } else if (errorData.errors) {
              // Show all validation errors
              const errorMessages = Object.values(errorData.errors).flat();
              if (errorMessages.length > 0) {
                // Check if any error message contains advance/due keywords
                const hasAdvanceError = errorMessages.some(msg => 
                  msg.toLowerCase().includes("advance") || 
                  msg.toLowerCase().includes("excess") || 
                  msg.toLowerCase().includes("exceeds")
                );
                const hasDueError = errorMessages.some(msg => 
                  msg.toLowerCase().includes("due") || 
                  msg.toLowerCase().includes("outstanding") || 
                  msg.toLowerCase().includes("less than")
                );
                
                if (hasAdvanceError) {
                  addToast("Guest customers cannot pay excess/advance amount", "error");
                } else if (hasDueError) {
                  addToast("Guest due is not allowed", "error");
                } else {
                  // Show first error in toast, log all errors
                  addToast(errorMessages[0], "error");
                }
                if (errorMessages.length > 1) {
                  console.warn("Additional validation errors:", errorMessages.slice(1));
                }
              } else {
                addToast(errorData.message || "Validation failed", "error");
              }
            } else {
              addToast(errorData.message || "Failed to process sale", "error");
            }
          } else {
            // Regular customer error handling
            if (errorData.errors) {
              // Show all validation errors
              const errorMessages = Object.values(errorData.errors).flat();
              if (errorMessages.length > 0) {
                // Show first error in toast, log all errors
                addToast(errorMessages[0], "error");
                if (errorMessages.length > 1) {
                  console.warn("Additional validation errors:", errorMessages.slice(1));
                }
              } else {
                addToast(errorData.message || "Validation failed", "error");
              }
            } else {
              // Business logic error
              addToast(errorData.message || "Failed to process sale", "error");
            }
          }
        } else if (error.status === 404) {
          addToast("Sales API endpoint not found. Please check backend configuration.", "error");
        } else if (error.status === 403) {
          addToast("You don't have permission to process sales", "error");
        } else if (error.status === 401) {
          addToast("Please log in to continue", "error");
        } else {
          addToast(error.message || "Failed to process sale", "error");
        }
      } else {
        addToast("Failed to process sale. Please try again.", "error");
      }
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Point of Sale</h1>
            <p className="text-sm text-gray-500 mt-1">Select items and process sales</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Items */}
        <div className="w-2/3 border-r border-gray-200 bg-white flex flex-col">
          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search items by name, serial number, brand, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loadingStock ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">Loading items...</p>
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredItems.map((itemStock) => {
                  const item = itemStock.item;
                  if (!item) return null;

                  const quantity = Number(itemStock.quantity_on_hand);
                  const stockValue = itemStock.stock_value;
                  const sellingPrice = item.selling_price ?? 0;

                  // Determine stock status
                  const reorderLevel = Number(itemStock.reorder_level);
                  let stockStatus: "in_stock" | "low_stock" | "out_of_stock";
                  if (quantity === 0 || quantity < 0) {
                    stockStatus = "out_of_stock";
                  } else if (quantity > 0 && quantity <= reorderLevel) {
                    stockStatus = "low_stock";
                  } else {
                    stockStatus = "in_stock";
                  }

                  return (
                    <div
                      key={itemStock.id}
                      className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        stockStatus === "out_of_stock"
                          ? "opacity-50 cursor-not-allowed border-gray-200"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                      onClick={() => {
                        if (stockStatus !== "out_of_stock") {
                          addToCart(itemStock);
                        }
                      }}
                    >
                      {/* Item Image */}
                      <div className="mb-3">
                        {item.picture_url ? (
                          <img
                            src={item.picture_url}
                            alt={item.name}
                            className="w-full h-32 object-cover rounded border border-gray-200"
                          />
                        ) : (
                          <div className="w-full h-32 rounded bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center border border-gray-200">
                            <Package className="w-12 h-12 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Item Details */}
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">{item.name}</h3>
                        <p className="text-xs text-gray-500">{item.category?.name || "—"}</p>
                        {item.brand && (
                          <p className="text-xs text-gray-500">Brand: {item.brand}</p>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <div>
                            <p className="text-xs font-medium text-gray-700">Price</p>
                            <p className="text-sm font-semibold text-gray-900">
                              PKR {sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-700">Stock</p>
                            <p className={`text-sm font-semibold ${
                              stockStatus === "out_of_stock"
                                ? "text-red-600"
                                : stockStatus === "low_stock"
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}>
                              {Math.floor(quantity).toLocaleString()} {item.primary_unit || "units"}
                            </p>
                          </div>
                        </div>
                        <div className="pt-1">
                          <p className="text-xs text-gray-500">
                            Value: PKR {stockValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm">No items found.</p>
                <p className="text-xs mt-1 text-gray-400">
                  {searchQuery ? "Try a different search term." : "No items in stock."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side - POS Interface */}
        <div className="w-1/3 bg-white flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Cart</h2>

            {/* Guest Sale Toggle */}
            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGuestMode}
                  onChange={(e) => {
                    setIsGuestMode(e.target.checked);
                    if (e.target.checked) {
                      setSelectedCustomer(null);
                      setCustomerSearchQuery("");
                      setSaleType("walk-in");
                    }
                  }}
                  className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700">Guest Sale</span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Enable for walk-in customers without an account
              </p>
            </div>

            {/* Sale Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sale Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSaleType("walk-in")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    saleType === "walk-in"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Walk-in Sale
                </button>
                <button
                  onClick={() => {
                    if (!isGuestMode) {
                      setSaleType("delivery");
                    }
                  }}
                  disabled={isGuestMode}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    saleType === "delivery"
                      ? "bg-orange-500 text-white"
                      : isGuestMode
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Order Sale
                </button>
              </div>
              {isGuestMode && (
                <p className="text-xs text-orange-600 mt-1">Guest sales are only available for walk-in sales</p>
              )}
            </div>

            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              {isGuestMode ? (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <input
                    type="text"
                    value="Guest Customer"
                    readOnly
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </div>
              ) : (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                  <input
                    type="text"
                    value={selectedCustomer ? `${selectedCustomer.name}${selectedCustomer.serial_number ? ` (${selectedCustomer.serial_number})` : ""}` : customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                      if (selectedCustomer) {
                        setSelectedCustomer(null);
                      }
                    }}
                    onFocus={() => {
                      setShowCustomerDropdown(true);
                      if (selectedCustomer) {
                        setCustomerSearchQuery("");
                      }
                    }}
                    onBlur={() => {
                      // Delay closing to allow click events
                      setTimeout(() => setShowCustomerDropdown(false), 200);
                    }}
                    placeholder="Search customer by name, serial number, or phone..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    disabled={loadingCustomers}
                  />
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setCustomerSearchQuery("");
                            setShowCustomerDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-orange-50 focus:bg-orange-50 focus:outline-none transition-colors"
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.serial_number && (
                            <div className="text-xs text-gray-500">Serial: {customer.serial_number}</div>
                          )}
                          {customer.phone && (
                            <div className="text-xs text-gray-500">Phone: {customer.phone}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {showCustomerDropdown && customerSearchQuery && filteredCustomers.length === 0 && !loadingCustomers && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg p-4 text-center text-sm text-gray-500">
                      No customers found
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Vehicle Selection & Maintenance Cost (Only for Delivery Sale) */}
            {saleType === "delivery" && (
              <div className="mb-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transport Vehicle <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                      value={selectedVehicle?.id || ""}
                      onChange={(e) => {
                        const vehicle = vehicles.find((v) => v.id === Number(e.target.value));
                        setSelectedVehicle(vehicle || null);
                      }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select Vehicle (Optional)</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.name} {vehicle.registration_number ? `(${vehicle.registration_number})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">You can set this later if needed</p>
                </div>

              </div>
            )}

            {/* Payment Account Selection (Only for Walk-in Sale) */}
            {saleType === "walk-in" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPaymentAccount || ""}
                  onChange={(e) => setSelectedPaymentAccount(e.target.value ? Number(e.target.value) : null)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={loadingAccounts}
                >
                  <option value="">Select Payment Account</option>
                  {paymentAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.number ? `${account.number} - ` : ""}{account.name}
                    </option>
                  ))}
                </select>
                {paymentAccounts.length === 0 && !loadingAccounts && (
                  <p className="text-xs text-red-500 mt-1">
                    No payment accounts found. Please configure account mappings in settings.
                  </p>
                )}
              </div>
            )}


            {/* Use Advance Option (Only for Walk-in Sale, Not for Guests) */}
            {saleType === "walk-in" && selectedCustomer && !isGuestMode && (
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useAdvance}
                    onChange={(e) => setUseAdvance(e.target.checked)}
                    className="w-4 h-4 text-orange-500 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Use customer advance payment (if available)</span>
                </label>
              </div>
            )}

            {/* Cart Items */}
            <div className="mb-4 border border-gray-200 rounded-lg">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs mt-1 text-gray-400">Add items from the left to get started</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {cart.map((cartItem) => {
                    const item = cartItem.itemStock.item;
                    if (!item) return null;

                    return (
                      <div key={cartItem.itemStock.id} className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-gray-900">{item.name}</h4>
                            <p className="text-xs text-gray-500">{item.serial_number}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(cartItem.itemStock.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => updateQuantity(cartItem.itemStock.id, -1)}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-center">
                            {cartItem.quantity} {item.primary_unit || "units"}
                          </span>
                          <button
                            onClick={() => updateQuantity(cartItem.itemStock.id, 1)}
                            className="p-1 border border-gray-300 rounded hover:bg-gray-50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price and Discount */}
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            {/* Selling Price */}
                            <div className="space-y-1">
                              <label className="block text-xs text-gray-600">Selling Price:</label>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">PKR</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={cartItem.unitPrice}
                                  onChange={(e) =>
                                    updateUnitPrice(cartItem.itemStock.id, Number(e.target.value))
                                  }
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            {/* Discount */}
                            <div className="space-y-1">
                              <label className="block text-xs text-gray-600">Discount:</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={cartItem.discount}
                                  onChange={(e) =>
                                    updateDiscount(cartItem.itemStock.id, Number(e.target.value))
                                  }
                                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-500">%</span>
                              </div>
                            </div>
                          </div>
                          {cartItem.originalPrice !== undefined && 
                           cartItem.unitPrice !== cartItem.originalPrice && (
                            <p className="text-xs text-gray-500">
                              Original: PKR {cartItem.originalPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          )}
                          {cartItem.discount > 0 && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Discounted Price:</span>
                              <span className="font-semibold text-green-600">
                                PKR {cartItem.discountedPrice.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          )}
                          {/* Delivery Charge (Only for Delivery Sale) */}
                          {saleType === "delivery" && (
                            <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                              <Truck className="w-4 h-4 text-gray-400" />
                              <div className="flex-1">
                                <label className="block text-xs text-gray-600 mb-1">Delivery Charge:</label>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">PKR</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={cartItem.deliveryCharge}
                                    onChange={(e) =>
                                      updateDeliveryCharge(cartItem.itemStock.id, Number(e.target.value))
                                    }
                                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="0.00"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-gray-200">
                            <span className="text-gray-900">Subtotal:</span>
                            <span className="text-gray-900">
                              PKR {(
                                cartItem.discountedPrice * cartItem.quantity + 
                                (saleType === "delivery" ? cartItem.deliveryCharge : 0)
                              ).toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Totals */}
            {cart.length > 0 && (
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    PKR {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Discount:</span>
                    <span className="font-medium text-green-600">
                      - PKR {totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {saleType === "delivery" && totalDeliveryCharges > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Total Delivery Charges:</span>
                    <span className="font-medium text-blue-600">
                      PKR {totalDeliveryCharges.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-orange-600">
                    PKR {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            {/* Process Sale Button */}
            <button
              disabled={
                cart.length === 0 || 
                (isGuestMode ? false : !selectedCustomer) || 
                (saleType === "walk-in" && !selectedPaymentAccount) ||
                processingSale
              }
              onClick={handleProcessSale}
              className={`w-full mt-4 py-3 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 ${
                cart.length === 0 || 
                (isGuestMode ? false : !selectedCustomer) || 
                (saleType === "walk-in" && !selectedPaymentAccount) ||
                processingSale
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {processingSale ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : !isGuestMode && !selectedCustomer ? (
                "Select Customer to Continue"
              ) : saleType === "walk-in" && !selectedPaymentAccount ? (
                "Select Payment Account to Continue"
              ) : saleType === "walk-in" ? (
                isGuestMode ? "Process Guest Sale" : "Process Walk-in Sale"
              ) : (
                "Process Delivery Sale"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

