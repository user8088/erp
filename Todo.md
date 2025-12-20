# Frontend Documentation: Per-Delivery Maintenance Cost Implementation

## Overview

The vehicle profitability calculation has been updated to correctly compute maintenance costs **per delivery run**. Maintenance records (Fuel, Toll Tax, Driver Allowance, etc.) represent cost components that apply to **every delivery**, so the total maintenance cost is calculated as: **per-delivery cost × number of orders**.

---

## Key Changes

### Calculation Logic

**Previous (Incorrect) Behavior:**
- Total maintenance costs = sum of all maintenance records (cumulative)
- This didn't scale with the number of deliveries

**New (Correct) Behavior:**
- Per-delivery maintenance cost = sum of all maintenance record amounts
- Total maintenance costs = per-delivery cost × total orders
- This correctly scales with the number of deliveries

### Example

**Vehicle Configuration:**
- Maintenance Records:
  - Fuel: Rs 100.00
  - Toll Tax: Rs 100.00

**Per-Delivery Cost:** Rs 200.00 (100 + 100)

**Orders:** 5 delivery orders exist

**Total Maintenance Costs:** Rs 200.00 × 5 = Rs 1,000.00

---

## API Changes

### Vehicle Profitability Stats Endpoint

**Endpoint:** `GET /api/vehicles/{id}/profitability-stats`

**New Response Structure:**

```json
{
  "vehicle_id": 1,
  "vehicle_name": "Loader",
  "registration_number": "ABC-123",
  "statistics": {
    "total_delivery_charges": 5000.00,
    "per_delivery_maintenance_cost": 200.00,  // ✅ NEW FIELD
    "total_maintenance_costs": 1000.00,
    "net_profit": 4000.00,
    "profit_margin_percentage": 80.00,
    "total_orders": 5
  }
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `total_delivery_charges` | number | Sum of all delivery charges from orders |
| `per_delivery_maintenance_cost` | number | **NEW** - Sum of all maintenance record amounts (cost per delivery run) |
| `total_maintenance_costs` | number | `per_delivery_maintenance_cost × total_orders` |
| `net_profit` | number | `total_delivery_charges - total_maintenance_costs` |
| `profit_margin_percentage` | number | `(net_profit / total_delivery_charges) × 100` |
| `total_orders` | number | Count of delivery orders (draft + completed) |

---

## Frontend Integration

### TypeScript Interface Update

**File:** Update your `VehicleProfitabilityStats` interface

```typescript
export interface VehicleProfitabilityStats {
  vehicle_id: number;
  vehicle_name: string;
  registration_number: string;
  statistics: {
    total_delivery_charges: number;
    per_delivery_maintenance_cost: number; // ✅ NEW: Cost per delivery run
    total_maintenance_costs: number; // per_delivery_maintenance_cost × total_orders
    net_profit: number;
    profit_margin_percentage: number;
    total_orders: number;
  };
}
```

### API Service Update

**Example API Service Method:**

```typescript
// vehiclesApi.ts or similar
export const getVehicleProfitabilityStats = async (
  vehicleId: number
): Promise<VehicleProfitabilityStats> => {
  const response = await fetch(`/api/vehicles/${vehicleId}/profitability-stats`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch vehicle profitability stats');
  }
  
  return response.json();
};
```

---

## UI Updates

### Profitability Tab Display

Update the vehicle profitability component to show the per-delivery maintenance cost.

#### Summary Cards

**Before:**
- Total Delivery Charges
- Total Maintenance Costs
- Net Profit
- Profit Margin

**After (Recommended):**
- Total Delivery Charges
- **Per-Delivery Maintenance Cost** (NEW)
- Total Maintenance Costs
- Net Profit
- Profit Margin

#### Detailed Statistics Section

Add display for per-delivery cost with calculation breakdown:

```tsx
// Example React component update
<div className="profitability-stats">
  <div className="stat-row">
    <span>Total Orders</span>
    <span>{stats.total_orders}</span>
  </div>
  
  <div className="stat-row">
    <span>Total Delivery Charges</span>
    <span>{formatCurrency(stats.total_delivery_charges)}</span>
  </div>
  
  {/* NEW: Per-Delivery Maintenance Cost */}
  <div className="stat-row">
    <span>Per-Delivery Maintenance Cost</span>
    <span>{formatCurrency(stats.per_delivery_maintenance_cost || 0)}</span>
  </div>
  
  {/* Updated: Total Maintenance Costs with breakdown note */}
  <div className="stat-row">
    <span>Total Maintenance Costs</span>
    <span className="text-red-600">
      {formatCurrency(stats.total_maintenance_costs)}
    </span>
  </div>
  <div className="text-xs text-gray-500 italic mt-1 mb-2">
    Per-delivery cost ({formatCurrency(stats.per_delivery_maintenance_cost || 0)}) × {stats.total_orders} orders
  </div>
  
  <div className="stat-row">
    <span>Net Profit</span>
    <span>{formatCurrency(stats.net_profit)}</span>
  </div>
  
  <div className="stat-row">
    <span>Profit Margin</span>
    <span>{stats.profit_margin_percentage.toFixed(2)}%</span>
  </div>
