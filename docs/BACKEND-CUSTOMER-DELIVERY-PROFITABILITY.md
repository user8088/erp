# Backend Implementation: Customer Delivery Profitability with Date Range

## Overview

The customer delivery profitability feature needs to calculate maintenance costs from **VehicleMaintenance records** (not from `sales.maintenance_cost`), filtered by date range, similar to the vehicle profitability system.

---

## Requirements

### Calculation Logic

**Current (Incorrect):**
- `total_maintenance_costs = SUM(sales.maintenance_cost WHERE customer_id = X)`
- Uses `maintenance_cost` field from sales table

**New (Correct):**
- `total_maintenance_costs = SUM(VehicleMaintenance.amount WHERE vehicle_id IN (vehicles used for customer deliveries) AND maintenance_date BETWEEN start_date AND end_date)`
- Get maintenance costs from VehicleMaintenance table
- Filter by date range (monthly or custom)
- Only include maintenance records for vehicles that delivered to this customer

### Use Case Example

**Scenario:**
- Customer has 5 delivery orders in December 2025
- Orders used Vehicle A and Vehicle B
- Vehicle A maintenance in December: Fuel (200), Toll (100) = 300 total
- Vehicle B maintenance in December: Fuel (150), Driver (400) = 550 total

**Expected Result:**
- `total_maintenance_costs = 300 + 550 = 850.00` (sum of maintenance records)
- `total_delivery_charges = sum of delivery charges from 5 orders`
- `net_profit = total_delivery_charges - 850.00`

---

## API Endpoint Required

### Endpoint: `GET /api/customers/{id}/delivery-profitability-stats`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (YYYY-MM-DD) | No | Start date for filtering maintenance records and orders |
| `end_date` | string (YYYY-MM-DD) | No | End date for filtering maintenance records and orders |
| `month` | string (YYYY-MM) | No | Alternative to start_date/end_date - filters by month |

**Response Structure:**

```json
{
  "customer_id": 1,
  "customer_name": "John Doe",
  "statistics": {
    "total_delivery_charges": 5000.00,
    "total_maintenance_costs": 850.00,
    "net_profit": 4150.00,
    "profit_margin_percentage": 83.00,
    "total_orders": 5,
    "period_start": "2025-12-01",
    "period_end": "2025-12-31"
  }
}
```

---

## Backend Implementation

### File: `app/Http/Controllers/CustomerController.php`

**Add new method:**

