# Rental API Changes - Frontend Integration Guide

**Date**: December 2025  
**Version**: 2.0

This document summarizes recent changes to the Rental APIs that affect frontend implementation.

---

## 🔄 Breaking Changes

### None - All changes are backward compatible

The API changes are designed to be backward compatible. Existing frontend code will continue to work, but new features require updates.

---

## ✨ New Features & Changes

### 1. Security Deposit Field Migration

**What Changed:**
- Security deposits are now set at the **agreement level**, not the item level
- Rental items no longer have a fixed security deposit amount

**Why:**
- More flexibility - allows different security deposits per agreement
- Better business logic - deposit can vary by customer, rental period, item condition, etc.

**Frontend Impact:**

#### Rental Item Creation/Update
- ✅ `security_deposit_amount` field is now **optional** and will be ignored if provided
- ✅ Frontend should **remove** this field from rental item forms
- ✅ API will set it to `null` automatically

#### Rental Agreement Creation
- ✅ `security_deposit_amount` is now **required** at the agreement level (entered by user)
- ✅ Frontend should add this field to the agreement creation form
- ✅ Value is **NOT calculated** from the rental item - user enters it directly
- ✅ New fields for security deposit collection:
  - `collect_security_deposit` (boolean) - Whether to collect deposit immediately
  - `security_deposit_payment_account_id` (integer) - Payment account for deposit

**Example Request:**
```json
POST /api/rentals/agreements
{
  "customer_id": 5,
  "rental_item_id": 1,
  "quantity_rented": 2,
  "rental_start_date": "2025-12-13",
  "rental_period_type": "monthly",
  "rental_period_length": 3,
  "total_rent_amount": 100000.00,
  "rent_per_period": 33333.33,
  "security_deposit_amount": 20000.00,  // ← Now entered here, not from item
  "collect_security_deposit": true,
  "security_deposit_payment_account_id": 15
}
```

**Migration Steps:**
1. ✅ Remove `security_deposit_amount` from rental item forms (already done)
2. ✅ Add `security_deposit_amount` input to rental agreement creation form (already done)
3. ✅ Add `collect_security_deposit` checkbox and account selection (already done)
4. ✅ Ensure agreement creation sends `security_deposit_amount` directly (verify this)

---

### 2. Customer Rentals Tab Support

**What Changed:**
- Enhanced `GET /api/rentals/agreements` endpoint to include payment history
- Added eager loading of `payments` relationship
- Improved performance with database index on `customer_id`

**Frontend Impact:**

#### Customer Profile "Rentals" Tab
- ✅ Use `GET /api/rentals/agreements?customer_id={id}` to fetch customer's rentals
- ✅ Response now includes `payments` array for each agreement (no extra API call needed)
- ✅ All required data is included in a single request

**Example Request:**
```http
GET /api/rentals/agreements?customer_id=5&page=1&per_page=20&sort_by=created_at&sort_order=desc
```

**Example Response:**
```json
{
  "data": [
    {
      "id": 1,
      "agreement_number": "RENT-20251213-001",
      "customer_id": 5,
      "customer": {
        "id": 5,
        "name": "John Doe",
        "serial_number": "CUST-20251208-001"
      },
      "rental_item": {
        "id": 1,
        "name": "Excavator Model X-200",
        "sku": "CE-000001"
      },
      "security_deposit_amount": 20000.00,
      "total_rent_amount": 100000.00,
      "outstanding_balance": 66666.67,
      "rental_status": "active",
      "payments": [  // ← Now included automatically
        {
          "id": 1,
          "due_date": "2025-12-13",
          "amount_due": 33333.33,
          "amount_paid": 33333.33,
          "payment_status": "paid",
          "period_identifier": "Period 1"
        },
        // ... more payments
      ],
      // ... other fields
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1
  }
}
```

**Benefits:**
- ✅ Single API call instead of multiple requests
- ✅ Better performance with eager loading
- ✅ Complete data for displaying rental history with payments

---

## 📋 API Endpoint Changes Summary

### Rental Items API

