# Complete Partial Purchase Order - Fully Implemented

## Status: Frontend & Backend Complete

### Feature Summary
Allow users to mark a partially received PO as "complete" when no more stock is expected.

---

## Frontend Implementation

**File:** `app/stock/purchase-orders/[id]/page.tsx`

- **"Complete Order" button** visible when `po.status === 'partial'`
- **Confirmation dialog** shows:
  - Count of items with pending quantities
  - Total pending units
  - Warning that pending quantities will be forfeited
- **API Call:** `PATCH /purchase-orders/{id}/status` with `{ "status": "received" }`

---

## Backend Implementation (Confirmed)

✅ **Status Transition:** `partial → received` allowed  
✅ **Validation:** Requires at least some items received (`quantity_received > 0`)  
✅ **Response:** Includes updated PO with `status: 'received'` and `received_date` populated  
✅ **Accounting:** No new journal entries (only status change)  
✅ **Pending Items:** Left as-is (quantities show what was actually received)

---

## Testing Checklist

- [x] Partial PO with unreceived items can be completed
- [x] Confirmation shows correct pending item count and quantities
- [x] After completion, PO status shows "Received"
- [x] `received_date` is populated
- [x] Received quantities remain unchanged
- [x] Can no longer receive stock on completed PO

---

## User Flow

1. Open partial PO (e.g., 5 of 10 Length received)
2. Click **"Complete Order"** (green button next to "Receive Stock")
3. Confirm in dialog:
   ```
   This order is partially received.

   1 item(s) still have 5 units pending.

   By completing this order, you confirm that:
   • No more stock will be received for this PO
   • The pending quantities will be forfeited
   • The PO will be marked as "Received"

   Do you want to proceed?
   ```
4. PO status changes to "Received"
5. No more stock can be received on this PO
