# Advance Payment Auto-Clear Opening Due Amount - Backend Requirements

## Overview

**CRITICAL BUSINESS RULE:** Advance payments and opening due amounts cannot coexist. When a customer receives an advance payment, it must FIRST be applied to clear the opening due amount (if any), THEN to outstanding invoices, and ONLY THEN should any remaining amount be added to the customer's advance balance.

**Example Scenario:**
- Customer has opening due amount: PKR 5,000
- Customer receives advance payment: PKR 5,000
- Result: Opening due amount cleared (PKR 0), Advance balance: PKR 0 (all used to clear dues)

---

## Payment Processing Logic for Advance Payments

### Updated Algorithm (Including Opening Due Amount)

When `payment_type = "advance_payment"`, the backend must follow this priority order:

1. **Apply to Opening Due Amount FIRST** (if exists)
2. **Apply to Outstanding Invoices** (oldest first)
3. **Add Remaining to Advance Balance** (only after clearing dues)

### Payment Processing Steps

```
Input: Advance Amount = 5,000
Customer State:
  - Opening due amount: 5,000
  - Outstanding Invoices: None

Process:
1. Apply 5,000 to Opening Due Amount
   - Opening due amount remaining = 5,000 - 5,000 = 0
   - Advance remaining = 5,000 - 5,000 = 0
   - Opening due amount cleared ✅

2. No outstanding invoices to pay
3. No remaining advance (all used to clear opening due)
   - Advance balance = 0 ✅

Final Result:
- Opening due amount: 0 (cleared)
- Advance balance: 0 (all used to clear dues)
- Customer status: "clear" (no dues)
```

### More Complex Example

```
Input: Advance Amount = 10,000
Customer State:
  - Opening due amount: 5,000
  - Outstanding Invoices:
    - Invoice #001: 2,000
    - Invoice #002: 1,000

Process:
1. Apply 5,000 to Opening Due Amount
   - Opening due amount remaining = 0 ✅
   - Advance remaining = 10,000 - 5,000 = 5,000

2. Apply 2,000 to Invoice #001
   - Invoice #001: Paid ✅
   - Advance remaining = 5,000 - 2,000 = 3,000

3. Apply 1,000 to Invoice #002
   - Invoice #002: Paid ✅
   - Advance remaining = 3,000 - 1,000 = 2,000

4. Remaining advance = 2,000
   - Add 2,000 to customer advance balance ✅

Final Result:
- Opening due amount: 0 (cleared)
- Invoice #001: Paid
- Invoice #002: Paid
- Advance balance: 2,000
```

---

## Implementation Details

### Database Updates Required

#### 1. Update Customer Opening Due Amount

**When advance payment clears opening due amount:**

```php
// After processing advance payment
if ($customer->opening_due_amount > 0 && $amountAppliedToOpening > 0) {
    $customer->opening_due_amount = max(0, $customer->opening_due_amount - $amountAppliedToOpening);
    $customer->status = ($customer->opening_due_amount == 0 && $unpaidInvoicesCount == 0) 
        ? 'clear' 
        : 'has_dues';
    $customer->save();
}
```

#### 2. Create Payment Records

For opening due amount payment (using advance):
```php
CustomerPayment::create([
    'customer_id' => $customer->id,
    'payment_type' => 'invoice_payment', // Treat as invoice payment
    'invoice_id' => null, // No invoice - it's opening balance
    'amount' => $amountAppliedToOpening,
    'use_advance' => true,
    'payment_account_id' => null,
    'payment_date' => $payment->payment_date,
    'payment_method' => $payment->payment_method,
    'reference_number' => $payment->reference_number,
    'notes' => 'Auto-applied from advance payment to clear opening due amount',
]);
```

**Note:** Since there's no actual invoice, you may need to handle this differently:
- Option 1: Create payment record with `invoice_id = NULL` and special flag
- Option 2: Create a virtual/synthetic invoice record for opening balance
- Option 3: Track opening balance payments separately

### Response Structure Updates

**When `payment_type = "advance_payment"` with opening due amount cleared:**

```json
{
  "payment": {
    "id": 789,
    "customer_id": 123,
    "payment_type": "advance_payment",
    "amount": 10000.00,
    "payment_method": "cash",
    "payment_account_id": 5,
    "payment_date": "2025-01-15",
    "reference_number": null,
    "notes": "Customer advance payment",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  },
  "opening_due_cleared": {
    "amount_applied": 5000.00,
    "opening_due_before": 5000.00,
    "opening_due_after": 0.00,
    "cleared": true
  },
  "auto_applied_payments": [
    {
      "id": 790,
      "invoice_id": 456,
      "invoice_number": "INV-20250110-001",
      "amount_applied": 2000.00,
      "invoice_status_after": "paid",
      "remaining_invoice_balance": 0.00
    }
  ],
  "advance_summary": {
    "total_advance_received": 10000.00,
    "amount_applied_to_opening_due": 5000.00,
    "amount_applied_to_invoices": 2000.00,
    "remaining_advance_balance": 3000.00,
    "customer_new_advance_balance": 3000.00
  },
  "message": "Advance payment recorded. Cleared opening due: PKR 5,000.00. Applied PKR 2,000.00 to 1 invoice(s). Remaining balance: PKR 3,000.00"
}
```

