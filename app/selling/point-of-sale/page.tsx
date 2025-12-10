"use client";

import { useState, useEffect, useCallback } from "react";
import { stockApi, customersApi } from "../../lib/apiClient";
import { useToast } from "../../components/ui/ToastProvider";
import type { ItemStock, Customer } from "../../lib/types";
import { Package, ShoppingCart, User, Search, Plus, Minus, Trash2, Truck } from "lucide-react";

interface Vehicle {
  id: number;
  name: string;
  registration_number?: string;
}

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
  const [saleType, setSaleType] = useState<"order" | "walk-in">("walk-in");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

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

  // Fetch vehicles (placeholder - can be connected to API later)
  const fetchVehicles = useCallback(async () => {
    // TODO: Replace with actual API call when vehicles API is available
    // For now, using mock data
    const mockVehicles: Vehicle[] = [
      { id: 1, name: "Truck-001", registration_number: "ABC-123" },
      { id: 2, name: "Van-002", registration_number: "XYZ-456" },
      { id: 3, name: "Pickup-003", registration_number: "DEF-789" },
    ];
    setVehicles(mockVehicles);
  }, []);

  useEffect(() => {
    fetchStockItems();
    fetchCustomers();
    fetchVehicles();
  }, [fetchStockItems, fetchCustomers, fetchVehicles]);

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
  const totalDeliveryCharges = saleType === "order" 
    ? cart.reduce((sum, item) => sum + item.deliveryCharge, 0)
    : 0;
  const total = subtotal + totalDeliveryCharges;

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
                  onClick={() => setSaleType("order")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    saleType === "order"
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Order Sale
                </button>
              </div>
            </div>

            {/* Customer Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={selectedCustomer?.id || ""}
                  onChange={(e) => {
                    const customer = customers.find((c) => c.id === Number(e.target.value));
                    setSelectedCustomer(customer || null);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  disabled={loadingCustomers}
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.serial_number ? `(${customer.serial_number})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vehicle Selection (Only for Order Sale) */}
            {saleType === "order" && (
              <div className="mb-4">
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
                          {/* Delivery Charge (Only for Order Sale) */}
                          {saleType === "order" && (
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
                                (saleType === "order" ? cartItem.deliveryCharge : 0)
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
                {saleType === "order" && totalDeliveryCharges > 0 && (
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
              disabled={cart.length === 0 || !selectedCustomer}
              className={`w-full mt-4 py-3 rounded-md font-semibold transition-colors ${
                cart.length === 0 || !selectedCustomer
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {!selectedCustomer
                ? "Select Customer to Continue"
                : saleType === "walk-in"
                ? "Process Walk-in Sale"
                : "Process Order Sale"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

