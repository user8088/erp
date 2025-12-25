# Guest Walk-in POS Backend Requirements

## Overview
This document specifies the backend requirements for implementing guest walk-in sales in the Point of Sale (POS) system. Guest sales allow unregistered customers to make purchases with strict payment validation (payment must equal total exactly), preventing advance payments and outstanding dues.

## System Guest Customer

### Requirement
Create or identify a system "Guest" customer record that will be used for all guest sales.

### Implementation Details
- **Customer Name**: "Guest Customer" or "Walk-in Guest"
- **Serial Number**: "GUEST-0001" or similar identifier
- **Status**: Always active
- **Email**: Can be a placeholder (e.g., "guest@system.local")
- **Phone**: Can be null or placeholder
- **Address**: Can be null or placeholder
- **Rating**: Default rating (e.g., 5)
- **Status**: "clear" (no dues)

### Database Query
The backend should have a method to retrieve or create the system guest customer:
```php
// Pseudo-code
function getOrCreateGuestCustomer() {
    $guest = Customer::where('serial_number', 'GUEST-0001')->first();
    if (!$guest) {
        $guest = Customer::create([
            'serial_number' => 'GUEST-0001',
            'name' => 'Guest Customer',
            'email' => 'guest@system.local',
            'status' => 'clear',
            'rating' => 5,
            // ... other required fields
        ]);
    }
    return $guest;
}
```

## Database Schema Updates

### Sales Table
Add a new column to track guest sales:

```sql
ALTER TABLE sales ADD COLUMN is_guest BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_sales_is_guest ON sales(is_guest);
```

### Invoice Metadata
The invoice `metadata` JSON field should include `is_guest: true` for guest sales.

## API Endpoints

### 1. Create Sale (`POST /api/sales`)

#### Request Payload
```json
{
  "sale_type": "walk-in",
  "customer_id": 0,  // 0 or guest customer ID when is_guest is true
  "is_guest": true,  // New field
  "items": [
    {
      "item_id": 1,
      "quantity": 2,
      "unit_price": 100.00,
      "discount_percentage": 0,
      "delivery_charge": 0
    }
  ],
  "notes": null
}
```

#### Validation Rules
1. **If `is_guest: true`**:
   - `sale_type` MUST be `'walk-in'` (reject delivery sales)
   - Return 422 error if `sale_type` is `'delivery'`: "Guest sales are only available for walk-in sales"
   - Use system guest customer ID (ignore or override `customer_id` if provided)
   - Store `is_guest: true` on the sale record

2. **If `is_guest: false` or not provided**:
   - Use existing validation logic
   - Require valid `customer_id`

#### Response
```json
{
  "sale": {
    "id": 123,
    "sale_number": "SALE-20240101-001",
    "sale_type": "walk-in",
    "customer_id": 999,  // Guest customer ID
    "is_guest": true,
    "status": "draft",
    // ... other sale fields
  }
}
```

### 2. Process Sale (`POST /api/sales/{id}/process`)

#### Request Payload
```json
{
  "payment_method": "cash",
  "payment_account_id": 1,
  "amount_paid": 200.00,
  "is_guest": true,  // New field
  "use_advance": false,  // Must be false for guests (ignore if provided)
  "notes": null
}
```

#### Validation Rules for Guest Sales (`is_guest: true`)

1. **Strict Payment Validation**:
   - Require `amount_paid` to be provided
   - Validate `amount_paid === sale.total_amount` exactly (no tolerance)
   - Return 422 error if payment doesn't match: 
     ```json
     {
       "message": "Payment amount must equal total amount exactly for guest sales",
       "errors": {
         "amount_paid": ["Payment amount (200.00) must equal total amount (200.00) exactly"]
       }
     }
     ```

2. **Prevent Advance Creation**:
   - If `amount_paid > total_amount`, return 422 error:
     ```json
     {
       "message": "Guest sales cannot create advance payments. Payment must equal total amount exactly.",
       "errors": {
         "amount_paid": ["Payment amount exceeds total. Guest sales cannot create advances."]
       }
     }
     ```
   - Do NOT create advance payment records
   - Do NOT update customer advance balance

