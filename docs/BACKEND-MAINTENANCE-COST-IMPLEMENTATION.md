# Frontend Documentation: Maintenance Cost Changes

## Overview

The maintenance cost feature has been updated. **Maintenance cost is now defined once on the Vehicle profile** (per delivery run) instead of being entered for each delivery order. This simplifies the workflow and provides consistent cost tracking.

---

## Key Changes

### Before
- `maintenance_cost` was sent when creating delivery orders
- Each order could have a different maintenance cost
- Maintenance cost was stored on each `sale` record

### After
- `maintenance_cost` is **defined on the Vehicle profile**
- All delivery orders for a vehicle use the same per-run maintenance cost
- Maintenance cost is stored on the `vehicle` record
- Vehicle profitability automatically calculates: `vehicle.maintenance_cost × total_orders`

---

## API Changes

### 1. Create Sale Endpoint - `POST /api/sales`

**❌ REMOVED:** `maintenance_cost` field is no longer accepted

**Before:**
```json
{
  "sale_type": "delivery",
  "customer_id": 5,
  "vehicle_id": 1,
  "maintenance_cost": 300.00,  // ❌ No longer accepted
  "items": [...]
}
```

**After:**
```json
{
  "sale_type": "delivery",
  "customer_id": 5,
  "vehicle_id": 1,
  // maintenance_cost is NOT sent - it's defined on the vehicle
  "items": [...]
}
```

**Action Required:** Remove `maintenance_cost` from your sale creation form/request.

---

### 2. Vehicle Endpoints

#### Create Vehicle - `POST /api/vehicles`

**✅ NEW:** `maintenance_cost` field is now accepted

```json
{
  "name": "Truck-001",
  "registration_number": "ABC-123",
  "type": "truck",
  "status": "active",
  "maintenance_cost": 300.00,  // ✅ NEW: Optional, per delivery run
  "notes": "Main delivery truck"
}
```

**Validation:**
- `maintenance_cost`: optional, numeric, minimum: 0
- Defaults to 0 if not provided

---

#### Update Vehicle - `PUT /api/vehicles/{id}`

**✅ NEW:** `maintenance_cost` field can be updated

```json
{
  "maintenance_cost": 350.00  // Update maintenance cost per delivery run
}
```

**Example Request:**
```javascript
const updateVehicleMaintenanceCost = async (vehicleId, maintenanceCost) => {
  const response = await fetch(`/api/vehicles/${vehicleId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      maintenance_cost: maintenanceCost
    })
  });
  return response.json();
};
```

---

#### Get Vehicle - `GET /api/vehicles/{id}`

**✅ NEW:** Response now includes `maintenance_cost` field

```json
{
  "id": 1,
  "name": "Truck-001",
  "registration_number": "ABC-123",
  "type": "truck",
  "status": "active",
  "maintenance_cost": 300.00,  // ✅ NEW: Per delivery run cost
  "notes": "Main delivery truck",
  "created_at": "2025-12-19T08:00:00.000000Z",
  "updated_at": "2025-12-19T08:00:00.000000Z"
}
```

---

### 3. Vehicle Profitability Stats - `GET /api/vehicles/{id}/profitability-stats`

**✅ UPDATED:** Calculation logic changed

**Response:**
```json
{
  "vehicle_id": 1,
  "vehicle_name": "Truck-001",
  "registration_number": "ABC-123",
  "statistics": {
    "total_delivery_charges": 5600.00,
    "total_maintenance_costs": 1200.00,  // vehicle.maintenance_cost × total_orders
    "net_profit": 4400.00,
    "profit_margin_percentage": 78.57,
    "total_orders": 4
  }
}
```

**Calculation:**
- `total_maintenance_costs` = `vehicle.maintenance_cost × total_orders`
- Example: If `vehicle.maintenance_cost = 300` and `total_orders = 4`, then `total_maintenance_costs = 1200`

---

### 4. Sale Response - `GET /api/sales/{id}`

**⚠️ NOTE:** The `maintenance_cost` field may still appear in sale responses (for backward compatibility), but it's **not used** in profitability calculations. The system now uses the vehicle's `maintenance_cost` instead.

---

## Frontend Implementation Guide

### 1. Update Sale Creation Form

**Remove maintenance_cost field from delivery order creation:**

```jsx
// ❌ OLD - Remove this
<FormField
  name="maintenance_cost"
  label="Maintenance Cost"
  type="number"
  min={0}
/>