### New Response Fields

Add to advance payment response:

| Field | Type | Description |
|-------|------|-------------|
| `opening_due_cleared` | object | Details about opening due amount clearing |
| `opening_due_cleared.amount_applied` | number | Amount applied to clear opening due |
| `opening_due_cleared.opening_due_before` | number | Opening due amount before payment |
| `opening_due_cleared.opening_due_after` | number | Opening due amount after payment |
| `opening_due_cleared.cleared` | boolean | Whether opening due was fully cleared |
| `advance_summary.amount_applied_to_opening_due` | number | Total amount applied to opening due |

---

## Chart of Accounts (COA) Integration

### Journal Entry Creation

#### 1. Advance Payment Received (with auto-clear opening due)

**Scenario:** Customer receives PKR 10,000 advance, clears PKR 5,000 opening due, pays PKR 2,000 invoice, remaining PKR 3,000 to advance balance.

**Journal Entries:**

**Entry 1: Opening Due Amount Cleared (using advance)**
```
DR Accounts Receivable (Customer)    PKR 5,000.00
CR Customer Advance (Liability)      PKR 5,000.00
```
- **Description:** "Opening due amount cleared using advance payment"

**Entry 2: Invoice Payment (using advance)**
```
DR Accounts Receivable (Customer)    PKR 2,000.00
CR Customer Advance (Liability)      PKR 2,000.00
```
- **Description:** "Invoice payment using advance (auto-applied)"

**Entry 3: Remaining Advance to Balance**
```
DR Cash/Bank Account (Asset)         PKR 10,000.00
CR Customer Advance (Liability)      PKR 7,000.00  (5,000 + 2,000 used)
CR Customer Advance (Liability)      PKR 3,000.00  (remaining)
```
**OR** (more accurate):
```
DR Cash/Bank Account (Asset)         PKR 10,000.00
CR Accounts Receivable (Customer)    PKR 7,000.00  (clearing AR)
CR Customer Advance (Liability)      PKR 3,000.00  (remaining to advance)
```

**Wait - Let me reconsider the accounting flow:**

Actually, the correct flow should be:

**Entry 1: Advance Payment Received**
```
DR Cash/Bank Account (Asset)         PKR 10,000.00
CR Customer Advance (Liability)      PKR 10,000.00
```

**Entry 2: Opening Due Cleared (using advance)**
```
DR Customer Advance (Liability)      PKR 5,000.00
CR Accounts Receivable (Customer)    PKR 5,000.00
```

**Entry 3: Invoice Payment (using advance)**
```
DR Customer Advance (Liability)      PKR 2,000.00
CR Accounts Receivable (Customer)    PKR 2,000.00
```

**Net Result:**
- Cash Account: +PKR 10,000 (debit)
- Customer Advance Account: +PKR 3,000 (credit) [10,000 - 5,000 - 2,000]
- Accounts Receivable: -PKR 7,000 (credit/debit) [reduced by 7,000]

### Implementation Code

```php
// When payment_type = "advance_payment"
$advanceAmount = $payment->amount;
$remainingAdvance = $advanceAmount;

// Step 1: Receive advance payment
$cashAccountId = $payment->payment_account_id;
$advanceAccountId = getAccountMapping('pos_advance');

JournalEntryService::create([
    'date' => $payment->payment_date,
    'voucher_type' => 'Advance Payment',
    'reference_type' => 'customer_payment',
    'reference_id' => $payment->id,
    'description' => "Advance payment received from customer",
    'lines' => [
        [
            'account_id' => $cashAccountId,
            'debit' => $advanceAmount,
            'credit' => 0,
            'party_type' => 'customer',
            'party_id' => $payment->customer_id,
        ],
        [
            'account_id' => $advanceAccountId,
            'debit' => 0,
            'credit' => $advanceAmount,
            'party_type' => 'customer',
            'party_id' => $payment->customer_id,
        ]
    ]
]);

// Step 2: Apply to opening due amount
$amountAppliedToOpening = 0;
if ($customer->opening_due_amount > 0 && $remainingAdvance > 0) {
    $amountAppliedToOpening = min($customer->opening_due_amount, $remainingAdvance);
    
    $arAccountId = getAccountMapping('pos_ar');
    
    JournalEntryService::create([
        'date' => $payment->payment_date,
        'voucher_type' => 'Opening Balance Payment (Advance)',
        'reference_type' => 'customer_payment',
        'reference_id' => $payment->id,
        'description' => "Opening due amount cleared using advance payment",
        'lines' => [
            [
                'account_id' => $advanceAccountId,
                'debit' => $amountAppliedToOpening,
                'credit' => 0,
                'party_type' => 'customer',
                'party_id' => $payment->customer_id,
            ],
            [
                'account_id' => $arAccountId,
                'debit' => 0,
                'credit' => $amountAppliedToOpening,
                'party_type' => 'customer',
                'party_id' => $payment->customer_id,
            ]
        ]
    ]);
    
    // Update customer opening due amount
    $customer->opening_due_amount = max(0, $customer->opening_due_amount - $amountAppliedToOpening);
    $remainingAdvance -= $amountAppliedToOpening;
}

// Step 3: Apply to outstanding invoices (existing logic)
// ... (continue with invoice payment logic)

// Step 4: Remaining advance already in Customer Advance account
// (No additional journal entry needed - already credited in Step 1)
```