3. **Prevent Due Creation**:
   - If `amount_paid < total_amount`, return 422 error:
     ```json
     {
       "message": "Guest sales cannot have outstanding dues. Payment must equal total amount exactly.",
       "errors": {
         "amount_paid": ["Payment amount is less than total. Guest sales cannot have dues."]
       }
     }
     ```
   - Do NOT create invoice with `status: 'issued'`
   - Invoice must be created with `status: 'paid'`

4. **Ignore `use_advance` Flag**:
   - Even if `use_advance: true` is provided, ignore it
   - Do NOT check customer advance balance
   - Do NOT deduct from customer advance

5. **Payment Processing**:
   - Create payment record with `payment_type: 'invoice_payment'`
   - Mark invoice status as `'paid'` immediately (not `'issued'`)
   - Create journal entries for payment
   - Update stock quantities

#### Processing Flow for Guest Sales

```php
// Pseudo-code
function processSale($saleId, $payload) {
    $sale = Sale::findOrFail($saleId);
    
    // Validate guest sale constraints
    if ($payload['is_guest'] ?? false) {
        // Validate sale type
        if ($sale->sale_type !== 'walk-in') {
            return response()->json([
                'message' => 'Guest sales are only available for walk-in sales'
            ], 422);
        }
        
        // Validate payment amount
        $amountPaid = $payload['amount_paid'] ?? 0;
        if ($amountPaid !== $sale->total_amount) {
            $errorMsg = $amountPaid > $sale->total_amount
                ? 'Guest sales cannot create advance payments. Payment must equal total amount exactly.'
                : 'Guest sales cannot have outstanding dues. Payment must equal total amount exactly.';
            
            return response()->json([
                'message' => $errorMsg,
                'errors' => [
                    'amount_paid' => [
                        "Payment amount ({$amountPaid}) must equal total amount ({$sale->total_amount}) exactly"
                    ]
                ]
            ], 422);
        }
        
        // Ignore use_advance flag
        $payload['use_advance'] = false;
    }
    
    // Continue with normal processing...
    // Create invoice with status 'paid' for guest sales
    // Create payment record
    // Update stock
    // Create journal entries
}
```

## Guest Invoice Creation

### Invoice Requirements
When processing a guest sale, create an invoice with the following specifications:

1. **Invoice Type**: `invoice_type: 'sale'`
2. **Reference**: 
   - `reference_type: 'sale'`
   - `reference_id: sale.id`
3. **Status**: `status: 'paid'` (NOT `'issued'`)
4. **Invoice Number**: Generate with "GUEST-" prefix (e.g., "GUEST-INV-20240101-001")
5. **Metadata**:
   ```json
   {
     "customer": {
       "id": 999,  // Guest customer ID
       "name": "Guest Customer",
       "serial_number": "GUEST-0001",
       "is_guest": true
     },
     "sale": {
       "id": 123,
       "sale_number": "SALE-20240101-001",
       "sale_type": "walk-in"
     },
     "is_guest": true,
     "items": [
       {
         "item_id": 1,
         "item_name": "Product Name",
         "quantity": 2,
         "unit_price": 100.00,
         "total": 200.00
       }
     ]
   }
   ```
6. **Amounts**:
   - `amount`: Sale subtotal
   - `tax_amount`: Sale tax amount
   - `total_amount`: Sale total amount

### Invoice PDF
Generate invoice PDF with:
- "Guest Customer" as customer name
- Guest invoice number format
- All sale items listed
- Payment status: "Paid"
- Payment method and account

## Journal Entries

### For Guest Sales
Create journal entries as normal for:
1. **Revenue Entry**: Debit Cash/Bank, Credit Sales Revenue
2. **Cost of Goods Sold**: Debit COGS, Credit Inventory
3. **Inventory**: Debit Inventory (reduction), Credit COGS

The entries should reference:
- Payment account (from `payment_account_id`)
- Guest customer ID
- Sale ID
- Invoice ID

## Validation Rules Summary