// ✅ NEW - Don't include maintenance_cost in sale form
// It's automatically taken from the vehicle profile
```

**Updated form example:**
```jsx
const DeliveryOrderForm = ({ vehicleId }) => {
  const [formData, setFormData] = useState({
    sale_type: 'delivery',
    customer_id: '',
    vehicle_id: vehicleId,
    delivery_address: '',
    expected_delivery_date: '',
    // maintenance_cost removed - not needed anymore
    items: []
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const response = await fetch('/api/sales', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData) // No maintenance_cost here
    });
    
    return response.json();
  };

  // ... rest of form
};
```

---

### 2. Add Maintenance Cost to Vehicle Form

**Vehicle Create/Edit Form:**

```jsx
const VehicleForm = ({ vehicle, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: vehicle?.name || '',
    registration_number: vehicle?.registration_number || '',
    type: vehicle?.type || '',
    status: vehicle?.status || 'active',
    maintenance_cost: vehicle?.maintenance_cost || 0,  // ✅ NEW FIELD
    notes: vehicle?.notes || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = vehicle 
      ? `/api/vehicles/${vehicle.id}` 
      : '/api/vehicles';
    const method = vehicle ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    
    return response.json();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... other fields ... */}
      
      <div className="form-group">
        <label htmlFor="maintenance_cost">
          Maintenance Cost Per Delivery Run (Rs)
        </label>
        <input
          type="number"
          id="maintenance_cost"
          name="maintenance_cost"
          value={formData.maintenance_cost}
          onChange={(e) => setFormData({
            ...formData,
            maintenance_cost: parseFloat(e.target.value) || 0
          })}
          min={0}
          step={0.01}
          placeholder="e.g., 300.00"
        />
        <small className="text-muted">
          This cost is applied to each delivery run for this vehicle.
          Example: Fuel cost per delivery (Rs 300 per run).
        </small>
      </div>
      
      {/* ... submit button ... */}
    </form>
  );
};
```

---

### 3. Display Maintenance Cost in Vehicle Details

**Vehicle Detail/View Component:**

```jsx
const VehicleDetails = ({ vehicleId }) => {
  const [vehicle, setVehicle] = useState(null);
  
  useEffect(() => {
    fetch(`/api/vehicles/${vehicleId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setVehicle(data.vehicle));
  }, [vehicleId]);

  if (!vehicle) return <div>Loading...</div>;

  return (
    <div className="vehicle-details">
      <h2>{vehicle.name}</h2>
      <p>Registration: {vehicle.registration_number}</p>
      
      {/* ✅ NEW: Display maintenance cost */}
      <div className="info-section">
        <label>Maintenance Cost Per Delivery Run:</label>
        <span className="value">
          Rs {parseFloat(vehicle.maintenance_cost || 0).toFixed(2)}
        </span>
        <small>
          This cost is automatically applied to each delivery order.
        </small>
      </div>
      
      {/* ... other vehicle details ... */}
    </div>
  );
};
```

---

### 4. Update Profitability Display

**The profitability stats endpoint response structure hasn't changed**, but the calculation logic has. No frontend changes needed for displaying profitability - it will automatically use the new calculation.

```jsx
const VehicleProfitability = ({ vehicleId }) => {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch(`/api/vehicles/${vehicleId}/profitability-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data.statistics));
  }, [vehicleId]);

  if (!stats) return <div>Loading...</div>;

  return (
    <div className="profitability-dashboard">
      <div className="stat-card">
        <h3>Total Delivery Charges</h3>
        <p className="amount">Rs {stats.total_delivery_charges.toFixed(2)}</p>
        <small>Revenue from deliveries</small>
      </div>
      
      <div className="stat-card">
        <h3>Total Maintenance Costs</h3>
        <p className="amount cost">
          Rs {stats.total_maintenance_costs.toFixed(2)}
        </p>
        <small>
          From delivery orders 
          (vehicle maintenance cost × {stats.total_orders} orders)
        </small>
      </div>
      
      <div className="stat-card">
        <h3>Net Profit</h3>
        <p className="amount profit">
          Rs {stats.net_profit.toFixed(2)}
        </p>
        <small>Delivery charges - Maintenance costs</small>
      </div>
      
      <div className="stat-card">
        <h3>Profit Margin</h3>
        <p className="amount profit">
          {stats.profit_margin_percentage.toFixed(2)}%
        </p>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${stats.profit_margin_percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

---

## Migration Checklist

- [ ] **Remove `maintenance_cost` field from delivery order creation form**
- [ ] **Add `maintenance_cost` field to vehicle create/edit form**
- [ ] **Display `maintenance_cost` in vehicle details view**
- [ ] **Update vehicle list/details to show maintenance cost**
- [ ] **Test vehicle creation with maintenance_cost**
- [ ] **Test vehicle update with maintenance_cost**
- [ ] **Verify profitability calculations show correct values**
- [ ] **Update any documentation/user guides**

---

## Example Workflow

### Setting Up a Vehicle

1. **Create or Edit Vehicle:**
   ```javascript
   PUT /api/vehicles/1
   {
     "maintenance_cost": 300.00  // Set fuel cost per delivery run
   }
   ```

2. **Create Delivery Orders:**
   ```javascript
   POST /api/sales
   {
     "sale_type": "delivery",
     "vehicle_id": 1,
     "customer_id": 5,
     "items": [...]
     // No maintenance_cost needed!
   }
   ```

3. **Check Profitability:**
   ```javascript
   GET /api/vehicles/1/profitability-stats
   // Returns total_maintenance_costs = 300 × number_of_orders
   ```

---

## Backward Compatibility

- Existing sales with `maintenance_cost` in the database are **not affected**
- The `maintenance_cost` field may still appear in sale responses but is **ignored** for profitability calculations
- Old delivery orders will continue to work normally
- New orders will use the vehicle's `maintenance_cost` for calculations

---

## Benefits

1. **Simplified Workflow:** Set maintenance cost once per vehicle, not per order
2. **Consistency:** All orders for a vehicle use the same cost basis
3. **Easier Management:** Update vehicle profile to change costs for all future orders
4. **Automatic Calculation:** Profitability stats automatically include maintenance costs

---

## Questions?

If you need clarification or encounter any issues, please refer to:
- `SALES_API_DOCUMENTATION.md` - Sales API details
- `TRANSPORT_API_DOCUMENTATION.md` - Vehicle API details

