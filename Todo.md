# Vehicle System Enhancements

## 1. Add Driver Assignment
**Objective**: Allow assigning a staff member as the default driver for a vehicle.

**Database Changes**:
- Add `driver_id` column to `vehicles` table.
- Type: `unsigned big integer`, Nullable.
- Foreign Key: References `id` on `staff` table.

**Backend Logic**:
- **Model**: Update `Vehicle` model to include `driver_id` in `$fillable`.
- **Relationship**: Add `driver()` method to `Vehicle` model (`belongsTo(Staff::class)`).
- **Controller**:
    - Update `store` and `update` methods in `VehicleController` to validate and save `driver_id`.
    - Validation rule: `'driver_id' => 'nullable|exists:staff,id'`.
- **Resource**: Update `VehicleResource` to include:
    ```php
    'driver_id' => $this->driver_id,
    'driver' => $this->whenLoaded('driver', function() {
        return [
            'id' => $this->driver->id,
            'full_name' => $this->driver->full_name,
            'designation' => $this->driver->designation,
        ];
    }),
    ```

## 2. Add Driver to Sales (Delivery Orders)
**Objective**: Allow assigning a driver to a delivery sale (overriding the default vehicle driver).

**Database Changes**:
- Add `driver_id` column to `sales` table.
- Type: `unsigned big integer`, Nullable.
- Foreign Key: References `id` on `staff` table.

**Backend Logic**:
- **Model**: Update `Sale` model to include `driver_id` in `$fillable`.
- **Relationship**: Add `driver()` method to `Sale` model (`belongsTo(Staff::class)`).
- **Controller**:
    - Update `store` method in `SaleController` to validate and save `driver_id`.
    - Validation rule: `'driver_id' => 'nullable|exists:staff,id'`.
- **Resource**: Update `SaleResource` to include driver details.

## 3. Vehicle Maintenance COA Integration
**Objective**: Link vehicle maintenance records to the Chart of Accounts (COA) for proper financial tracking.

**Database Changes**:
- Add `payment_account_id` to `vehicle_maintenance` table (Source of funds).
    - Type: `unsigned big integer`, Nullable.
    - Foreign Key: `accounts` table.
- Add `expense_account_id` to `vehicle_maintenance` table (Expense category).
    - Type: `unsigned big integer`, Nullable.
    - Foreign Key: `accounts` table.

**Backend Logic**:
- **Model**: Update `VehicleMaintenance` model fillables.
- **Controller**:
    - Update `store` and `update` logic to handle financial transactions.
    - When a record is created:
        - Decrease balance of `payment_account_id` (Asset/Credit).
        - Increase balance of `expense_account_id` (Expense/Debit).
        - Create a `JournalEntry` automatically? (Or just update balances directly if simple). *Recommendation: Use Journal Entries for auditability.*

**Frontend Update**:
- Update `VehicleMaintenance.tsx` form to include:
    - **Expense Account**: Dropdown filtering for 'Expense' type accounts (e.g., "Vehicle Repairs", "Fuel Expense").
    - **Payment Account**: Dropdown filtering for 'Asset' type accounts (e.g., "Cash", "Bank").
