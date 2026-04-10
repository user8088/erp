# Complete API Endpoint Mapping

## Base Configuration

```typescript
BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api"
Authentication: Bearer Token (JWT)
Content-Type: application/json
CSRF Protection: Enabled (Laravel Sanctum)
```

## Authentication Endpoints

| Method | Endpoint | Description | Request | Response |
|--------|----------|-------------|---------|----------|
| POST | `/auth/login` | User login | `{ login, password }` | `{ user, permissions, access_token }` |
| GET | `/auth/me` | Current user | - | `{ user, permissions }` |
| POST | `/auth/logout` | Logout | - | `{ message }` |
| GET | `/sanctum/csrf-cookie` | Get CSRF token | - | Cookie set |

## Accounts (Chart of Accounts)

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/accounts` | List accounts | `company_id`, `search`, `root_type`, `is_group`, `page`, `per_page` |
| GET | `/accounts/tree` | Account tree | `company_id`, `include_balances` |
| POST | `/accounts` | Create account | - |
| GET | `/accounts/{id}` | Get account | - |
| PUT | `/accounts/{id}` | Update account | - |
| PATCH | `/accounts/{id}/state` | Enable/disable | `{ is_disabled }` |
| DELETE | `/accounts/{id}` | Delete account | `{ reallocate_to_account_id }` |
| GET | `/accounts/{id}/transactions` | Transactions | `page`, `per_page`, `start_date`, `end_date` |
| GET | `/accounts/{id}/balance` | Account balance | - |
| GET | `/accounts/{id}/statement` | Download PDF | `start_date`, `end_date` |
| GET | `/accounts/statement` | Chart of Accounts PDF | `company_id`, `include_balances`, `as_of_date` |

## Journal Entries

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/journal-entries` | Create journal entry |
| GET | `/journal-entries` | List entries |
| GET | `/journal-entries/{id}` | Get entry |
| PUT | `/journal-entries/{id}` | Update entry |
| POST | `/journal-entries/{id}/post` | Post entry |

## Items & Stock

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/items` | List items | `search`, `category_id`, `page`, `per_page` |
| POST | `/items` | Create item | - |
| GET | `/items/{id}` | Get item | - |
| PUT | `/items/{id}` | Update item | - |
| DELETE | `/items/{id}` | Delete item | - |
| GET | `/items/{id}/stock` | Get stock | - |
| GET | `/items/{id}/batches` | Batch history | `page`, `per_page` |
| GET | `/items/{id}/batches/active` | Active batch | - |
| GET | `/items/{id}/batches/queue` | Batch queue (FIFO) | `only_active` |
| GET | `/items/{id}/analytics/sales` | Sales analytics | `period` |
| GET | `/items/{id}/analytics/stock` | Stock analytics | `period` |
| POST | `/items/{id}/tags` | Sync tags | `{ tag_ids }` |

## Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories |
| POST | `/categories` | Create category |
| GET | `/categories/{id}` | Get category |
| PUT | `/categories/{id}` | Update category |
| DELETE | `/categories/{id}` | Delete category |

## Item Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/item-tags` | List tags |
| POST | `/item-tags` | Create tag |
| PUT | `/item-tags/{id}` | Update tag |
| DELETE | `/item-tags/{id}` | Delete tag |

## Purchase Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/purchase-orders` | List POs |
| POST | `/purchase-orders` | Create PO |
| GET | `/purchase-orders/{id}` | Get PO |
| PUT | `/purchase-orders/{id}` | Update PO |
| DELETE | `/purchase-orders/{id}` | Delete PO |
| POST | `/purchase-orders/{id}/items` | Add item |
| PATCH | `/purchase-orders/{id}/items/{itemId}` | Update item |
| DELETE | `/purchase-orders/{id}/items/{itemId}` | Remove item |
| POST | `/purchase-orders/{id}/items/{itemId}/receive` | Receive item |
| POST | `/purchase-orders/{id}/upload-invoice` | Upload invoice (multipart) |
| GET | `/purchase-orders/{id}/export/pdf` | Export PDF |
| GET | `/purchase-orders/{id}/export/excel` | Export Excel |

## Stock Movements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stock-movements` | List movements |
| POST | `/stock-movements` | Create movement (adjustment) |
| GET | `/stock-movements/{id}` | Get movement |

