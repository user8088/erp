# Per-Delivery Vehicle Maintenance Cost Implementation

## Overview

Vehicle maintenance costs should be calculated **per delivery run**, not as cumulative lifetime expenses. Maintenance records (Fuel, Toll Tax, etc.) represent **cost components** that apply to **every delivery**.

---

## Current Problem

The Profitability tab currently shows maintenance costs as a **cumulative total** (sum of all maintenance records). This is incorrect.

**Example of current (wrong) behavior:**
- Maintenance records: Fuel (100), Toll (100)
- Total shown: 200 (cumulative)
- **Problem:** This doesn't scale with number of deliveries

**What it should be:**
- Maintenance records: Fuel (100), Toll (100)
- **Per-delivery cost:** 200 (sum of components)
- If 5 orders: **Total = 200 × 5 = 1000**

---

## Data Model

### VehicleMaintenance Table (Existing)

The `vehicle_maintenances` table stores **per-delivery cost components**:

```sql
vehicle_maintenances
- id
- vehicle_id
- type (e.g., "Fuel", "Toll Tax", "Driver Allowance")
- amount (cost per delivery for this component)
- maintenance_date (when this cost was configured)
- description
- notes
```

**Important:** These records represent **recurring costs per delivery**, not one-time expenses.

### Example Data

```
Vehicle ID: 1
Maintenance Records:
- Type: "Fuel", Amount: 100.00
- Type: "Toll Tax", Amount: 100.00

Per-Delivery Cost = 100 + 100 = 200.00
```

---

## Backend Changes Required

### 1. Update Vehicle Profitability Calculation

**File:** `app/Http/Controllers/VehicleController.php`

**Current (WRONG):**
```php
// This sums all records as cumulative - WRONG
$totalMaintenanceCosts = VehicleMaintenance::where('vehicle_id', $id)
    ->sum('amount');
```

**New (CORRECT):**
```php
public function getProfitabilityStats($id)
{
    $vehicle = Vehicle::findOrFail($id);
    
    // Get all delivery orders for this vehicle
    $ordersQuery = Sale::where('vehicle_id', $id)
        ->where('sale_type', 'delivery')
        ->whereIn('status', ['draft', 'completed'])
        ->where('status', '!=', 'cancelled');
    
    $totalOrders = (clone $ordersQuery)->count();
    $totalDeliveryCharges = (clone $ordersQuery)->sum('total_delivery_charges');
    
    // Calculate per-delivery maintenance cost (sum of all cost components)
    $perDeliveryMaintenanceCost = VehicleMaintenance::where('vehicle_id', $id)
        ->sum('amount');
    
    // Total maintenance costs = per-delivery cost × number of orders
    $totalMaintenanceCosts = $perDeliveryMaintenanceCost * $totalOrders;
    
    $netProfit = $totalDeliveryCharges - $totalMaintenanceCosts;
    $profitMargin = $totalDeliveryCharges > 0
        ? ($netProfit / $totalDeliveryCharges) * 100
        : 0;
    
    return response()->json([
        'vehicle_id' => $vehicle->id,
        'vehicle_name' => $vehicle->name,
        'registration_number' => $vehicle->registration_number,
        'statistics' => [
            'total_delivery_charges' => (float) $totalDeliveryCharges,
            'per_delivery_maintenance_cost' => (float) $perDeliveryMaintenanceCost, // NEW FIELD
            'total_maintenance_costs' => (float) $totalMaintenanceCosts,
            'net_profit' => (float) $netProfit,
            'profit_margin_percentage' => round($profitMargin, 2),
            'total_orders' => $totalOrders,
        ],
    ]);
}
```

### 2. Update API Response Type

**File:** `app/lib/types.ts` (Frontend)

```typescript
export interface VehicleProfitabilityStats {
  total_delivery_charges: number;
  per_delivery_maintenance_cost: number; // NEW: Cost per delivery run
  total_maintenance_costs: number; // per_delivery_maintenance_cost × total_orders
  net_profit: number;
  profit_margin_percentage: number;
  total_orders: number;
}
```

---

## Frontend Changes Required

### 1. Update Profitability Component

**File:** `app/components/VehicleDetail/VehicleProfitability.tsx`

Add display for per-delivery cost:

```tsx
// In the Detailed Statistics section, add:
<div className="flex justify-between items-center py-2 border-b border-gray-100">
  <span className="text-sm text-gray-600">Per-Delivery Maintenance Cost</span>
  <span className="text-sm font-semibold text-gray-900">
    {formatCurrency(stats.per_delivery_maintenance_cost || 0)}
  </span>
</div>
<div className="flex justify-between items-center py-2 border-b border-gray-100">
  <span className="text-sm text-gray-600">Total Maintenance Costs</span>
  <span className="text-sm font-semibold text-red-600">
    {formatCurrency(stats.total_maintenance_costs)}
  </span>
</div>
<div className="text-xs text-gray-500 mt-1 mb-2 italic">
  Per-delivery cost ({formatCurrency(stats.per_delivery_maintenance_cost || 0)}) × {stats.total_orders} orders
</div>
```

### 2. Update Summary Card Description

**File:** `app/components/VehicleDetail/VehicleProfitability.tsx`

```tsx
<p className="text-xs text-gray-500 mt-1">
  Per-delivery: {formatCurrency(stats.per_delivery_maintenance_cost || 0)} × {stats.total_orders} orders
</p>
```

---

## Calculation Examples

### Example 1: Basic Setup

**Vehicle Configuration:**
- Fuel: 100.00
- Toll Tax: 100.00

**Per-Delivery Cost:** 200.00

**Orders:**
- Order 1: Delivery charges = 500.00
- Order 2: Delivery charges = 600.00
- Order 3: Delivery charges = 400.00