| Rule | Description | Error Response |
|------|-------------|----------------|
| Guest + Delivery | Guest sales cannot be delivery type | 422: "Guest sales are only available for walk-in sales" |
| Payment Exact Match | Payment must equal total exactly | 422: "Payment amount must equal total amount exactly for guest sales" |
| No Advance | Payment > total is not allowed | 422: "Guest sales cannot create advance payments..." |
| No Due | Payment < total is not allowed | 422: "Guest sales cannot have outstanding dues..." |
| No Use Advance | `use_advance` flag is ignored | Silently ignored, no error |

## Error Responses

### 422 Validation Error Format
```json
{
  "message": "Validation failed",
  "errors": {
    "field_name": [
      "Error message 1",
      "Error message 2"
    ]
  }
}
```

### Example Error Responses

**Guest sale with delivery type:**
```json
{
  "message": "Guest sales are only available for walk-in sales",
  "errors": {
    "sale_type": ["Guest sales cannot be delivery type"]
  }
}
```

**Payment amount mismatch (overpayment):**
```json
{
  "message": "Guest sales cannot create advance payments. Payment must equal total amount exactly.",
  "errors": {
    "amount_paid": [
      "Payment amount (250.00) must equal total amount (200.00) exactly"
    ]
  }
}
```

**Payment amount mismatch (underpayment):**
```json
{
  "message": "Guest sales cannot have outstanding dues. Payment must equal total amount exactly.",
  "errors": {
    "amount_paid": [
      "Payment amount (150.00) must equal total amount (200.00) exactly"
    ]
  }
}
```

## Testing Scenarios

### 1. Create Guest Sale (Walk-in)
- **Request**: `POST /api/sales` with `is_guest: true`, `sale_type: "walk-in"`
- **Expected**: Sale created with guest customer, `is_guest: true` flag set

### 2. Attempt Guest Sale (Delivery)
- **Request**: `POST /api/sales` with `is_guest: true`, `sale_type: "delivery"`
- **Expected**: 422 error - "Guest sales are only available for walk-in sales"

### 3. Process Guest Sale (Exact Payment)
- **Request**: `POST /api/sales/{id}/process` with `is_guest: true`, `amount_paid: 200.00` (matches total)
- **Expected**: Sale processed, invoice created with status 'paid', payment record created

### 4. Process Guest Sale (Overpayment)
- **Request**: `POST /api/sales/{id}/process` with `is_guest: true`, `amount_paid: 250.00` (total: 200.00)
- **Expected**: 422 error - "Guest sales cannot create advance payments..."

### 5. Process Guest Sale (Underpayment)
- **Request**: `POST /api/sales/{id}/process` with `is_guest: true`, `amount_paid: 150.00` (total: 200.00)
- **Expected**: 422 error - "Guest sales cannot have outstanding dues..."

### 6. Process Guest Sale (Use Advance Flag)
- **Request**: `POST /api/sales/{id}/process` with `is_guest: true`, `use_advance: true`
- **Expected**: Sale processed successfully, `use_advance` flag ignored

### 7. Verify Guest Invoice
- **Check**: Invoice created with `status: 'paid'`, `metadata.is_guest: true`, invoice number with "GUEST-" prefix

## Implementation Checklist

- [ ] Create or identify system guest customer
- [ ] Add `is_guest` column to `sales` table
- [ ] Add index on `is_guest` column
- [ ] Update `createSale` endpoint to accept `is_guest` flag
- [ ] Validate guest sales cannot be delivery type
- [ ] Update `processSale` endpoint to accept `is_guest` flag
- [ ] Implement strict payment validation for guest sales
- [ ] Prevent advance creation for guest sales
- [ ] Prevent due creation for guest sales
- [ ] Ignore `use_advance` flag for guest sales
- [ ] Create guest invoices with `status: 'paid'`
- [ ] Add `is_guest: true` to invoice metadata
- [ ] Generate guest invoice numbers with "GUEST-" prefix
- [ ] Update journal entry creation for guest sales
- [ ] Add unit tests for all validation scenarios
- [ ] Add integration tests for guest sale flow

## Notes

- Guest sales are designed for quick, one-time transactions
- No customer relationship is maintained for guest sales
- All guest sales are immediately paid (no credit terms)
- Guest invoices can be used for record-keeping and tax purposes
- Consider adding reporting/analytics to track guest sales separately