## Stock Account Mappings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stock-account-mappings` | Get mapping |
| GET | `/stock-account-mappings/detect` | Auto-detect accounts |
| PUT | `/stock-account-mappings` | Update mapping |
| DELETE | `/stock-account-mappings` | Reset mapping |

## Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customers` | List customers |
| POST | `/customers` | Create customer |
| GET | `/customers/{id}` | Get customer |
| PUT | `/customers/{id}` | Update customer |
| DELETE | `/customers/{id}` | Delete customer |
| GET | `/customers/{id}/balance` | Get balance |
| GET | `/customers/{id}/invoices` | Get invoices |
| GET | `/customers/{id}/payments` | Get payments |
| POST | `/customers/{id}/payments` | Record payment |
| GET | `/customers/{id}/payment-summary` | Payment summary |
| GET | `/customers/{id}/earnings` | Get earnings |
| GET | `/customers/{id}/stock-profits` | Stock profits |
| GET | `/customers/{id}/delivery-profits` | Delivery profits |
| GET | `/customers/{id}/rentals` | Get rentals |
| POST | `/customers/{id}/tags` | Sync tags |
| GET | `/customers/export/excel` | Export Excel |
| GET | `/customers/export/pdf` | Export PDF |

## Customer Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/customer-tags` | List tags |
| POST | `/customer-tags` | Create tag |
| PUT | `/customer-tags/{id}` | Update tag |
| DELETE | `/customer-tags/{id}` | Delete tag |

## Sale Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sale-invoices` | List invoices |
| POST | `/sale-invoices` | Create invoice |
| GET | `/sale-invoices/{id}` | Get invoice |
| PUT | `/sale-invoices/{id}` | Update invoice |
| POST | `/sale-invoices/{id}/cancel` | Cancel invoice |
| POST | `/sale-invoices/{id}/payments` | Record payment |

## Sales Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/sales-orders` | List orders |
| POST | `/sales-orders` | Create order |
| GET | `/sales-orders/{id}` | Get order |
| PUT | `/sales-orders/{id}` | Update order |
| POST | `/sales-orders/{id}/invoice` | Convert to invoice |
| POST | `/sales-orders/{id}/cancel` | Cancel order |

## POS (Point of Sale)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pos/items` | Quick item catalog |
| POST | `/pos/sale` | Quick sale |

## Suppliers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/suppliers` | List suppliers |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/{id}` | Get supplier |
| PUT | `/suppliers/{id}` | Update supplier |
| DELETE | `/suppliers/{id}` | Delete supplier |
| GET | `/suppliers/{id}/balance` | Get balance |
| GET | `/suppliers/{id}/payments` | Get payments |
| POST | `/suppliers/{id}/payments` | Record payment |
| GET | `/suppliers/{id}/purchase-orders` | Get POs |

## Staff

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff` | List staff |
| POST | `/staff` | Create staff |
| GET | `/staff/{id}` | Get staff |
| PUT | `/staff/{id}` | Update staff |
| DELETE | `/staff/{id}` | Delete staff |
| POST | `/staff/{id}/create-user` | Create ERP user |
| POST | `/staff/{id}/link-user` | Link user |
| DELETE | `/staff/{id}/link-user` | Unlink user |
| POST | `/staff/{id}/pay-salary` | Pay salary |
| POST | `/staff/{id}/reverse-salary` | Reverse salary |
| GET | `/staff/{id}/advances` | List advances |
| GET | `/staff/{id}/advances/balance` | Advance balance |
| POST | `/staff/{id}/advances` | Give advance |

## Attendance

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/attendance` | List attendance |
| POST | `/attendance` | Save entry |
| POST | `/attendance/bulk` | Bulk save |
| DELETE | `/attendance/{personId}/{date}` | Delete entry |

## Staff Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/staff-tags` | List tags |
| POST | `/staff-tags` | Create tag |
| PUT | `/staff-tags/{id}` | Update tag |
| DELETE | `/staff-tags/{id}` | Delete tag |

## Rental Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rental-categories` | List categories |
| POST | `/rental-categories` | Create category |
| GET | `/rental-categories/{id}` | Get category |
| PUT | `/rental-categories/{id}` | Update category |
| DELETE | `/rental-categories/{id}` | Delete category |

