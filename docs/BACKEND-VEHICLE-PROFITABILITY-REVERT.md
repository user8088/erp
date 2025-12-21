# Backend Changes: Vehicle Profitability - Revert to Cumulative Maintenance Costs with Date Range

## Overview

The vehicle profitability calculation needs to be reverted from **per-delivery × orders** back to **cumulative sum of maintenance records**, with **date range filtering** support.

---

## Requirements

### Calculation Logic Change

**Previous (Per-Delivery):**
- `total_maintenance_costs = per_delivery_maintenance_cost × total_orders`
- Maintenance records treated as per-delivery cost components

**New (Cumulative):**
- `total_maintenance_costs = SUM(VehicleMaintenance.amount WHERE date_range)`
- Maintenance records are actual expenses that occurred in the period
- Should be filtered by date range (monthly by default, custom range supported)

### Use Case Example

**Scenario:**
- This month (December 2025):
  - Fuel charges: Rs 200.00
  - Driver bill: Rs 400.00
- Delivery orders in December: 5 orders

**Expected Result:**
- `total_maintenance_costs = 200 + 400 = Rs 600.00` (sum of maintenance records)
- `total_delivery_charges = sum of delivery charges from 5 orders`
- `net_profit = total_delivery_charges - 600.00`

**NOT:** `200 + 400 = 600 per delivery × 5 orders = 3,000` ❌

---

## API Changes Required

### Endpoint: `GET /api/vehicles/{id}/profitability-stats`

**New Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (YYYY-MM-DD) | No | Start date for filtering maintenance records and orders |
| `end_date` | string (YYYY-MM-DD) | No | End date for filtering maintenance records and orders |
| `month` | string (YYYY-MM) | No | Alternative to start_date/end_date - filters by month |

**Behavior:**
- If no date parameters provided → Use all-time data
- If `month` provided → Calculate start_date and end_date for that month
- If `start_date` and `end_date` provided → Use custom range
- Filter both maintenance records AND delivery orders by the same date range

---

## Backend Implementation

### File: `app/Http/Controllers/VehicleController.php`

**Update `getProfitabilityStats()` method:**

```php
public function getProfitabilityStats($id, Request $request)
{
    $vehicle = Vehicle::findOrFail($id);
    
    // Parse date range from request
    $startDate = null;
    $endDate = null;
    
    if ($request->has('month')) {
        // Month format: YYYY-MM
        [$year, $month] = explode('-', $request->input('month'));
        $startDate = Carbon::create($year, $month, 1)->startOfDay();
        $endDate = Carbon::create($year, $month, 1)->endOfMonth()->endOfDay();
    } elseif ($request->has('start_date') && $request->has('end_date')) {
        $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
        $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
    }
    
    // Get delivery orders for this vehicle (filtered by date range)
    $ordersQuery = Sale::where('vehicle_id', $id)
        ->where('sale_type', 'delivery')
        ->whereIn('status', ['draft', 'completed'])
        ->where('status', '!=', 'cancelled');
    
    // Apply date filter to orders (filter by order created_at or delivery date)
    if ($startDate && $endDate) {
        $ordersQuery->whereBetween('created_at', [$startDate, $endDate]);
    }
    
    $totalOrders = (clone $ordersQuery)->count();
    $totalDeliveryCharges = (clone $ordersQuery)->sum('total_delivery_charges');
    
    // CRITICAL: Sum maintenance costs from VehicleMaintenance table (filtered by date range)
    $maintenanceQuery = VehicleMaintenance::where('vehicle_id', $id);
    
    // Apply date filter to maintenance records (filter by maintenance_date)
    if ($startDate && $endDate) {
        $maintenanceQuery->whereBetween('maintenance_date', [
            $startDate->format('Y-m-d'),
            $endDate->format('Y-m-d')
        ]);
    }
    
    $totalMaintenanceCosts = $maintenanceQuery->sum('amount');
    
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
            'total_maintenance_costs' => (float) $totalMaintenanceCosts, // Sum of maintenance records
            'net_profit' => (float) $netProfit,
            'profit_margin_percentage' => round($profitMargin, 2),
            'total_orders' => $totalOrders,
            'period_start' => $startDate ? $startDate->format('Y-m-d') : null,
            'period_end' => $endDate ? $endDate->format('Y-m-d') : null,
        ],
    ]);
}
```

---

## Key Changes

### 1. Remove Per-Delivery Calculation

**Remove:**
```php
$perDeliveryMaintenanceCost = VehicleMaintenance::where('vehicle_id', $id)->sum('amount');
$totalMaintenanceCosts = $perDeliveryMaintenanceCost * $totalOrders;
```

**Replace with:**
```php
$totalMaintenanceCosts = VehicleMaintenance::where('vehicle_id', $id)
    ->whereBetween('maintenance_date', [$startDate, $endDate])
    ->sum('amount');
```

### 2. Add Date Range Filtering

- Filter `VehicleMaintenance` records by `maintenance_date`
- Filter `Sale` records by `created_at` (or `expected_delivery_date` if you prefer)
- Both filters use the same date range

### 3. Remove `per_delivery_maintenance_cost` from Response

**Remove from response:**
- `per_delivery_maintenance_cost` field

**Keep in response:**
- `total_maintenance_costs` (sum of maintenance records)
- `period_start` and `period_end` (optional, for frontend display)

---

