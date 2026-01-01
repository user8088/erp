# COA Negative Balance Validation - Backend Requirements

## Overview

This document specifies the backend validation requirements for preventing accounts from going negative based on their account type. This validation must be enforced on the backend to ensure data integrity, even if frontend validation is bypassed.

## Account Type Rules

Based on standard accounting principles, the following rules apply:

| Account Type | Can Go Negative? | Notes |
|-------------|------------------|-------|
| **Assets** | ❌ No | Assets should not have negative balances (e.g., Cash, Inventory, Accounts Receivable) |
| **Liabilities** | ✅ Yes | Liabilities can have negative balances (e.g., overpayment of Accounts Payable) |
| **Income** | ❌ No | Income accounts should not go negative (revenue cannot be negative) |
| **Expenses** | ❌ No | Expense accounts should not go negative (expenses cannot be negative) |
| **Equity** | ✅ Yes | Equity can have negative balances (e.g., accumulated losses) |

## Validation Requirements

### 1. Journal Entry Creation (`POST /api/journal-entries`)

**When**: Before creating a journal entry, validate that no account would go negative after applying the transaction.

**Validation Logic**:

1. **Net-Zero Transaction Check** (First):
   - For each line, check if both `debit > 0` and `credit > 0` on the same account
   - If true, **reject** the entry with error:
     ```
     "Account '{account_name}' has both debit and credit amounts. This results in a net-zero effect and is unusual. Please use separate accounts or remove one of the amounts."
     ```
   - **Rationale**: Having both debit and credit on the same account in a single line is unusual and often indicates an error. The net effect is zero, making the entry unnecessary.

2. **Negative Balance Check** (Second):
   - For each line in the journal entry:
     - Get the account's current balance
     - Calculate the new balance after applying the debit/credit:
       - **For debit normal balance accounts** (Assets, Expenses):
         ```
         new_balance = current_balance + debit_amount - credit_amount
         ```
       - **For credit normal balance accounts** (Liabilities, Equity, Income):
         ```
         new_balance = current_balance + credit_amount - debit_amount
         ```
     - Check if the account type allows negative balances:
       - If `root_type` is `"asset"`, `"income"`, or `"expense"`: reject if `new_balance < 0`
       - If `root_type` is `"liability"` or `"equity"`: allow negative balances

2. **Error Response** (422 Unprocessable Entity):
   ```json
   {
     "message": "Validation failed",
     "errors": {
       "lines": [
         "Account 'Cash In Hand' (asset) cannot have a negative balance. Current balance: 5,000.00. This transaction would result in: -2,000.00."
       ]
     }
   }
   ```

### 2. Other Transaction Sources

The same validation should be applied to **all** sources that create journal entries:

- **Point of Sale (POS) Sales**: When creating sales transactions
- **Purchase Orders**: When creating purchase transactions
- **Payment Entries**: When recording customer/supplier payments
- **Stock Movements**: When adjusting inventory
- **Any other module** that creates journal entries

### 3. Implementation Considerations

#### 3.1 Balance Calculation

The balance calculation must account for:
- The account's `normal_balance` field (`"debit"` or `"credit"`)
- The account's `root_type` field (`"asset"`, `"liability"`, `"equity"`, `"income"`, `"expense"`)

#### 3.2 Current Balance Retrieval

- Use the account's current balance from the database
- Ensure balance is calculated correctly considering all posted transactions up to the entry date
- For entries dated in the past, consider the balance as of that date

#### 3.3 Transaction Isolation

- Perform validation within the same database transaction as the journal entry creation
- This ensures no race conditions where two entries are validated simultaneously

#### 3.4 Error Messages

Error messages should be clear and include:
- Account name
- Account type
- Current balance
- Projected balance after the transaction

### 4. Example Validation Scenarios

#### Scenario 0: Net-Zero Transaction (Same Account) ❌
```
Account: "Cash In Hand"
Line: Debit 10,000.00, Credit 10,000.00
Net Effect: 0.00 (balance unchanged)

Result: REJECTED - Both debit and credit on same account is unusual and likely an error
```

#### Scenario 1: Asset Account Going Negative ❌
```
Account: "Cash In Hand" (asset, debit normal)
Current Balance: 1,000.00
Transaction: Credit 2,000.00
New Balance: 1,000.00 - 2,000.00 = -1,000.00

Result: REJECTED - Asset accounts cannot go negative
```

#### Scenario 2: Liability Account Going Negative ✅
```
Account: "Accounts Payable" (liability, credit normal)
Current Balance: 5,000.00
Transaction: Debit 6,000.00
New Balance: 5,000.00 - 6,000.00 = -1,000.00

Result: ALLOWED - Liability accounts can go negative (overpayment)
```

#### Scenario 3: Income Account Going Negative ❌
```
Account: "Sales Revenue" (income, credit normal)
Current Balance: 10,000.00
Transaction: Debit 15,000.00
New Balance: 10,000.00 - 15,000.00 = -5,000.00

Result: REJECTED - Income accounts cannot go negative
```

### 5. API Endpoint Updates

#### 5.1 Journal Entry Creation

**Endpoint**: `POST /api/journal-entries`

**Additional Validation**:
- After validating double-entry balance (debits = credits)
- Before creating the journal entry in the database
- Check each line's account balance projection

**Response on Validation Failure**:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "lines": [
      "Account 'Cash In Hand' (asset) cannot have a negative balance. Current balance: 1,000.00. This transaction would result in: -500.00."
    ]
  }
}
```

### 6. Testing Requirements

The backend should include tests for:

1. ✅ Asset account cannot go negative
2. ✅ Income account cannot go negative
3. ✅ Expense account cannot go negative
4. ✅ Liability account can go negative
5. ✅ Equity account can go negative
6. ✅ Validation works with multiple lines in a single entry
7. ✅ Validation considers account's normal balance correctly
8. ✅ Validation works for entries dated in the past
9. ✅ Validation works for entries dated in the future

### 7. Configuration (Optional)

Consider adding a configuration option to allow administrators to:
- Override validation for specific accounts (with audit trail)
- Temporarily disable validation for specific transaction types
- Set custom minimum balance thresholds per account

If implemented, these should be:
- Clearly documented
- Require appropriate permissions
- Logged in audit trail

### 8. Frontend Integration

The frontend will also perform this validation for immediate user feedback, but **backend validation is mandatory** and must always be enforced regardless of frontend validation.

## Implementation Priority

**Priority: High**

This validation is critical for maintaining accounting data integrity and preventing invalid financial states.

## Related Documents

- `docs/chart-of-accounts-backend.mdc` - Chart of Accounts specification
- `docs/accounting-transactions-backend.mdc` - Journal Entry API specification
- `docs/laravel-backend.mdc` - General backend API documentation

