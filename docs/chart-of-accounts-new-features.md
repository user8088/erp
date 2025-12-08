# Chart of Accounts - New Features Implementation Guide

## Overview

This document describes the new features added to the Chart of Accounts module, including balance display and account deletion functionality.

## Features Implemented

### 1. Display Individual and Cumulative Balances

**Frontend Changes:**
- Added `balance` field to the `Account` type in `app/lib/types.ts`
- Updated `getAccountsTree()` API method to accept an optional `includeBalances` parameter
- Modified both TreeView and ListView to display balance columns
- Balances are formatted with proper currency display (2 decimal places)

**Backend Requirements:**
- The `/api/accounts/tree` endpoint should support a new query parameter: `include_balances` (boolean, default: false)
- When `include_balances=1`:
  - **Ledger accounts** (`is_group = false`): Return the individual account balance
  - **Group accounts** (`is_group = true`): Return the cumulative balance of all descendant ledger accounts
- The balance should be calculated based on the account's normal balance direction (debit/credit)
- Balance field should be a number (decimal) in the response

**Example Response:**
```json
{
  "id": 5,
  "company_id": 1,
  "name": "Cash In Hand",
  "number": "1110",
  "root_type": "asset",
  "is_group": false,
  "normal_balance": "debit",
  "balance": 15000.50,
  ...
}
```

### 2. Account Deletion with Balance Reallocation

**Frontend Changes:**
- Created `DeleteAccountModal` component in `app/components/Accounting/DeleteAccountModal.tsx`
- Added delete buttons to:
  - Tree view (with Trash icon)
  - List view (with Trash icon)
  - Individual account detail page (Delete button in header)
- Added `deleteAccount()` method to the API client

**Modal Features:**
- Displays warning if account has children (prevents deletion)
- If account has a non-zero balance:
  - Shows the current balance
  - Requires user to select a target account for reallocation
  - Provides search/filter functionality for target accounts
  - Only shows accounts with same root_type, is_group=false, and not the account being deleted
- If account has zero balance: allows immediate deletion
- Proper error handling and validation

**Backend Requirements:**

#### DELETE `/api/accounts/{id}` Endpoint

**Request:**
```http
DELETE /api/accounts/{id}
Content-Type: application/json

{
  "reallocate_to_account_id": 10  // Optional, required if balance exists
}
```

**Business Logic:**

1. **Pre-deletion Checks:**
   - Verify the account exists and belongs to the authenticated user's company
   - Check if account has children (`has_children = true`)
     - If yes: Return 400 error with message "Cannot delete account with child accounts"
   
2. **Balance Check:**
   - Calculate the account's current balance
   - If balance is non-zero:
     - Require `reallocate_to_account_id` in request body
     - Validate the target account:
       - Must exist and belong to same company
       - Must be a ledger account (`is_group = false`)
       - Must have the same `root_type` as the account being deleted
       - Cannot be the account being deleted itself
     - If validation fails: Return 422 error
   
3. **Balance Reallocation (if needed):**
   - Create a journal entry to transfer the balance:
     - Date: current date
     - Voucher type: "Account Deletion Transfer" or similar
     - Description: "Balance transfer from [deleted account] to [target account] due to account deletion"
     - Lines:
       - Debit/Credit the deleted account to bring balance to zero
       - Credit/Debit the target account with the same amount
   - Ensure journal entry respects normal balance directions
   
4. **Deletion:**
   - If account has posted transactions:
     - Option A: Prevent deletion and return error
     - Option B: Keep transaction history but mark account as deleted/archived
   - Delete the account record (or soft delete)
   - Clear any caches related to chart of accounts
   
5. **Response:**
   - Success (200): `{ "message": "Account deleted successfully." }`
   - Error (400): Account has children
   - Error (404): Account not found
   - Error (422): Invalid reallocation account or balance exists without reallocation

**Security Considerations:**
- Verify user has `module.accounting,read-write` permission
- Ensure company_id checks to prevent cross-company operations
- Validate all input parameters
- Use database transactions to ensure atomicity

## UI/UX Improvements

### Balance Display
- Tree View: Added a "Balance" column showing formatted balances
- List View: Added a "Balance" column showing formatted balances
- Individual Account Page: Already shows balance in a prominent card

### Delete Functionality
- Delete icons appear in both tree and list views (requires write permission)
- Delete button appears on individual account detail page (requires write permission)
- Modal provides clear warnings and guidance
- Prevents accidental deletions through validation
- Smooth user experience with proper error messages