---

## Business Rules

### 1. Priority Order (MUST BE FOLLOWED)

1. **Opening Due Amount** - Apply advance to clear opening due amount FIRST
2. **Outstanding Invoices** - Then apply to invoices (oldest first)
3. **Advance Balance** - Only remaining amount goes to advance balance

### 2. Opening Due Amount Cannot Be Negative

- Opening due amount should never go below 0
- If advance amount > opening due amount, use exact amount to clear it
- Example: Opening due = 3,000, Advance = 5,000 → Clear 3,000, remaining 2,000

### 3. Customer Status Update

- If opening due amount is cleared AND no unpaid invoices: `status = "clear"`
- Otherwise: `status = "has_dues"`

### 4. Payment Records

- Create payment record for opening due amount clearing
- Link to original advance payment
- Track amount applied for reporting

---

## Testing Scenarios

### Test Case 1: Advance Exactly Clears Opening Due
- **Setup:** Opening due = 5,000
- **Action:** Receive advance = 5,000
- **Expected:**
  - Opening due: 0 (cleared)
  - Advance balance: 0
  - Customer status: "clear"

### Test Case 2: Advance More Than Opening Due
- **Setup:** Opening due = 5,000
- **Action:** Receive advance = 10,000
- **Expected:**
  - Opening due: 0 (cleared)
  - Advance balance: 5,000 (remaining)
  - Journal entries: Correct debits/credits

### Test Case 3: Advance Less Than Opening Due
- **Setup:** Opening due = 10,000
- **Action:** Receive advance = 5,000
- **Expected:**
  - Opening due: 5,000 (reduced)
  - Advance balance: 0 (all used)
  - Customer status: "has_dues"

### Test Case 4: Opening Due + Invoices
- **Setup:** Opening due = 5,000, Invoice = 2,000
- **Action:** Receive advance = 10,000
- **Expected:**
  - Opening due: 0 (cleared)
  - Invoice: Paid
  - Advance balance: 3,000 (remaining)

### Test Case 5: No Opening Due (Existing Behavior)
- **Setup:** Opening due = 0
- **Action:** Receive advance = 5,000
- **Expected:**
  - Opening due: 0 (unchanged)
  - Advance balance: 5,000
  - Existing auto-apply to invoices logic works

---

## Frontend Considerations

The frontend already handles advance payment auto-apply responses. It expects:
- `auto_applied_payments` array (for invoices)
- `advance_summary` object (with totals)

**Update Required:**
- Frontend should display `opening_due_cleared` information if provided
- Update advance summary display to show opening due amount cleared

**No Breaking Changes:** If backend doesn't provide `opening_due_cleared`, frontend should continue to work (backward compatible).

---

## Implementation Checklist

- [ ] Update advance payment processing to check opening due amount first
- [ ] Apply advance to opening due amount before invoices
- [ ] Update customer opening_due_amount field when cleared
- [ ] Create journal entries for opening due clearing
- [ ] Update customer status when opening due is cleared
- [ ] Add `opening_due_cleared` to response structure
- [ ] Add `amount_applied_to_opening_due` to advance_summary
- [ ] Update payment records creation (handle NULL invoice_id for opening balance)
- [ ] Update COA journal entries (proper debits/credits)
- [ ] Unit tests for all scenarios
- [ ] Integration tests for complete flow
- [ ] Manual testing

---

## Important Notes

1. **Opening Due Amount is NOT an Invoice:** It's stored in `customers.opening_due_amount` field, not as an invoice record. Handle it separately.

2. **COA Accounting:** When advance clears opening due:
   - Customer Advance account is debited (reduced)
   - Accounts Receivable is credited (reduced)
   - Cash account was already debited when advance received

3. **No Double Counting:** Make sure opening due amount is only cleared once per advance payment.

4. **Atomic Transactions:** All operations (payment creation, customer update, journal entries) must be in a single database transaction.

---

## Summary

**Key Points:**
- Advance payments MUST clear opening due amounts FIRST
- Only remaining advance goes to advance balance
- COA must reflect all transactions correctly
- Customer status must update appropriately
- Response must include opening due clearing details

**The backend must ensure that advance and due amounts never coexist - advance always clears dues first.**
