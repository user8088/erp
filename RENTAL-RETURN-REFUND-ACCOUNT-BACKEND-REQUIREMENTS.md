# Rental Return Refund Account Selection - Backend Requirements

## Issue

Currently, the frontend has to guess which accounts are valid "refund accounts" by filtering asset accounts based on name patterns. This is problematic because:

1. Chart of Accounts is dynamic - accounts can be named anything
2. Hardcoding bank names is not maintainable
3. We need to always show the security deposit payment account and allow selection of any valid payment/refund account

## Current Frontend Solution (Temporary)

The frontend currently:
- Always includes the `security_deposit_payment_account_id` from the agreement
- Includes mapped rental cash/bank accounts from rental settings
- Shows all asset accounts (as a workaround)

## Preferred Backend Solution

### Option 1: Account Flag/Attribute (Recommended)

Add a boolean field to the `accounts` table:
- `is_payment_account` (boolean, default: false)
- When `true`, the account can be used for payments/refunds
- Admins can mark accounts as payment accounts in the Chart of Accounts UI

**API Endpoint:**
```
GET /api/accounts/payment-accounts
Query params: company_id
Returns: List of accounts where is_payment_account = true
```

### Option 2: Account Type/Category

Add an enum field to the `accounts` table:
- `account_category` (enum: 'general', 'payment', 'receivable', 'payable', etc.)
- More flexible but requires migration

### Option 3: Dynamic Endpoint (Simpler)

Create a dedicated endpoint that returns accounts suitable for refunds:
```
GET /api/rental/refund-accounts
Query params: company_id, agreement_id (optional - to include security_deposit_payment_account_id)
Returns: List of asset accounts that are valid for refunds
```

This endpoint can use business logic to determine which accounts are valid (e.g., asset accounts that are not disabled, optionally filtered by some criteria).

## Recommendation

**Option 1 (is_payment_account flag)** is the cleanest long-term solution as it:
- Gives admins control over which accounts can be used for payments
- Is explicit and clear
- Can be used across all modules (selling, buying, rental, etc.)
- Doesn't require guessing based on account names

## Implementation Priority

**Medium** - The current frontend workaround (showing all asset accounts) works but is not ideal. This improvement would make the UI cleaner and more maintainable.

