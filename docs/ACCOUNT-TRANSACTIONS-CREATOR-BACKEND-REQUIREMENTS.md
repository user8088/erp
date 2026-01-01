# Account Transactions Creator Information - Backend Requirements

## Overview

This document specifies the backend requirements for including creator information (who created each transaction) in the account transactions API response.

## API Endpoint

**Endpoint**: `GET /api/accounts/{id}/transactions`

## Current Response Structure

Currently, transactions may or may not include creator information:

```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-01-01",
      "voucher_type": "Journal Entry",
      "reference_number": "JV-001",
      "description": "Opening balance",
      "debit": 1000.00,
      "credit": 0.00,
      "balance": 1000.00,
      "created_at": "2026-01-01T10:30:45.123456Z"
    }
  ],
  "meta": { ... }
}
```

## Required Changes

### 1. Add Creator Fields to Transaction Response

Each transaction in the response must include:

- `created_by`: User ID (number) - **Required**
- `creator`: User object - **Required**

**Updated Response Structure**:

```json
{
  "data": [
    {
      "id": 1,
      "date": "2026-01-01",
      "voucher_type": "Journal Entry",
      "reference_number": "JV-001",
      "description": "Opening balance",
      "debit": 1000.00,
      "credit": 0.00,
      "balance": 1000.00,
      "created_at": "2026-01-01T10:30:45.123456Z",
      "created_by": 1,
      "creator": {
        "id": 1,
        "full_name": "John Doe",
        "email": "john.doe@example.com"
      }
    }
  ],
  "meta": { ... }
}
```

### 2. Creator Object Structure

The `creator` object should include:

- `id` (number): User ID
- `full_name` (string): User's full name (required)
- `email` (string, optional): User's email address

**Example**:
```json
{
  "id": 1,
  "full_name": "John Doe",
  "email": "john.doe@example.com"
}
```

### 3. Data Source

The creator information should come from:

1. **Journal Entry Lines**: Use `journal_entries.created_by` (the user who created the journal entry)
2. **Other Transaction Sources**: Use the `created_by` field from the source transaction (sales, purchases, etc.)

### 4. Implementation

#### 4.1 Eager Loading

Use Laravel's eager loading to include creator information:

```php
$transactions = JournalEntryLine::where('account_id', $accountId)
    ->with(['journalEntry.creator:id,full_name,email'])
    ->get()
    ->map(function ($line) {
        return [
            'id' => $line->id,
            'date' => $line->journalEntry->date,
            'voucher_type' => $line->journalEntry->voucher_type,
            'reference_number' => $line->journalEntry->reference_number,
            'description' => $line->description,
            'debit' => $line->debit,
            'credit' => $line->credit,
            'balance' => $line->balance,
            'created_at' => $line->created_at,
            'created_by' => $line->journalEntry->created_by,
            'creator' => $line->journalEntry->creator ? [
                'id' => $line->journalEntry->creator->id,
                'full_name' => $line->journalEntry->creator->full_name,
                'email' => $line->journalEntry->creator->email,
            ] : null,
        ];
    });
```

#### 4.2 User Model Relationship

Ensure the User model has the necessary fields:

- `id`: Primary key
- `full_name`: User's full name (or construct from `first_name` + `last_name`)
- `email`: User's email address

#### 4.3 Fallback for Missing Creator

If a transaction doesn't have a creator (edge case):

- Set `created_by` to `null` or `0`
- Set `creator` to `null`
- Frontend will display "—" for missing creator information

### 5. Performance Considerations

- Use eager loading (`with()`) to avoid N+1 query problems
- Only select necessary fields (`id, full_name, email`)
- Consider caching user information if frequently accessed

### 6. Edge Cases

1. **Deleted Users**: If the creator user has been deleted:
   - Still include `created_by` with the user ID
   - Set `creator` to `null` or include a placeholder:
     ```json
     {
       "id": 1,
       "full_name": "Deleted User",
       "email": null
     }
     ```

2. **System-Generated Transactions**: For system-generated transactions:
   - Set `created_by` to a system user ID (e.g., 0 or a special system user)
   - Set `creator.full_name` to "System" or "Auto-Generated"

3. **Legacy Data**: For transactions created before this feature:
   - If `created_by` is not available, set to `null`
   - Set `creator` to `null`
   - Frontend will handle gracefully

### 7. Validation

The backend should ensure:

- ✅ `created_by` is always present (can be null for legacy data)
- ✅ If `created_by` is present, `creator` object should be included
- ✅ `creator.full_name` is always present (if creator exists)
- ✅ `creator.email` is optional

### 8. Testing Requirements

The backend should include tests for:

1. ✅ Creator information is included in transaction response
2. ✅ Creator information is correct (matches user who created the entry)
3. ✅ Eager loading works correctly (no N+1 queries)
4. ✅ Deleted users are handled gracefully
5. ✅ System-generated transactions show appropriate creator
6. ✅ Legacy transactions without creator are handled

## Implementation Priority

**Priority: High**

This information is essential for:
- Audit trails
- Accountability
- E-statement generation
- User transparency

## Related Documents

- `docs/ACCOUNT-TRANSACTIONS-TIMESTAMP-BALANCE-BACKEND-REQUIREMENTS.md` - Transaction timestamp and balance requirements
- `docs/ACCOUNT-STATEMENT-DOWNLOAD-BACKEND-REQUIREMENTS.md` - E-statement download requirements

