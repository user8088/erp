# Backend Implementation: Chart of Accounts Balance Display & Account Deletion

## Overview
Implement two new features for the Chart of Accounts API:
1. Display individual and cumulative balances in the accounts tree
2. Delete accounts with balance reallocation

## Priority 1: Balance Display in Tree View

### Requirements

#### Modify GET `/api/accounts/tree` Endpoint

**Current endpoint:**
```
GET /api/accounts/t# API Quick Reference: New Chart of Accounts Features

## 1. Balance Display in Tree View

### Endpoint
```
GET /api/accounts/tree
```

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `company_id` | integer | Yes | - | The company ID |
| `include_balances` | boolean | No | `false` A| Include balance calculations in response |

### Examples

#### Without Balances (Default Behavior)
```bash
curl -X GET "http://localhost:8000/api/accounts/tree?company_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### With Balances
```bash
curl -X GET "http://localhost:8000/api/accounts/tree?company_id=1&include_balances=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

or

```bash
curl -X GET "http://localhost:8000/api/accounts/tree?company_id=1&include_balances=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response Structure (with balances)
```json
[
  {
    "id": 1,
    "company_id": 1,
    "name": "Assets",
    "number": "1000",
    "root_type": "asset",
    "is_group": true,
    "normal_balance": null,
    "balance": 125000.50,
    "tax_rate": null,
    "is_disabled": false,
    "currency": "PKR",
    "parent_id": null,
    "parent_name": null,
    "has_children": true,
    "children": [
      {
        "id": 2,
        "name": "Current Assets",
        "balance": 75000.50,
        "is_group": true,
        "children": [
          {
            "id": 5,
            "name": "Cash In Hand",
            "balance": 15000.50,
            "is_group": false,
            "normal_balance": "debit",
            "children": []
          }
        ]
      }
    ]
  }
]
```

### Balance Calculation Rules
- **Ledger Accounts** (is_group = false): Individual balance from journal entries
- **Group Accounts** (is_group = true): Sum of all descendant ledger accounts
- **Debit Normal Balance**: `total_debit - total_credit`
- **Credit Normal Balance**: `total_credit - total_debit`

---

## 2. Account Deletion with Balance Reallocation

### Endpoint
```
DELETE /api/accounts/{id}
```

### Request Body (Optional)
```json
{
  "reallocate_to_account_id": 10
}
```

### Validation Rules

#### Account Being Deleted
- ❌ Must NOT have child accounts
- ⚠️ If has balance, must provide `reallocate_to_account_id`

#### Target Account (if balance exists)
- ✅ Must exist
- ✅ Must belong to same company
- ✅ Must be a ledger account (not a group)
- ✅ Must have same root type
- ❌ Cannot be the same account being deleted

### Examples

#### Delete Account Without Balance
```bash
curl -X DELETE "http://localhost:8000/api/accounts/15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Success Response (200)**:
```json
{
  "message": "Account deleted successfully."
}
```

#### Delete Account With Balance (Requires Reallocation)
```bash
curl -X DELETE "http://localhost:8000/api/accounts/5" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reallocate_to_account_id": 10
  }'
```

**Success Response (200)**:
```json
{
  "message": "Account deleted successfully."
}
```

**Side Effect**: Creates a journal entry with:
- Voucher Type: "Account Deletion Transfer"
- Reference Number: "ADT-{timestamp}"
- Description: Details of the transfer
- Status: Automatically posted

### Error Responses

#### Account Has Children (422)
```json
{
  "message": "Validation failed.",
  "errors": {
    "account": [
      "Cannot delete account with child accounts. Please delete or move child accounts first."
    ]
  }
}
```

#### Account Has Balance Without Reallocation (422)
```json
{
  "message": "Validation failed.",
  "errors": {
    "reallocate_to_account_id": [
      "Account has a balance. Please specify a target account for balance reallocation."
    ]
  }
}
```

#### Target Account Not Found (422)
```json
{
  "message": "Validation failed.",
  "errors": {
    "reallocate_to_account_id": [
      "Target account not found."
    ]
  }
}
```

#### Target Account Is Group (422)
```json
{
  "message": "Validation failed.",
  "errors": {
    "reallocate_to_account_id": [
      "Target account must be a ledger account (not a group)."
    ]
  }
}
```

#### Target Account Different Company (422)
```json
{
  "message": "Validation failed.",
  "errors": {
    "reallocate_to_account_id": [
      "Target account must belong to the same company."
    ]
  }
}
```

#### Target Account Different Root Type (422)
```json
{
  "message": "Validation failed.",
  "errors": {
    "reallocate_to_account_id": [
      "Target account must have the same root type."
    ]
  }
}
```

#### Account Not Found (404)
```json
{
  "message": "Account not found."
}
```

---

## Authentication & Permissions

Both endpoints require:
- **Authentication**: `auth:sanctum` middleware
- **Permission**: `module.accounting` access
- **Write Permission** (for DELETE): `module.accounting,read-write`

### Example with Bearer Token
```bash
curl -X GET "http://localhost:8000/api/accounts/tree?company_id=1&include_balances=1" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

