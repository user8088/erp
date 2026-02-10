### Stock batches and POS queueing – frontend guide

This document explains how the new **batch-based stock system** works on the backend and what the POS/frontend needs to know.

---

### 1. Concept: batches per purchase / adjustment

- **What is a batch**: Every time stock comes **in**, the backend creates an `ItemStockBatch` entry:
  - Purchase receipts (via Purchase Orders) – one batch per line per receipt.
  - Positive manual adjustments – one batch per adjustment.
- **Each batch/stock lot** stores:
  - `item_id`
  - `purchased_qty` and `remaining_qty`
  - `unit_cost`, `total_cost`
  - `received_at`
  - `status` (`active`, `depleted`, `cancelled`)
- The existing `ItemStock` aggregate (`quantity_on_hand`, `stock_value`) is still maintained and remains the main source for **total available quantity**.

---

### 2. POS selling behavior (what changes for you)

- When a sale is **processed** (`POST /api/sales/{id}/process`) or a delivery sale is auto-processed:
  - The backend finds all **active batches for each item**, ordered by **latest received first**.
  - It **consumes stock from the latest batch** until that batch is depleted, then moves to the next batch, and so on.
  - If there is “legacy” stock (old data before batches existed), it is still usable and is treated as **untracked stock** after all known batches are exhausted.
- For the frontend:
  - You **do not need to send batch IDs** when creating or processing sales.
  - You can still use the existing sale APIs; the queuing behavior is fully handled server-side.

---

### 3. Refunds, cancellations, and restocking

- **Sale cancellation** (`POST /api/sales/{id}/cancel`):
  - The backend looks up the original stock movements for that sale and:
    - Adds quantities back to the **same batches they were taken from**.
    - Restores their `remaining_qty` and `status` (e.g. `depleted` → `active` if > 0 again).
    - Restores the `ItemStock.quantity_on_hand` aggregate.
- **Refund with restock** (customer payments API, when `restock_items=true`):
  - Uses the sale’s stock movements in the same way:
    - Quantities are added back to the **original batches**.
    - Aggregate stock is updated accordingly.
- No new frontend parameters are required – just continue to use the existing refund and cancel flows, and the backend will keep batches consistent.

---

### 4. New batch-related APIs

All routes are under the authenticated API (`/api/...`) and reuse existing auth/module middleware.

#### 4.1 Get aggregate stock (unchanged)

- **Endpoint**: `GET /api/stock/item/{item_id}`
- **Purpose**: Same as before – returns aggregate `quantity_on_hand`, `stock_value`, and basic item info.
- **Notes**:
  - Now, behind the scenes, `quantity_on_hand` is kept in sync with the sum of all batches + any legacy stock.

#### 4.2 Get current active batch for an item

- **Endpoint**: `GET /api/stock/item/{item_id}/active-batch`
- **Purpose**: Get the **head of the queue** – the batch POS will consume from first.
- **Response (200)**:
  - Example shape:
    ```json
    {
      "batch": {
        "id": 123,
        "item_id": 10,
        "purchased_qty": 15.0,
        "remaining_qty": 7.0,
        "unit_cost": 500.0,
        "total_cost": 7500.0,
        "received_at": "2026-02-10T12:34:56Z",
        "status": "active"
      },
      "total_remaining_in_queue": 42.0
    }
    ```
- **Response (404)**:
  - No active batch exists for this item (no batch-based stock; might still have only legacy stock).

Typical POS usage:
- Show the **current batch’s remaining quantity** next to an item.
- Decide whether to visually differentiate items when you are about to move from one batch to the next.

#### 4.3 Get full batch queue for an item

- **Endpoint**: `GET /api/stock/item/{item_id}/batches`
- **Purpose**: Inspect the entire **batch queue** for an item (latest-first).
- **Response (200)**:
  - Example shape:
    ```json
    {
      "batches": [
        {
          "id": 123,
          "item_id": 10,
          "purchased_qty": 15.0,
          "remaining_qty": 7.0,
          "unit_cost": 500.0,
          "total_cost": 7500.0,
          "received_at": "2026-02-10T12:34:56Z",
          "status": "active"
        },
        {
          "id": 120,
          "item_id": 10,
          "purchased_qty": 10.0,
          "remaining_qty": 10.0,
          "unit_cost": 480.0,
          "total_cost": 4800.0,
          "received_at": "2026-02-05T09:00:00Z",
          "status": "active"
        }
      ],
      "total_remaining": 17.0
    }
    ```

Typical POS/reporting usage:
- Show a **queue view** per item for admin/stock screens:
  - Latest batch at the top.
  - Remaining quantity per batch.
  - Optional cost/received date for operators.

---

### 5. What POS UIs should and should not do

- **You should NOT**:
  - Send or manage `batch_id` when creating/editing sales.
  - Manually switch batches for an item in the sale payload.
- **You can/should**:
  - Continue to rely on aggregate `quantity_on_hand` for simple “available stock” display.
  - Use:
    - `GET /api/stock/item/{item_id}/active-batch` to highlight **current batch** in POS.
    - `GET /api/stock/item/{item_id}/batches` for advanced/management UIs (e.g. stock detail drawer, purchasing screens).
  - Treat the **queue order** as:
    - Index 0 from `/active-batch` or first element from `/batches` is the **current** stock.
    - When `remaining_qty` on that batch becomes 0, the backend will automatically start consuming from the **next** batch; frontend does not need to switch anything.

---

### 6. COA / accounting impact (for context only)

- No changes are required on the frontend for accounting behavior:
  - **Purchase receipts** still create the same journal entries as before (Inventory, A/P, other costs).
  - **Sales/POS** still create revenue, discount, and cash/AR entries – there is still **no COGS posting**.
- Batches are **purely a stock-level feature** that:
  - Control which quantities are consumed first.
  - Make it possible to explain/visualize stock consumption in the UI.

---

### 7. Summary for implementers

- **Backend responsibilities**:
  - Track per-purchase/per-adjustment stock batches.
  - Always sell from the **latest batch first**, then move down the queue.
  - Restore stock to the **same batches** on cancellations and refunds (when restocking is enabled).
- **Frontend responsibilities**:
  - Keep using the existing sale + payment APIs.
  - Optionally surface new batch information using:
    - `GET /api/stock/item/{item_id}/active-batch`
    - `GET /api/stock/item/{item_id}/batches`
  - Avoid managing batch IDs directly in POS – batching is an internal queueing mechanism on the backend.