</div>
```

#### Summary Card Description

Add per-delivery cost information to the maintenance costs summary card:

```tsx
<div className="summary-card">
  <h3>Total Maintenance Costs</h3>
  <div className="amount">{formatCurrency(stats.total_maintenance_costs)}</div>
  <p className="text-xs text-gray-500 mt-1">
    Per-delivery: {formatCurrency(stats.per_delivery_maintenance_cost || 0)} × {stats.total_orders} orders
  </p>
</div>
```

---

## Calculation Examples

### Example 1: Basic Setup

**Vehicle Configuration:**
- Maintenance Records:
  - Fuel: Rs 100.00
  - Toll Tax: Rs 100.00

**Per-Delivery Cost:** Rs 200.00

**Orders:**
- Order 1: Delivery charges = Rs 500.00
- Order 2: Delivery charges = Rs 600.00
- Order 3: Delivery charges = Rs 400.00

**API Response:**
```json
{
  "statistics": {
    "total_delivery_charges": 1500.00,
    "per_delivery_maintenance_cost": 200.00,
    "total_maintenance_costs": 600.00,  // 200 × 3
    "net_profit": 900.00,  // 1500 - 600
    "profit_margin_percentage": 60.00,  // (900 / 1500) × 100
    "total_orders": 3
  }
}
```

### Example 2: Adding New Cost Component

**Initial Setup:**
- Fuel: Rs 100.00
- Toll Tax: Rs 100.00
- **Per-Delivery:** Rs 200.00

**After adding "Driver Allowance: Rs 50.00":**
- Fuel: Rs 100.00
- Toll Tax: Rs 100.00
- Driver Allowance: Rs 50.00
- **New Per-Delivery:** Rs 250.00

**Impact:**
- All existing and future orders will use the new per-delivery cost of Rs 250.00
- If 3 orders exist, total maintenance costs = 250 × 3 = Rs 750.00

**Note:** This is calculated on-the-fly, so adding a new maintenance record immediately affects the profitability calculation for all orders.

---

## Migration Notes

### Backward Compatibility

The API response now includes the new `per_delivery_maintenance_cost` field. Existing frontend code that doesn't access this field will continue to work, but should be updated to:

1. Display the per-delivery cost for better user understanding
2. Show the calculation breakdown (per-delivery × orders = total)

### Data Migration

**No database migration required** - existing VehicleMaintenance records are already structured correctly as per-delivery cost components. The change is purely in the calculation logic.

---

## Testing Checklist

After implementing the frontend changes, verify:

1. ✅ `per_delivery_maintenance_cost` field is displayed in the UI
2. ✅ Total maintenance costs calculation is correct: `per_delivery × total_orders`
3. ✅ Calculation breakdown note is shown (e.g., "Rs 200.00 × 5 orders")
4. ✅ Net profit and profit margin calculations are correct
5. ✅ Adding new maintenance records updates the per-delivery cost immediately
6. ✅ Creating new delivery orders updates the total maintenance costs correctly

---

## Summary

**Key Changes:**
1. ✅ New `per_delivery_maintenance_cost` field in profitability stats API
2. ✅ Total maintenance costs = `per_delivery_maintenance_cost × total_orders`
3. ✅ UI should display both per-delivery and total costs
4. ✅ Show calculation breakdown for transparency

**Benefits:**
- Accurate per-delivery cost tracking
- Correctly scales with number of orders
- Easy to understand calculation breakdown
- Better user visibility into maintenance cost structure