## API Client Changes

### Updated Methods

1. **getAccountsTree(company_id, includeBalances)**
   ```typescript
   getAccountsTree(company_id: number, includeBalances = false): Promise<Account[]>
   ```
   - Now accepts optional `includeBalances` parameter
   - Passes `include_balances=1` query parameter when true

2. **deleteAccount(id, reallocateToAccountId)**
   ```typescript
   deleteAccount(id: number, reallocateToAccountId?: number | null): Promise<{ message: string }>
   ```
   - New method for account deletion
   - Accepts optional reallocation account ID
   - Invalidates accounts cache after deletion
   - Sends DELETE request with body (if reallocation needed)

## Testing Checklist

### Frontend Testing
- [ ] Tree view displays balances correctly
- [ ] List view displays balances correctly
- [ ] Balances are properly formatted with 2 decimal places
- [ ] Delete button appears only for users with write permission
- [ ] Delete modal opens when delete button is clicked
- [ ] Modal shows warning for accounts with children
- [ ] Modal shows balance and reallocation form for accounts with balance
- [ ] Modal allows deletion for accounts with zero balance
- [ ] Search/filter works in reallocation account selector
- [ ] Deletion succeeds and redirects to chart of accounts
- [ ] Success/error toasts appear appropriately
- [ ] Accounts list refreshes after deletion

### Backend Testing
- [ ] `/api/accounts/tree` returns accounts without balance by default
- [ ] `/api/accounts/tree?include_balances=1` includes balance field
- [ ] Balance calculation is correct for ledger accounts
- [ ] Balance calculation is correct for group accounts (cumulative)
- [ ] DELETE endpoint prevents deletion of accounts with children
- [ ] DELETE endpoint requires reallocation for accounts with balance
- [ ] DELETE endpoint validates reallocation target account
- [ ] Balance reallocation creates proper journal entry
- [ ] Journal entry respects double-entry bookkeeping rules
- [ ] Deletion succeeds for accounts with zero balance
- [ ] Proper error messages returned for various failure scenarios
- [ ] Cache invalidation works correctly
- [ ] Permissions are properly enforced

## Migration Path

1. **Backend Implementation First:**
   - Implement balance calculation logic
   - Add `include_balances` parameter to tree endpoint
   - Implement DELETE endpoint with reallocation logic
   - Test thoroughly with various scenarios

2. **Frontend Already Implemented:**
   - All frontend changes are complete
   - Will work automatically once backend endpoints are ready
   - No frontend migration needed

3. **Data Migration (if needed):**
   - No data migration required
   - Existing accounts work as-is
   - Balance calculations are done on-the-fly

## Notes for Backend Developers

### Balance Calculation
The balance calculation should use the existing `AccountService::getBalance()` method or similar. For group accounts, recursively sum all descendant ledger accounts.

### Journal Entry for Reallocation
When creating the reallocation journal entry:
- Use proper voucher type (suggest adding a new type like "Account Deletion Transfer")
- Ensure debit = credit
- Add reference to the deleted account in description
- Consider adding metadata to track this was an automated reallocation

### Transaction History
Decide on the approach for accounts with transactions:
- **Conservative**: Prevent deletion entirely if any posted transactions exist
- **Moderate**: Allow deletion but keep transaction history (soft delete)
- **Aggressive**: Allow hard delete and cascade (not recommended)

The current frontend implementation assumes accounts can be deleted if balance is reallocated, so backend should support this.

### Performance Considerations
- Balance calculation for large account hierarchies might be expensive
- Consider caching balance values if needed
- Use database indexes on parent_id for efficient tree traversal
- Limit the depth of reallocation searches if needed

## Future Enhancements

1. **Bulk Operations:**
   - Select multiple accounts and delete in batch
   - Bulk reallocation options

2. **Audit Trail:**
   - Log all account deletions
   - Track who deleted what and when
   - Keep deleted account metadata for reference

3. **Undo Functionality:**
   - Allow undoing recent deletions
   - Restore deleted accounts with their balances

4. **Advanced Reallocation:**
   - Suggest common reallocation targets
   - Auto-select based on account naming patterns
   - Preview impact of reallocation

## Support

For questions or issues:
- Frontend code: `app/chart-of-accounts/` and `app/accounting/accounts/`
- Backend specification: `docs/laravel-backend.mdc`
- Component: `app/components/Accounting/DeleteAccountModal.tsx`

