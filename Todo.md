# Customer Refund System - Requirements & Frontend Integration

## 1. Refund Against Invoice
The backend supports recording a refund against a specific invoice. This is applicable for both **Walk-in Sales** and **Order (Delivery) Invoices**.

### API Changes: `POST /api/customer-payments`
*   **Requirement**: When `payment_type` is `refund`, the `invoice_id` field is **required**.
*   **Split Refund Support**: You can send a `payments` array to distribute the refund across multiple accounts.
    ```json
    {
      "customer_id": 1,
      "payment_type": "refund",
      "invoice_id": 123,
      "payments": [
        { "amount": 750, "payment_account_id": 5, "payment_method": "jazzcash" },
        { "amount": 750, "payment_account_id": 2, "payment_method": "cash" }
      ],
      "restock_items": true
    }
    ```

## 2. Frontend Integration: Handling "Negative Due"
If you see a **Negative Due Amount** (e.g., PKR -1,500.00) after a refund, it is because the frontend is likely treating the refund as a positive payment in its calculation.

### The Fix:
*   **Calculation**: `Due Amount = Total Amount - Total Paid`.
*   **Refunds**: In your `payments` list, any payment with `payment_type === 'refund'` must be **subtracted** from the `Total Paid` sum (or treated as a negative value).
*   **Backend Logic**: The backend now automatically reduces both the `amount_paid` AND the `total_amount` of the Sale/Invoice when a refund is processed. This ensures that a fully refunded sale has `Total = 0` and `Paid = 0`, resulting in `Due = 0`.

## 3. Accounting & Loss Account Mapping
Refunds are not just "negative cash"; they represent a reversal of revenue or a loss.

### Mapping for Frontend:
*   **Selectable Refund Account**: The frontend should allow users to select the account to Debit for the refund.
*   **API Field**: `loss_account_id`.
*   **Scenario A: Reverse Revenue (Recommended)**
    - Select the **Store Revenue** account (or a "Sales Returns" Contra-Revenue account).
    - **Result**: Revenue decreases. Net Profit decreases.
*   **Scenario B: Record as Expense**
    - Select a **Loss/Expense** account (e.g., "Sale Loss").
    - **Result**: Revenue stays the same. Expense increases. Net Profit decreases.
*   **Default Behavior**: If `loss_account_id` is empty, it defaults to `pos_sales_revenue` (Scenario A).
*   **Journal Entry**:
    - **Debit**: Selected Account
    - **Credit**: Cash/Bank Account

## 4. Inventory Reversal
*   Use the `restock_items: true` flag in the API request if the customer is returning the physical items.
*   The backend will automatically increment the stock and record a `return` type movement.

## 5. Order Sales (Delivery) - Special Handling
**Order Sales** work differently from Walk-in Sales.
*   **Scenario**: An order is placed, creating a "Due" amount. Payment is collected later.
*   **Rule**: You **CANNOT** refund an Order Sale if it has not been paid yet.
    *   Refunding an unpaid order implies returning money you never received.
*   **Correct Action**: If an order is unpaid and needs to be voided, use the **Cancel Order** feature.
    *   **Cancellation**: Removes the "Customer Due" and reverses the revenue (effectively voiding the sale).
*   **Backend Validation**: The backend will reject refund requests for **unpaid** Order Sales with an error: *"Cannot refund an unpaid order. Please cancel the order instead."*

### Cancel Order Feature
If an order is unpaid (or the customer cancels before payment), use the **Cancel Order** endpoint.

*   **API**: `POST /api/sales/{id}/cancel`
*   **What it does**:
    1.  **Stock Reversal**: Items are returned to inventory (if they were deducted).
    2.  **Accounting Reversal**: Reverses the original Sales Journal Entry (Debits become Credits, Credits become Debits).
        *   *Result*: Customer Due is removed (credited), Revenue is reversed (debited).
    3.  **Status Update**: Sale and Invoice status set to `cancelled`.
*   **Frontend Implementation**:
    *   Add a "Cancel Order" button in the Sale Detail view (for unpaid/draft orders).
    *   Call this API endpoint.
    *   Refresh the view to show the cancelled status.

---

# Implementation Checklist
- [x] Update `CreateCustomerPaymentRequest` validation to support `payments` array and require `invoice_id` for refunds.
- [x] Implement `createRefund` and `createInvoiceRefund` logic in `CustomerPaymentService` to handle split payments.
- [x] Create `Sales Return` journal entry logic (one entry per refund line).
- [x] Update `Sale` and `Invoice` balances (Total and Paid) once per refund request.
- [x] Implement auto-restocking logic for returned items in `StockService`.
- [ ] **Frontend**: Update Refund UI to support multiple refund lines (split refund).
- [ ] **Frontend**: Fix Due Amount calculation to handle refund types correctly.
- [ ] **Frontend**: Add mapping for "Sales Return" account in Settings.