```php
public function getDeliveryProfitabilityStats($id, Request $request)
{
    $customer = Customer::findOrFail($id);
    
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
    
    // Get delivery orders for this customer (filtered by date range)
    $ordersQuery = Sale::where('customer_id', $id)
        ->where('sale_type', 'delivery')
        ->whereIn('status', ['draft', 'completed'])
        ->where('status', '!=', 'cancelled');
    
    // Apply date filter to orders (filter by order created_at)
    if ($startDate && $endDate) {
        $ordersQuery->whereBetween('created_at', [$startDate, $endDate]);
    }
    
    $orders = $ordersQuery->get();
    $totalOrders = $orders->count();
    $totalDeliveryCharges = $orders->sum('total_delivery_charges');
    
    // Get unique vehicle IDs from orders
    $vehicleIds = $orders->pluck('vehicle_id')
        ->filter(fn($id) => $id !== null)
        ->unique()
        ->toArray();
    
    // Calculate total maintenance costs from VehicleMaintenance records
    $totalMaintenanceCosts = 0;
    
    if (count($vehicleIds) > 0) {
        $maintenanceQuery = VehicleMaintenance::whereIn('vehicle_id', $vehicleIds);
        
        // Apply date filter to maintenance records (filter by maintenance_date)
        if ($startDate && $endDate) {
            $maintenanceQuery->whereBetween('maintenance_date', [
                $startDate->format('Y-m-d'),
                $endDate->format('Y-m-d')
            ]);
        }
        
        $totalMaintenanceCosts = $maintenanceQuery->sum('amount');
    }
    
    $netProfit = $totalDeliveryCharges - $totalMaintenanceCosts;
    $profitMargin = $totalDeliveryCharges > 0
        ? ($netProfit / $totalDeliveryCharges) * 100
        : 0;
    
    return response()->json([
        'customer_id' => $customer->id,
        'customer_name' => $customer->name,
        'statistics' => [
            'total_delivery_charges' => (float) $totalDeliveryCharges,
            'total_maintenance_costs' => (float) $totalMaintenanceCosts,
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

## Route Registration

**File:** `routes/api.php` (or wherever customer routes are defined)

```php
Route::middleware(['auth:sanctum'])->group(function () {
    // ... existing customer routes
    
    Route::get('/customers/{id}/delivery-profitability-stats', [CustomerController::class, 'getDeliveryProfitabilityStats'])
        ->middleware('permission:module.customer.read');
});
```

---

## Key Points

1. **Get delivery orders for customer** - Filter by `customer_id`, `sale_type = 'delivery'`, and date range
2. **Extract vehicle IDs** - Get unique vehicle IDs from orders
3. **Sum maintenance costs** - Query VehicleMaintenance table for those vehicles, filtered by date range
4. **Date filtering** - Both orders and maintenance records use the same date range
5. **DO NOT use `sales.maintenance_cost`** - That field is not used anymore

---

## Example Calculation

### Example 1: Monthly View (December 2025)

**Customer Orders in December:**
- Order 1: Vehicle A, Delivery charges = 500
- Order 2: Vehicle A, Delivery charges = 600
- Order 3: Vehicle B, Delivery charges = 400

**Vehicle Maintenance in December:**
- Vehicle A: Fuel (200), Toll (100) = 300
- Vehicle B: Fuel (150), Driver (400) = 550

**API Request:**
```
GET /api/customers/1/delivery-profitability-stats?month=2025-12
```

**Response:**
```json
{
  "statistics": {
    "total_delivery_charges": 1500.00,
    "total_maintenance_costs": 850.00,  // 300 (Vehicle A) + 550 (Vehicle B)
    "net_profit": 650.00,
    "profit_margin_percentage": 43.33,
    "total_orders": 3,
    "period_start": "2025-12-01",
    "period_end": "2025-12-31"
  }
}
```

### Example 2: Custom Range

**API Request:**
```
GET /api/customers/1/delivery-profitability-stats?start_date=2025-12-01&end_date=2025-12-15
```

**Response:**
- Only includes orders created between Dec 1-15
- Only includes maintenance records with `maintenance_date` between Dec 1-15

---

## Frontend Integration

The frontend will call this endpoint instead of calculating on the client side:

```typescript
// In CustomerDeliveryProfit component
const response = await customersApi.getDeliveryProfitabilityStats(customerId, {
  start_date: startDate,
  end_date: endDate,
  // or month: "2025-12"
});
```

---

## Testing Checklist

1. ✅ **Monthly filter:**
   - Request with `month=2025-12`
   - Verify only December orders included
   - Verify only December maintenance records included

2. ✅ **Custom range:**
   - Request with `start_date` and `end_date`
   - Verify only records/orders in range included

3. ✅ **Multiple vehicles:**
   - Customer orders use Vehicle A and Vehicle B
   - Verify maintenance costs from both vehicles are summed

4. ✅ **No maintenance records:**
   - If no maintenance records in period → total_maintenance_costs = 0

5. ✅ **No orders:**
   - If no orders in period → total_delivery_charges = 0, total_orders = 0

---

## Important Notes

### Date Field Selection

**For Orders:**
- Use `created_at` (when order was created)

**For Maintenance Records:**
- Use `maintenance_date` (the date when the maintenance expense occurred)

### Vehicle Filtering

- Only include maintenance costs from vehicles that **actually delivered to this customer** in the selected period
- If a vehicle delivered to the customer but has no maintenance records in the period, it contributes 0 to maintenance costs

### Performance Considerations

- For customers with many orders/vehicles, consider:
  - Caching maintenance statistics
  - Using database indexes on `vehicle_id` and `maintenance_date`
  - Limiting date range queries

---

## Summary

**Key Changes:**
1. ✅ New endpoint: `GET /api/customers/{id}/delivery-profitability-stats`
2. ✅ Calculate maintenance costs from VehicleMaintenance table (not sales.maintenance_cost)
3. ✅ Filter by date range (monthly or custom)
4. ✅ Only include maintenance from vehicles used in customer deliveries
5. ✅ Return period_start and period_end in response

**Benefits:**
- Accurate monthly/period-based profitability tracking
- Maintenance costs reflect actual expenses in the period
- Consistent with vehicle profitability calculation logic

