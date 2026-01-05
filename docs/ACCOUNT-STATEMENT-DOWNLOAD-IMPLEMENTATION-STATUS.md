# Account Statement Download - Implementation Status

## Issue
Frontend is getting **404 Not Found** error when trying to download individual account statements.

**Error**: `GET /api/accounts/{id}/statement` returns 404

## Current Status

### ✅ Frontend Implementation
- **Status**: Complete
- **Location**: `app/lib/apiClient.ts` - `downloadAccountStatement()` method
- **UI**: Download button exists in `app/accounting/accounts/[id]/AccountDetailClient.tsx`
- **Issue Fixed**: Query string formatting issue has been resolved

### ❌ Backend Implementation
- **Status**: **NOT IMPLEMENTED**
- **Required Endpoint**: `GET /api/accounts/{id}/statement`
- **Documentation**: `docs/ACCOUNT-STATEMENT-DOWNLOAD-BACKEND-REQUIREMENTS.md`

## Required Backend Implementation

### Endpoint Details

**Route**: `GET /api/accounts/{id}/statement`

**Authentication**: 
- Middleware: `auth:sanctum`
- Permission: `module:module.accounting,read`

**Query Parameters**:
- `start_date` (optional, string, format: `YYYY-MM-DD`): Start date for filtering transactions
- `end_date` (optional, string, format: `YYYY-MM-DD`): End date for filtering transactions

**Response**:
- **Content-Type**: `application/pdf`
- **Body**: PDF file (binary)

### Implementation Checklist

- [ ] Add route in `routes/api.php`:
  ```php
  Route::get('/accounts/{id}/statement', [AccountController::class, 'downloadStatement'])
      ->middleware(['auth:sanctum', 'module:module.accounting,read']);
  ```
  
  **Important**: This route must be placed **BEFORE** the generic `/accounts/{id}` route to avoid route conflicts.

- [ ] Add controller method in `AccountController.php`:
  ```php
  public function downloadStatement($id, Request $request)
  {
      // Implementation details in ACCOUNT-STATEMENT-DOWNLOAD-BACKEND-REQUIREMENTS.md
  }
  ```

- [ ] Implement PDF generation using dompdf or similar library
- [ ] Include transaction details with timestamps and creator information
- [ ] Support date filtering (start_date, end_date)
- [ ] Handle both ledger and group accounts
- [ ] Include running balances
- [ ] Add proper error handling (404, 403, 422)

### Route Placement

**Critical**: The statement route must be registered **before** any generic `/accounts/{id}` route:

```php
// ✅ CORRECT - Statement route first
Route::get('/accounts/{id}/statement', [AccountController::class, 'downloadStatement'])
    ->middleware(['auth:sanctum', 'module:module.accounting,read']);

Route::get('/accounts/{id}', [AccountController::class, 'show'])
    ->middleware(['auth:sanctum', 'module:module.accounting,read']);

// ❌ WRONG - Generic route first (will catch statement requests)
Route::get('/accounts/{id}', [AccountController::class, 'show']);
Route::get('/accounts/{id}/statement', [AccountController::class, 'downloadStatement']);
```

## Related Endpoints

### ✅ Implemented
- `GET /api/accounts/statement` - Chart of Accounts statement (entire COA)
- `GET /api/accounts/{id}/balance` - Get account balance
- `GET /api/accounts/{id}/transactions` - Get account transactions

### ❌ Not Implemented
- `GET /api/accounts/{id}/statement` - Individual account statement PDF

## Full Requirements

See `docs/ACCOUNT-STATEMENT-DOWNLOAD-BACKEND-REQUIREMENTS.md` for complete implementation details including:
- PDF content requirements
- Transaction data structure
- Summary section requirements
- Error handling
- Performance considerations
- Testing requirements

## Testing

Once implemented, test with:
```bash
curl -X GET "http://localhost:8000/api/accounts/37/statement" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/pdf" \
  --output statement.pdf
```

With date filters:
```bash
curl -X GET "http://localhost:8000/api/accounts/37/statement?start_date=2024-01-01&end_date=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/pdf" \
  --output statement.pdf
```

## Priority

**HIGH** - This is blocking the account detail page's download functionality. Users cannot download individual account statements until this endpoint is implemented.