## Rental Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rental-items` | List items |
| POST | `/rental-items` | Create item |
| GET | `/rental-items/{id}` | Get item |
| PUT | `/rental-items/{id}` | Update item |
| DELETE | `/rental-items/{id}` | Delete item |

## Rental Agreements

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rental-agreements` | List agreements |
| POST | `/rental-agreements` | Create agreement |
| GET | `/rental-agreements/{id}` | Get agreement |
| PUT | `/rental-agreements/{id}` | Update agreement |
| POST | `/rental-agreements/{id}/payments` | Record payment |
| POST | `/rental-agreements/{id}/returns` | Process return |
| POST | `/rental-agreements/{id}/write-off` | Write off bad debt |
| POST | `/rental-agreements/{id}/cancel` | Cancel agreement |

## Vehicles (Transport)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/vehicles` | List vehicles |
| POST | `/vehicles` | Create vehicle |
| GET | `/vehicles/{id}` | Get vehicle |
| PUT | `/vehicles/{id}` | Update vehicle |
| DELETE | `/vehicles/{id}` | Delete vehicle |
| GET | `/vehicles/{id}/profitability` | Profitability stats |
| GET | `/vehicles/{id}/delivery-orders` | Delivery orders |
| GET | `/vehicles/{id}/maintenance` | Maintenance records |

## Users & Roles

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| POST | `/users` | Create user |
| GET | `/users/{id}` | Get user |
| PUT | `/users/{id}` | Update user |
| DELETE | `/users/{id}` | Delete user |
| PUT | `/users/{id}/password` | Update password |
| GET | `/roles` | List roles |
| POST | `/roles` | Create role |
| GET | `/roles/{id}` | Get role |
| PUT | `/roles/{id}` | Update role |
| DELETE | `/roles/{id}` | Delete role |

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/trial-balance` | Trial Balance |
| GET | `/reports/profit-loss` | Profit & Loss |
| GET | `/reports/balance-sheet` | Balance Sheet |
| GET | `/reports/general-ledger` | General Ledger |
| GET | `/reports/cash-flow` | Cash Flow |
| GET | `/reports/profitability-analysis` | Profitability |
| GET | `/reports/trends` | Trend Analysis |
| GET | `/reports/sales-trends` | Sales Trends |
| GET | `/reports/top-selling-items` | Top Selling |
| GET | `/reports/payment-summary` | Payment Summary |
| GET | `/reports/customer-ledger` | Customer Ledger |
| GET | `/reports/supplier-ledger` | Supplier Ledger |

## Stock Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/stock-value` | Stock value summary |
| GET | `/reports/low-stock` | Low stock alerts |
| GET | `/reports/stock-movements` | Movement report |

## Common Query Parameters

### Pagination
```
?page=1              # Page number (default: 1)
&per_page=20         # Items per page (default: 20, max: 100)
```

### Search & Filter
```
&search=term         # Full-text search
&status=active       # Status filter
&start_date=YYYY-MM-DD  # Date range start
&end_date=YYYY-MM-DD    # Date range end
```

### Sorting
```
&sort_by=created_at  # Sort field
&sort_order=desc     # asc or desc
```

### Company Context (Accounting)
```
&company_id=1        # Required for accounting endpoints
```

## Response Format

### Success Response (200 OK)
```json
{
  "data": { },
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 100,
    "last_page": 5
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "message": "Error description",
  "error": "Error code",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (Delete success) |
| 400 | Bad Request |
| 401 | Unauthorized (Not logged in) |
| 403 | Forbidden (No permission) |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Server Error |

## Rate Limiting

- Default: 100 requests per minute per user
- Burst: 20 requests
- Headers:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: 95
  - `X-RateLimit-Reset`: 1640995200

## File Upload

### Multipart Form Data
```
POST /purchase-orders/{id}/upload-invoice
Content-Type: multipart/form-data

Form fields:
- invoice: File (PDF, max 10MB)
```

### Download Response
```
GET /accounts/{id}/statement
Accept: application/pdf

Response:
Content-Type: application/pdf
Content-Disposition: attachment; filename="statement.pdf"
```

## API Versioning

Current version: v1 (implicit in URL structure)
Future versions will use: `/api/v2/...`

## Related Documentation
- [API Client](./03-api-client.md) - Frontend API implementation
- [Authentication](./05-authentication-permissions.md) - Auth flow
- [Type System](./04-type-system.md) - Request/response types