---

## Testing Checklist

### Balance Display
- [ ] GET tree without `include_balances` - should work as before
- [ ] GET tree with `include_balances=1` - should include balance field
- [ ] GET tree with `include_balances=true` - should include balance field
- [ ] GET tree with `include_balances=0` - should NOT include balance field
- [ ] Verify ledger account balances are correct
- [ ] Verify group account balances are sum of children

### Account Deletion
- [ ] DELETE account with no balance, no children - should succeed
- [ ] DELETE account with balance, no reallocation - should fail (422)
- [ ] DELETE account with balance, with reallocation - should succeed
- [ ] DELETE account with children - should fail (422)
- [ ] DELETE with invalid target account ID - should fail (422)
- [ ] DELETE with target in different company - should fail (422)
- [ ] DELETE with target as group account - should fail (422)
- [ ] DELETE with target of different root type - should fail (422)
- [ ] Verify journal entry created correctly
- [ ] Verify balance transferred correctly

---

## Common Use Cases

### Use Case 1: Display Chart of Accounts with Current Balances
```javascript
// Frontend code example
const response = await fetch(
  '/api/accounts/tree?company_id=1&include_balances=1',
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
const accountsWithBalances = await response.json();
```

### Use Case 2: Delete Unused Account
```javascript
// Account with no balance and no children
const response = await fetch('/api/accounts/15', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Use Case 3: Consolidate Accounts
```javascript
// Move balance from old account to new account, then delete old
const response = await fetch('/api/accounts/5', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reallocate_to_account_id: 10
  })
});
```

### Use Case 4: Check If Account Can Be Deleted
```javascript
// First, get the account details
const account = await fetch(`/api/accounts/${accountId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Check if it has children
if (account.has_children) {
  alert('Cannot delete: Account has child accounts');
  return;
}

// Check if it has balance
const balanceResponse = await fetch(`/api/accounts/${accountId}/balance`, {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

if (Math.abs(balanceResponse.balance) > 0.01) {
  // Prompt user to select target account for reallocation
  const targetAccountId = promptUserForTargetAccount();
  
  // Delete with reallocation
  await fetch(`/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      reallocate_to_account_id: targetAccountId
    })
  });
} else {
  // Delete directly
  await fetch(`/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

---

## Performance Notes

- Balance calculation is recursive and may be slow for large account hierarchies
- Consider caching balance results for frequently accessed data
- Use `include_balances=1` only when needed
- For large datasets, consider pagination or filtering

---

## Database Impact

### Soft Deletes
- Deleted accounts are soft-deleted (not permanently removed)
- `deleted_at` timestamp is set
- Accounts can be restored if needed

### Journal Entries
- Reallocation creates a permanent journal entry
- Entry is automatically posted (`is_posted = true`)
- Entry follows double-entry bookkeeping rules
- Entry includes descriptive reference and description

---

## Support

For issues or questions:
1. Check `IMPLEMENTATION_SUMMARY.md` for detailed technical information
2. Review `TODO.mdc` for original specifications
3. Check Laravel logs: `storage/logs/laravel.log`
4. Verify permissions and authentication tokens

ree?company_id={id}
```

**New parameters:**
- Add optional query parameter: `include_balances` (boolean, default: false)
- When `include_balances=1` or `include_balances=true`, include a `balance` field in the response

**Example Request:**
```
GET /api/accounts/tree?company_id=1&include_balances=1
```

**Expected Response Structure:**
```json
[
  {
    "id": 1,
    "company_id": 1,
    "name": "Application of Funds (Assets)",
    "number": "1000",
    "root_type": "asset",
    "is_group": true,
    "normal_balance": null,
    "balance": 125000.50,
    "tax_rate": null,
    "is_disabled": false,
    "currency": "PKR",
    "parent_id": null,
    "parent_name": null,
    "has_children": true,
    "children": [
      {
        "id": 2,
        "company_id": 1,
        "name": "Current Assets",
        "number": "1100-1600",
        "root_type": "asset",
        "is_group": true,
        "normal_balance": null,
        "balance": 75000.50,
        "children": [
          {
            "id": 5,
            "company_id": 1,
            "name": "Cash In Hand",
            "number": "1110",
            "root_type": "asset",
            "is_group": false,
            "normal_balance": "debit",
            "balance": 15000.50,
            "children": []
          }
        ]
      }
    ]
  }
]
```

### Balance Calculation Logic

#### For Ledger Accounts (is_group = false)
Calculate the individual account balance from journal entry lines:

```php
public function getAccountBalance(Account $account): float
{
    if ($account->is_group) {
        return $this->getGroupBalance($account);
    }
    
    // Sum all journal entry lines for this account
    $lines = JournalEntryLine::where('account_id', $account->id)->get();
    
    $totalDebit = $lines->sum('debit');
    $totalCredit = $lines->sum('credit');
    
    // Calculate balance based on normal balance direction
    if ($account->normal_balance === 'debit') {
        return $totalDebit - $totalCredit;
    } else {
        return $totalCredit - $totalDebit;
    }
}
```

#### For Group Accounts (is_group = true)
Calculate the cumulative balance of all descendant ledger accounts:

```php
public function getGroupBalance(Account $groupAccount): float
{
    // Recursively get all descendant ledger account IDs
    $ledgerAccountIds = $this->getAllDescendantLedgerIds($groupAccount);
    
    if (empty($ledgerAccountIds)) {
        return 0.0;
    }
    
    // Get all journal entry lines for these accounts
    $lines = JournalEntryLine::whereIn('account_id', $ledgerAccountIds)->get();
    
    $balance = 0.0;
    
    // Calculate balance for each account and sum them
    foreach ($ledgerAccountIds as $accountId) {
        $account = Account::find($accountId);
        $accountLines = $lines->where('account_id', $accountId);
        
        $debit = $accountLines->sum('debit');
        $credit = $accountLines->sum('credit');
        
        if ($account->normal_balance === 'debit') {
            $balance += ($debit - $credit);
        } else {
            $balance += ($credit - $debit);
        }
    }
    
    return $balance;
}

private function getAllDescendantLedgerIds(Account $account): array
{
    $ledgerIds = [];
    
    // Get direct children
    $children = Account::where('parent_id', $account->id)->get();
    
    foreach ($children as $child) {
        if ($child->is_group) {
            // Recursively get descendants
            $ledgerIds = array_merge(
                $ledgerIds,
                $this->getAllDescendantLedgerIds($child)
            );
        } else {
            // It's a ledger, add to list
            $ledgerIds[] = $child->id;
        }
    }
    
    return $ledgerIds;
}
```

### Implementation Steps

1. **Add balance calculation method to AccountService or AccountController**
   - Location: `app/Accounting/Services/AccountService.php` or similar
   - Methods: `getAccountBalance()`, `getGroupBalance()`, `getAllDescendantLedgerIds()`

2. **Modify the tree endpoint in AccountController**
   ```php
   public function tree(Request $request)
   {
       $companyId = $request->query('company_id');
       $includeBalances = filter_var(
           $request->query('include_balances', false), 
           FILTER_VALIDATE_BOOLEAN
       );
       
       $accounts = Account::where('company_id', $companyId)
           ->whereNull('parent_id')
           ->with('children')
           ->get()
           ->map(function ($account) use ($includeBalances) {
               return $this->buildAccountTree($account, $includeBalances);
           });
       
       return response()->json($accounts);
   }
   
   private function buildAccountTree(Account $account, bool $includeBalances = false)
   {
       $data = $account->toArray();
       
       if ($includeBalances) {
           $data['balance'] = $this->accountService->getAccountBalance($account);
       }
       
       if ($account->children && $account->children->count() > 0) {
           $data['children'] = $account->children->map(function ($child) use ($includeBalances) {
               return $this->buildAccountTree($child, $includeBalances);
           })->toArray();
       }
       
       return $data;
   }
   ```

3. **Update AccountResource (if using API resources)**
   ```php
   class AccountResource extends JsonResource
   {
       public function toArray($request)
       {
           $data = [
               'id' => $this->id,
               'company_id' => $this->company_id,
               'name' => $this->name,
               'number' => $this->number,
               'root_type' => $this->root_type,
               'is_group' => $this->is_group,
               'normal_balance' => $this->normal_balance,
               'tax_rate' => $this->tax_rate,
               'is_disabled' => $this->is_disabled,
               'currency' => $this->currency,
               'parent_id' => $this->parent_id,
               'parent_name' => $this->parent_name,
               'has_children' => $this->has_children,
               'children' => $this->whenLoaded('children'),
           ];
           
           // Include balance if it's been calculated and attached
           if (isset($this->balance)) {
               $data['balance'] = $this->balance;
           }
           
           return $data;
       }
   }
   ```

### Testing

Test the endpoint with:
```bash
# Without balances (should work as before)
curl -X GET "http://localhost:8000/api/accounts/tree?company_id=1" \
  -H "Authorization: Bearer {token}"

# With balances (should include balance field)
curl -X GET "http://localhost:8000/api/accounts/tree?company_id=1&include_balances=1" \
  -H "Authorization: Bearer {token}"
```

Expected:
- Without `include_balances`: No `balance` field in response
- With `include_balances=1`: Each account has `balance` field (number)
- Ledger account balances: Individual transaction balance
- Group account balances: Sum of all child ledger balances

---

## Priority 2: Account Deletion with Balance Reallocation

### Requirements

#### Create DELETE `/api/accounts/{id}` Endpoint

**Endpoint:**
```
DELETE /api/accounts/{id}
```

**Request Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body (Optional - only if account has balance):**
```json
{
  "reallocate_to_account_id": 10
}
```

### Business Logic

#### Step 1: Validation

```php
public function destroy(Request $request, int $id)
{
    $account = Account::findOrFail($id);
    
    // 1. Check if account has children
    if ($account->has_children || Account::where('parent_id', $id)->exists()) {
        return response()->json([
            'message' => 'Cannot delete account with child accounts. Please delete or move child accounts first.'
        ], 400);
    }
    
    // 2. Calculate current balance
    $balance = $this->accountService->getAccountBalance($account);
    
    // 3. If balance exists, require reallocation
    if (abs($balance) > 0.01) { // Using small threshold for float comparison
        $request->validate([
            'reallocate_to_account_id' => 'required|integer|exists:accounts,id'
        ]);
        
        $targetAccountId = $request->input('reallocate_to_account_id');
        $targetAccount = Account::findOrFail($targetAccountId);
        
        // Validate target account
        if ($targetAccount->id === $account->id) {
            return response()->json([
                'message' => 'Cannot reallocate to the same account.'
            ], 422);
        }
        
        if ($targetAccount->company_id !== $account->company_id) {
            return response()->json([
                'message' => 'Target account must belong to the same company.'
            ], 422);
        }
        
        if ($targetAccount->is_group) {
            return response()->json([
                'message' => 'Target account must be a ledger account (not a group).'
            ], 422);
        }
        
        if ($targetAccount->root_type !== $account->root_type) {
            return response()->json([
                'message' => 'Target account must have the same root type.'
            ], 422);
        }
        
        // Create reallocation journal entry
        $this->createReallocationEntry($account, $targetAccount, $balance);
    }
    
    // 4. Delete the account
    $account->delete();
    
    return response()->json([
        'message' => 'Account deleted successfully.'
    ], 200);
}
```

#### Step 2: Create Reallocation Journal Entry

```php
private function createReallocationEntry(Account $fromAccount, Account $toAccount, float $balance)
{
    DB::transaction(function () use ($fromAccount, $toAccount, $balance) {
        // Create journal entry header
        $journalEntry = JournalEntry::create([
            'company_id' => $fromAccount->company_id,
            'date' => now()->toDateString(),
            'voucher_type' => 'Account Deletion Transfer',
            'reference_number' => 'ADT-' . time(),
            'description' => sprintf(
                'Balance transfer from %s (%s) to %s (%s) due to account deletion',
                $fromAccount->name,
                $fromAccount->number ?? 'N/A',
                $toAccount->name,
                $toAccount->number ?? 'N/A'
            ),
        ]);
        
        // Create journal entry lines
        // Zero out the account being deleted
        if ($balance > 0) {
            // Positive balance: debit side needs to be zeroed
            if ($fromAccount->normal_balance === 'debit') {
                // Debit account with positive balance -> credit it to zero
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $fromAccount->id,
                    'debit' => 0,
                    'credit' => abs($balance),
                    'description' => 'Balance transfer out',
                ]);
                
                // Target account receives debit
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $toAccount->id,
                    'debit' => abs($balance),
                    'credit' => 0,
                    'description' => 'Balance transfer in',
                ]);
            } else {
                // Credit account with positive balance -> debit it to zero
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $fromAccount->id,
                    'debit' => abs($balance),
                    'credit' => 0,
                    'description' => 'Balance transfer out',
                ]);
                
                // Target account receives credit
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $toAccount->id,
                    'debit' => 0,
                    'credit' => abs($balance),
                    'description' => 'Balance transfer in',
                ]);
            }
        } else {
            // Negative balance: handle opposite direction
            if ($fromAccount->normal_balance === 'debit') {
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $fromAccount->id,
                    'debit' => abs($balance),
                    'credit' => 0,
                    'description' => 'Balance transfer out',
                ]);
                
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $toAccount->id,
                    'debit' => 0,
                    'credit' => abs($balance),
                    'description' => 'Balance transfer in',
                ]);
            } else {
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $fromAccount->id,
                    'debit' => 0,
                    'credit' => abs($balance),
                    'description' => 'Balance transfer out',
                ]);
                
                JournalEntryLine::create([
                    'journal_entry_id' => $journalEntry->id,
                    'account_id' => $toAccount->id,
                    'debit' => abs($balance),
                    'credit' => 0,
                    'description' => 'Balance transfer in',
                ]);
            }
        }
    });
}
```

### Add Route

In `routes/api.php`:
```php
Route::middleware(['auth:sanctum'])->group(function () {
    // Existing routes...
    
    Route::delete('/accounts/{id}', [AccountController::class, 'destroy'])
        ->middleware('permission:module.accounting,read-write');
});
```

### Testing Delete Endpoint

```bash
# Test 1: Delete account with no balance
curl -X DELETE "http://localhost:8000/api/accounts/15" \
  -H "Authorization: Bearer {token}"

# Expected: 200 OK with message

# Test 2: Delete account with balance (without reallocation - should fail)
curl -X DELETE "http://localhost:8000/api/accounts/5" \
  -H "Authorization: Bearer {token}"

# Expected: 422 Validation error

# Test 3: Delete account with balance (with reallocation)
curl -X DELETE "http://localhost:8000/api/accounts/5" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reallocate_to_account_id": 10}'

# Expected: 200 OK, journal entry created, account deleted

# Test 4: Delete account with children (should fail)
curl -X DELETE "http://localhost:8000/api/accounts/2" \
  -H "Authorization: Bearer {token}"

# Expected: 400 Bad Request
```

---

## Performance Considerations

### For Balance Calculation
If you have many accounts or large transaction volumes:

1. **Add database indexes:**
   ```sql
   CREATE INDEX idx_journal_entry_lines_account_id ON journal_entry_lines(account_id);
   CREATE INDEX idx_accounts_parent_id ON accounts(parent_id);
   ```

2. **Consider caching:**
   ```php
   public function getAccountBalance(Account $account): float
   {
       return Cache::remember(
           "account_balance_{$account->id}",
           now()->addMinutes(5),
           function () use ($account) {
               // Calculate balance...
           }
       );
   }
   ```

3. **Invalidate cache when transactions are posted:**
   ```php
   // In JournalEntryController after creating entry
   foreach ($journalEntry->lines as $line) {
       Cache::forget("account_balance_{$line->account_id}");
   }
   ```

---

## Summary Checklist

### Balance Display Feature
- [ ] Add `getAccountBalance()` method to AccountService
- [ ] Add `getGroupBalance()` method for cumulative balances
- [ ] Add `getAllDescendantLedgerIds()` helper method
- [ ] Modify `/api/accounts/tree` to accept `include_balances` parameter
- [ ] Update controller to call balance calculation when parameter is true
- [ ] Test with and without `include_balances` parameter
- [ ] Verify ledger accounts show individual balance
- [ ] Verify group accounts show cumulative balance
- [ ] Add database indexes for performance

### Account Deletion Feature
- [ ] Create DELETE `/api/accounts/{id}` endpoint
- [ ] Add validation for child accounts
- [ ] Add validation for balance and reallocation
- [ ] Implement `createReallocationEntry()` method
- [ ] Ensure double-entry bookkeeping rules are followed
- [ ] Add proper error responses for all validation cases
- [ ] Test deletion scenarios (with/without balance, with/without children)
- [ ] Verify journal entries are created correctly
- [ ] Add route with proper permission middleware
- [ ] Update API documentation

---

## Questions?

If anything is unclear, refer to:
- `docs/laravel-backend.mdc` - Section 7.3 and 7.8 for API specs
- `docs/chart-of-accounts-new-features.md` - Complete feature documentation
- Existing `AccountService` class for balance calculation patterns

**Priority:** Implement balance display first, then deletion feature.

