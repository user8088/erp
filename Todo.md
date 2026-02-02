## UI TODO: Supplier Profile → Purchase Orders “Items” column

Backend change: `PurchaseOrderResource` now returns:
- `items_summary` (string|null): human readable purchased items summary
  - Example: `1 bag of Fauji Cement`
  - Built from each PO item: `quantity_ordered` + `item.primary_unit` + `item.brand` + `item.name`
  - If there are many items, it returns first 2 then “and N more”
- `items_count` (int|null): count of items (only present when `items` relation is loaded)

### What to change in UI
- In Supplier Profile → Purchase Orders table, replace current “Items” display (`1 item(s)`) with:
  1. Prefer showing `po.items_summary` if present (non-empty string)
  2. Fallback to `po.items_count` if present: `${po.items_count} item(s)`
  3. Final fallback (if UI still has `items` array): `${po.items?.length ?? 0} item(s)`

### Notes
- This is already included in the `/api/purchase-orders` responses (because the API loads `items.item`).
- If the supplier profile uses a different endpoint, ensure that endpoint returns `PurchaseOrderResource` and loads `items.item`.
