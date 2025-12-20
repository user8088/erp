# Backend Fix: Vehicle Profitability - Maintenance Cost Calculation

## Problem
The **Profitability tab** shows incorrect `total_maintenance_costs`:
- **Issue 1:** Shows maintenance costs even when `total_orders = 0` (should be 0.00)
- **Issue 2:** Not calculating as `per_delivery_maintenance_cost × total_orders`

**Expected Behavior:**
- When `total_orders = 0` → `total_maintenance_costs = 0.00` (just like delivery charges)
- When `total_orders > 0` → `total_maintenance_costs = per_delivery_maintenance_cost × total_orders`
- Updates automatically when orders are created (same as delivery charges)

## Root Cause
The `getProfitabilityStats()` method is calculating maintenance costs incorrectly:
- Currently summing all VehicleMaintenance records (cumulative)
- Should be: `per_delivery_maintenance_cost × total_orders`

---

## Required Fix

### File: `app/Http/Controllers/VehicleController.php` (or wherever profitability is calculated)

**Find the `getProfitabilityStats()` method and replace it with this:**

```php
public function getProfitabilityStats($id)
{
    $vehicle = Vehicle::findOrFail($id);
    
    // Get all delivery orders for this vehicle (draft + completed, exclude cancelled)
    $ordersQuery = Sale::where('vehicle_id', $id)
        ->where('sale_type', 'delivery')
        ->whereIn('status', ['draft', 'completed'])
        ->where('status', '!=', 'cancelled');
    
    $totalOrders = (clone $ordersQuery)->count();
    $totalDeliveryCharges = (clone $ordersQuery)->sum('total_delivery_charges');
    
    // CRITICAL: Calculate per-delivery maintenance cost (sum of all cost components)
    $perDeliveryMaintenanceCost = VehicleMaintenance::where('vehicle_id', $id)
        ->sum('amount');
    
    // CRITICAL: Total maintenance costs = per-delivery cost × number of orders
    // When total_orders = 0, total_maintenance_costs MUST be 0 (just like delivery charges)
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
            'per_delivery_maintenance_cost' => (float) $perDeliveryMaintenanceCost, // NEW: Cost per delivery
            'total_maintenance_costs' => (float) $totalMaintenanceCosts, // per_delivery × orders
            'net_profit' => (float) $netProfit,
            'profit_margin_percentage' => round($profitMargin, 2),
            'total_orders' => $totalOrders,
        ],
    ]);
}
```

---

## Key Points

1. **Get vehicle record first** - `$vehicle = Vehicle::findOrFail($id);`
2. **Calculate per-delivery cost** - `VehicleMaintenance::where('vehicle_id', $id)->sum('amount')` (sum of all cost components)
3. **Calculate total:** `total_maintenance_costs = per_delivery_maintenance_cost × total_orders`
4. **CRITICAL:** When `total_orders = 0`, `total_maintenance_costs` MUST be `0.00` (same behavior as delivery charges)
5. **CRITICAL:** Total maintenance costs update automatically when orders are created (just like delivery charges)
6. **DO NOT** use `vehicle.maintenance_cost` - that field is not used for profitability
7. **DO NOT** use `sales.maintenance_cost` - that field is not used anymore
8. **DO NOT** sum VehicleMaintenance records directly - must multiply by order count
9. **Maintenance records are per-delivery components** - They represent costs that apply to every delivery (Fuel, Toll, etc.)

---

## Example Calculations

### Example 1: No Orders (Must Show 0)

If:
- VehicleMaintenance records:
  - Fuel: 100.00
  - Toll Tax: 100.00
- Delivery orders: **0 orders**

Then:
- `per_delivery_maintenance_cost = 100 + 100 = 200.00`
- `total_maintenance_costs = 200.00 × 0 = 0.00` ✅ **MUST BE 0**
- `total_delivery_charges = 0.00` (no orders)
- `net_profit = 0.00 - 0.00 = 0.00`

### Example 2: With Orders

If:
- VehicleMaintenance records:
  - Fuel: 100.00
  - Toll Tax: 100.00
  - Driver Allowance: 50.00
- Delivery orders: **5 orders**

Then:
- `per_delivery_maintenance_cost = 100 + 100 + 50 = 250.00`
- `total_maintenance_costs = 250.00 × 5 = 1,250.00` ✅

### Example 3: Adding New Order

**Before:**
- Orders: 3
- Per-delivery: 200.00
- Total maintenance: 200 × 3 = 600.00

**After creating 1 new order:**
- Orders: 4
- Per-delivery: 200.00 (unchanged)
- Total maintenance: 200 × 4 = 800.00 ✅ **Updates automatically**

---

## Debugging

If it's still showing 0, add this logging:

```php
\Log::info('Vehicle Profitability Debug', [
    'vehicle_id' => $id,
    'vehicle_maintenance_cost' => $vehicle->maintenance_cost,
    'total_orders' => $totalOrders,
    'calculated_total_maintenance_costs' => $totalMaintenanceCosts,
    'total_delivery_charges' => $totalDeliveryCharges,
]);
```

**Check:**
- Are there VehicleMaintenance records? → Check `SELECT SUM(amount) FROM vehicle_maintenances WHERE vehicle_id = X`
- Is `$totalOrders` 0? → If yes, `$totalMaintenanceCosts` MUST be 0 (even if maintenance records exist)
- Is `$perDeliveryMaintenanceCost` correct? → Should be sum of all VehicleMaintenance.amount
- Is calculation correct? → Should be `per_delivery_maintenance_cost × total_orders`
- **Test case:** 0 orders + maintenance records = 0.00 total maintenance costs ✅

---

## Verification

After the fix, test with:

### Test 1: Zero Orders (Must Show 0)
1. Add maintenance records (e.g., Fuel: 100, Toll: 100)
2. **Do NOT create any orders**
3. Check profitability: `total_maintenance_costs` MUST be `0.00` ✅
4. `per_delivery_maintenance_cost` should be `200.00`
5. `total_orders` should be `0`

### Test 2: With Orders
1. Add maintenance records (e.g., Fuel: 100, Toll: 100 = 200 per delivery)
2. Create 3 delivery orders
3. Check profitability:
   - `per_delivery_maintenance_cost` = `200.00`
   - `total_orders` = `3`
   - `total_maintenance_costs` = `200.00 × 3 = 600.00` ✅

### Test 3: Adding New Order
1. With existing setup (3 orders, 200 per delivery = 600 total)
2. Create 1 new delivery order
3. Check profitability:
   - `total_orders` = `4`
   - `total_maintenance_costs` = `200.00 × 4 = 800.00` ✅ (updates automatically)

---

## Important Notes

- **Maintenance tab** uses `VehicleMaintenance` table - that's working correctly
- **Profitability tab** now also uses `VehicleMaintenance` table - this is what needs fixing
- **Both tabs use the same data source** - maintenance records added in the Maintenance tab are used for profitability calculations

