# Rental System - Backend Requirements

## 1. Rental Asset Loss Mapping
The backend needs to support a new account mapping type: `rental_asset_loss`.

### Why it's needed:
When a rental item is returned with the condition set to **"Lost"**, the system must perform two critical actions:
1.  **Inventory Adjustment**: Decrease the `quantity_total` of the `RentalItem` to reflect the physical loss.
2.  **Accounting Entry**: Create a journal entry to record the financial loss.
    *   **Debit**: Rental Asset Loss (Expense Account)
    *   **Credit**: Rental Assets (Asset Account)

### Implementation Details:
*   Add `rental_asset_loss` to the allowed `mapping_type` values in the `account_mappings` table/validation.
*   Update the `processReturn` logic to check for this mapping when `return_condition === 'lost'`.
*   Ensure the journal entry is created automatically during the return process for lost items.

---

# Rental System Integration Guide (Frontend)

The rental system has been upgraded to a **Lazy Accrual Engine**. This means rent is calculated "on-the-fly" whenever an agreement is accessed.

## 1. Key Balances & Fields
When fetching a Rental Agreement, pay attention to these fields:

| Field | Description | Frontend Usage |
| :--- | :--- | :--- |
| `outstanding_balance` | Amount the customer currently owes. | Display as "Total Due". |
| `advance_balance` | Prepaid amount available for future rent. | Display as "Advance/Prepaid". |
| `total_accrued_rent` | Total rent charged since the start. | Useful for history/reporting. |
| `last_accrual_date` | The date up to which rent has been calculated. | "Rent calculated up to [Date]". |

## 2. How Balances Work (The Logic)
*   **Automatic Accrual**: Every time you call `GET /api/rentals/agreements/{id}`, the backend checks if any new rent periods (daily/weekly/monthly) have passed. If yes, it updates the balances **before** sending the response.
*   **Advance First**: New rent is automatically deducted from the `advance_balance`. If the advance runs out, the remainder is added to the `outstanding_balance`.
*   **Automatic Netting**: The system ensures that a customer never has both an `outstanding_balance` and an `advance_balance` at the same time. It will automatically "net" them (use the advance to pay the due).

## 3. API Interactions

### Creating an Agreement (`POST /api/rentals/agreements`)
You can now collect an initial payment during creation:
*   **New Field**: `initial_advance_payment` (decimal).
*   **Effect**: This amount will be recorded as the starting `advance_balance`.

### Recording a Payment (`POST /api/rentals/agreements/{id}/payments`)
*   **Logic**: Payments always clear the `outstanding_balance` first.
*   **Overpayments**: Any amount paid above the current due is automatically moved to the `advance_balance`.

### Processing a Return (`POST /api/rentals/returns`)
*   **Final Accrual**: The system will calculate the final rent up to the return date.
*   **Lost Items**: If `return_condition` is set to `lost`:
    - The system will **decrement the Total Quantity** of the item (Asset Loss).
    - It will record the loss in accounting (`DR Rental Asset Loss / CR Rental Assets`).
*   **Refunds & Zero Refunds**: 
    - If `security_deposit_refunded` is `0`, the `refund_account_id` is **optional**.
    - If you set refund to `0`, the system automatically treats the full deposit as a "retained fee" to cover damages/loss.
*   **Refund Tracking**: The response includes `refund_account` details (ID, Name, Number).

### Writing Off Bad Debt (`POST /api/rentals/agreements/{id}/write-off`)
If a customer defaults on rent and you want to clear their balance as a loss:
*   **Endpoint**: `POST /api/rentals/agreements/{id}/write-off`
*   **Input**: `notes` (optional string).
*   **Effect**: Sets `outstanding_balance` to 0 and records the loss (`DR Rental Bad Debt / CR Accounts Receivable`).

## 4. Refund Tracking
The `RentalAgreement` resource now includes a `returns` array.
```json
"returns": [
  {
    "id": 1,
    "return_date": "2026-01-06",
    "security_deposit_refunded": "1000.00",
    "refund_account": {
      "id": 58,
      "name": "Rental Advance",
      "number": "2120"
    }
  }
]
```
Use `refund_account` to show the user which bank/cash account was used for the refund.

---
**Note**: Since balances are calculated on the backend during the GET request, the frontend does not need to perform any rent calculations. Simply display the values returned by the API.