## Date Filtering Logic

### Month Filter (YYYY-MM format)

**Example:** `month=2025-12`

**Backend should:**
1. Parse `2025-12` → Year: 2025, Month: 12
2. Calculate:
   - `start_date = 2025-12-01 00:00:00`
   - `end_date = 2025-12-31 23:59:59`
3. Filter maintenance records: `maintenance_date BETWEEN '2025-12-01' AND '2025-12-31'`
4. Filter delivery orders: `created_at BETWEEN '2025-12-01 00:00:00' AND '2025-12-31 23:59:59'`

### Custom Range Filter

**Example:** `start_date=2025-12-01&end_date=2025-12-15`

**Backend should:**
1. Parse dates: `2025-12-01` and `2025-12-15`
2. Filter maintenance records: `maintenance_date BETWEEN '2025-12-01' AND '2025-12-15'`
3. Filter delivery orders: `created_at BETWEEN '2025-12-01 00:00:00' AND '2025-12-15 23:59:59'`

### No Date Filter (All-Time)

**If no date parameters provided:**
- Include all maintenance records (no date filter)
- Include all delivery orders (no date filter)

---

## Example Calculations

### Example 1: Monthly View (December 2025)

**Maintenance Records in December:**
- 2025-12-05: Fuel - Rs 200.00
- 2025-12-10: Driver Bill - Rs 400.00

**Delivery Orders in December:**
- Order 1: Delivery charges = Rs 500.00
- Order 2: Delivery charges = Rs 600.00
- Order 3: Delivery charges = Rs 400.00

**API Request:**
```
GET /api/vehicles/1/profitability-stats?month=2025-12
```

**Response:**
```json
{
  "statistics": {
    "total_delivery_charges": 1500.00,
    "total_maintenance_costs": 600.00,  // 200 + 400 (sum, not per-delivery × orders)
    "net_profit": 900.00,  // 1500 - 600
    "profit_margin_percentage": 60.00,
    "total_orders": 3,
    "period_start": "2025-12-01",
    "period_end": "2025-12-31"
  }
}
```

### Example 2: Custom Range (Dec 1-15)

**Maintenance Records:**
- 2025-12-05: Fuel - Rs 200.00
- 2025-12-20: Driver Bill - Rs 400.00 (outside range)

**Delivery Orders:**
- Order 1 (Dec 5): Rs 500.00
- Order 2 (Dec 20): Rs 600.00 (outside range)

**API Request:**
```
GET /api/vehicles/1/profitability-stats?start_date=2025-12-01&end_date=2025-12-15
```

**Response:**
```json
{
  "statistics": {
    "total_delivery_charges": 500.00,  // Only Order 1
    "total_maintenance_costs": 200.00,  // Only Fuel (Driver Bill outside range)
    "net_profit": 300.00,
    "profit_margin_percentage": 60.00,
    "total_orders": 1,
    "period_start": "2025-12-01",
    "period_end": "2025-12-15"
  }
}
```

---

## Important Notes

### Date Field Selection

**For Maintenance Records:**
- Use `maintenance_date` field (the date when the maintenance expense occurred)

**For Delivery Orders:**
- Use `created_at` (when order was created) OR
- Use `expected_delivery_date` (if you want to filter by delivery date)
- **Recommendation:** Use `created_at` for consistency

### Default Behavior

- **If no date parameters:** Return all-time data (no date filtering)
- **If only `start_date` provided:** Filter from start_date to today
- **If only `end_date` provided:** Filter from beginning to end_date
- **If both provided:** Filter between start_date and end_date

### Validation

Add validation for:
- Date format (YYYY-MM-DD for dates, YYYY-MM for month)
- `start_date` should be <= `end_date`
- `end_date` should not be in the future (optional)

---

## Testing Checklist

1. ✅ **Monthly filter:**
   - Request with `month=2025-12`
   - Verify only December maintenance records included
   - Verify only December orders included

2. ✅ **Custom range:**
   - Request with `start_date` and `end_date`
   - Verify only records/orders in range included

3. ✅ **No filter (all-time):**
   - Request without date parameters
   - Verify all maintenance records and orders included

4. ✅ **Calculation correctness:**
   - Maintenance costs = sum of filtered records (not per-delivery × orders)
   - Net profit = delivery charges - maintenance costs

5. ✅ **Edge cases:**
   - No maintenance records in period → total_maintenance_costs = 0
   - No orders in period → total_delivery_charges = 0, total_orders = 0
   - Both zero → net_profit = 0

---

## Migration Notes

### Breaking Changes

- **Removed:** `per_delivery_maintenance_cost` field from response
- **Added:** `period_start` and `period_end` fields (optional)

### Backward Compatibility

- Frontend will handle missing `per_delivery_maintenance_cost` gracefully
- Old API calls without date parameters will still work (return all-time data)

---

## Summary

**Key Changes:**
1. ✅ Revert from `per_delivery × orders` to `SUM(maintenance records)`
2. ✅ Add date range filtering (monthly and custom range)
3. ✅ Filter both maintenance records and orders by same date range
4. ✅ Remove `per_delivery_maintenance_cost` from response
5. ✅ Add `period_start` and `period_end` to response

**Benefits:**
- Accurate monthly/period-based profitability tracking
- Maintenance costs reflect actual expenses in the period
- Better alignment with accounting practices (expenses vs. revenue in same period)