| Endpoint | Change | Impact |
|----------|--------|--------|
| `POST /api/rentals/items` | `security_deposit_amount` field ignored/set to null | Remove field from forms |
| `PATCH /api/rentals/items/{id}` | `security_deposit_amount` field ignored/set to null | Remove field from forms |
| `GET /api/rentals/items` | `security_deposit_amount` will be `null` in response | Handle `null` values in UI |

### Rental Agreements API

| Endpoint | Change | Impact |
|----------|--------|--------|
| `POST /api/rentals/agreements` | `security_deposit_amount` now required/optional at agreement level | Add field to agreement form |
| `POST /api/rentals/agreements` | New fields: `collect_security_deposit`, `security_deposit_payment_account_id` | Add to form (already done) |
| `GET /api/rentals/agreements` | Now includes `payments` array in response | Use payments data directly |
| `GET /api/rentals/agreements?customer_id={id}` | Enhanced with eager loading | Use for customer rentals tab |

---

## 🔍 Testing Checklist

### Security Deposit Migration
- [ ] Create rental item without `security_deposit_amount` → Should succeed
- [ ] Create rental item with `security_deposit_amount: 1000` → Should succeed (but value ignored)
- [ ] Create rental agreement with `security_deposit_amount: 5000` → Should use 5000 (not from item)
- [ ] Verify security deposit is NOT calculated from item's `security_deposit_amount`
- [ ] Test security deposit collection during agreement creation

### Customer Rentals Tab
- [ ] Fetch agreements with `?customer_id=5` → Should return only that customer's agreements
- [ ] Verify response includes `payments` array for each agreement
- [ ] Test pagination with `customer_id` filter
- [ ] Test sorting with `customer_id` filter
- [ ] Verify empty state when customer has no rentals

---

## 📝 Code Examples

### Before (Old Way - Don't Use)
```typescript
// ❌ OLD: Security deposit from item
const rentalItem = await fetchRentalItem(itemId);
const securityDeposit = rentalItem.security_deposit_amount * quantity;

const agreement = await createRentalAgreement({
  // ... other fields
  security_deposit_amount: securityDeposit // Calculated from item
});
```

### After (New Way - Current)
```typescript
// ✅ NEW: Security deposit entered directly
const agreement = await createRentalAgreement({
  customer_id: 5,
  rental_item_id: itemId,
  quantity_rented: 2,
  // ... other fields
  security_deposit_amount: 20000.00, // User enters this
  collect_security_deposit: true,
  security_deposit_payment_account_id: accountId
});
```

### Customer Rentals Tab
```typescript
// ✅ Fetch customer's rentals with payments
const response = await fetch(`/api/rentals/agreements?customer_id=${customerId}&page=${page}&per_page=${perPage}`);

const agreements = response.data; // Includes payments array

agreements.forEach(agreement => {
  console.log(agreement.agreement_number);
  console.log(agreement.payments); // Already loaded!
  console.log(agreement.outstanding_balance);
});
```

---

## 🚨 Important Notes

1. **Backward Compatibility**: All changes are backward compatible. Existing code will continue to work.

2. **Security Deposit**: 
   - Never calculate from item anymore
   - Always get from user input in agreement form
   - Can be different for each agreement

3. **Performance**: 
   - Customer rentals endpoint is optimized with eager loading
   - No need for additional API calls to get payments

4. **Database**: 
   - Migration to make `security_deposit_amount` nullable in `rental_items` table
   - Index on `customer_id` in `rental_agreements` table

---

## 📞 Support

If you encounter any issues or have questions:

1. Check the main API documentation: `RENTAL_API_DOCUMENTATION.md`
2. Review the rental system guide: `Rental_guide.md`
3. Verify your API client configuration matches the examples above

---

## ✅ Migration Status

- [x] Backend migration completed
- [x] Database migration created
- [x] API endpoints updated
- [x] Documentation updated
- [x] Frontend forms updated (security deposit in agreement form)
- [x] Customer rentals tab implemented

**Status**: ✅ Ready for use

---

**Last Updated**: December 2025