**Profitability Calculation:**
- Total Orders: 3
- Total Delivery Charges: 1,500.00
- Per-Delivery Maintenance: 200.00
- **Total Maintenance Costs:** 200.00 × 3 = 600.00
- Net Profit: 1,500.00 - 600.00 = 900.00
- Profit Margin: (900 / 1,500) × 100 = 60%

### Example 2: Adding New Cost Component

**Initial Setup:**
- Fuel: 100.00
- Toll Tax: 100.00
- **Per-Delivery:** 200.00

**After adding "Driver Allowance: 50.00":**
- Fuel: 100.00
- Toll Tax: 100.00
- Driver Allowance: 50.00
- **New Per-Delivery:** 250.00

**Impact:**
- Existing orders (created before adding Driver Allowance): Still calculated at 200.00 per order
- New orders: Calculated at 250.00 per order
- **Note:** This is a design decision - see "Historical Orders" section below

---

## How Per-Delivery Expenses Are Stored

### Option 1: Calculate on-the-fly (Recommended)

**No storage needed** - Calculate from VehicleMaintenance records when needed:

```php
// When calculating profitability
$perDeliveryCost = VehicleMaintenance::where('vehicle_id', $id)->sum('amount');
$totalCosts = $perDeliveryCost * $totalOrders;
```

**Pros:**
- Always uses current cost configuration
- No data duplication
- Easy to update costs

**Cons:**
- Historical orders use current costs (may not reflect costs at time of order)

### Option 2: Store per-order (Alternative)

Store maintenance cost **on each sale** when order is created:

```php
// When creating delivery order
$perDeliveryCost = VehicleMaintenance::where('vehicle_id', $vehicleId)->sum('amount');
$sale->maintenance_cost = $perDeliveryCost; // Store snapshot
```

**Pros:**
- Historical accuracy (orders reflect costs at time of creation)
- Can track cost changes over time

**Cons:**
- Data duplication
- Need to update existing orders if costs change

**Recommendation:** Use Option 1 (calculate on-the-fly) unless you need historical accuracy.

---

## Impact on Existing Orders

### Current Behavior (After Fix)

- **Existing orders:** Will use **current** per-delivery cost configuration
- If you add a new cost component (e.g., Driver Allowance), it affects profitability calculation for **all orders** (past and future)

### If Historical Accuracy is Required

If you need orders to reflect costs **at the time they were created**, you need to:

1. **Store maintenance_cost on sales table** when order is created:
   ```php
   // In SaleController@store
   if ($request->sale_type === 'delivery' && $request->vehicle_id) {
       $perDeliveryCost = VehicleMaintenance::where('vehicle_id', $request->vehicle_id)
           ->sum('amount');
       $sale->maintenance_cost = $perDeliveryCost;
   }
   ```

2. **Update profitability to use stored values:**
   ```php
   // Sum maintenance_cost from sales, not calculate from VehicleMaintenance
   $totalMaintenanceCosts = Sale::where('vehicle_id', $id)
       ->where('sale_type', 'delivery')
       ->whereIn('status', ['draft', 'completed'])
       ->sum('maintenance_cost');
   ```

**Recommendation:** Start with Option 1 (on-the-fly calculation). Add historical tracking later if needed.

---

## UI/UX Updates

### Profitability Tab Display

**Summary Cards:**
1. **Total Delivery Charges:** Rs X,XXX.XX
2. **Per-Delivery Maintenance Cost:** Rs XXX.XX (NEW)
3. **Total Maintenance Costs:** Rs X,XXX.XX (per-delivery × orders)
4. **Net Profit:** Rs X,XXX.XX

**Detailed Statistics:**
- Total Orders: X
- Total Delivery Charges: Rs X,XXX.XX
- **Per-Delivery Maintenance Cost:** Rs XXX.XX
- **Total Maintenance Costs:** Rs X,XXX.XX
  - *Note: "Per-delivery cost (Rs XXX.XX) × X orders"*
- Net Profit: Rs X,XXX.XX
- Profit Margin: XX.XX%

### Maintenance Tab

**Keep as-is** - Shows all maintenance cost components (Fuel, Toll, etc.) with their individual amounts.

**Add note:** "These costs are applied per delivery. Total per-delivery cost = sum of all components."

---

## Testing Checklist

1. ✅ **Add maintenance components:**
   - Fuel: 100
   - Toll: 100
   - Verify per-delivery cost = 200

2. ✅ **Create delivery orders:**
   - Create 3 orders
   - Verify total maintenance = 200 × 3 = 600

3. ✅ **Add new component:**
   - Add Driver Allowance: 50
   - Verify new per-delivery = 250
   - Verify total maintenance updates (250 × 3 = 750)

4. ✅ **Check profitability display:**
   - Shows per-delivery cost
   - Shows total maintenance costs
   - Shows calculation breakdown

---

## Migration Path

### For Existing Data

**No migration needed** - existing VehicleMaintenance records are already structured correctly as per-delivery components.

**Action required:**
- Update backend calculation logic (see Backend Changes section)
- Update frontend to display per-delivery cost
- Test with existing data

---

## Summary

**Key Changes:**
1. ✅ VehicleMaintenance records = **per-delivery cost components**
2. ✅ Per-delivery cost = **SUM(VehicleMaintenance.amount)**
3. ✅ Total maintenance = **per_delivery_cost × total_orders**
4. ✅ UI shows both per-delivery and total costs
5. ✅ Backend calculates on-the-fly (no storage needed)

**Benefits:**
- Accurate per-delivery cost tracking
- Scales correctly with number of orders
- Easy to add/remove cost components
- Clear separation between per-delivery and total costs

