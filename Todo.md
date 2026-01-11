# Supplier Opening Balances Feature

## Scenario: Importing Legacy Data
When onboarding a new supplier to the ERP, they often have a pre-existing financial history. 
- **Outstanding Dues**: The business already owes money to the supplier from previous (non-ERP) transactions. This is recorded as an `opening_balance` (Liability/Accounts Payable).
- **Advance/Credit**: The business has already prepaid the supplier for future orders. This is recorded as an `opening_advance_balance` (Asset/Supplier Advance).

By providing these fields during supplier creation, the system can:
1. Initialize the supplier's balance correctly.
2. Generate accounting "Opening Balance" journal entries to ensure the General Ledger matches the reality.

## Suggested Frontend Changes

### 1. Supplier Creation/Edit Form
Add the following fields to the `SupplierForm` component:
- **Opening Balance (Payable)**:
    - Label: `Opening Balance (Payable)`
    - Type: `Number`
    - Tooltip: `The amount you already owe this supplier at the time of system setup.`
- **Opening Advance Balance**:
    - Label: `Opening Advance Balance`
    - Type: `Number`
    - Tooltip: `The amount you have already prepaid to this supplier for future orders.`

### 2. API Integration
Update the `StoreSupplierRequest` payload in the frontend to include:
```typescript
{
    // ... existing fields
    opening_balance: number;
    opening_advance_balance: number;
}
```

### 3. Display Logic
- In the **Supplier List** and **Detail** views, ensure the `Outstanding Balance` reflects:
  `(Opening Balance - Opening Advance) + (All Received POs - All Payments)`
- Highlight if a supplier has an active advance balance (negative outstanding balance).
