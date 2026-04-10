# Stock Module Documentation

## Overview

The Stock module manages inventory, purchase orders, stock movements, and supplier invoices. It integrates with the Accounting module for automatic journal entries.

## Features

- **Item Management**: Products with categories, units, pricing
- **Stock Control**: Quantity tracking, reorder levels, batch tracking
- **Purchase Orders**: PO creation, receiving, supplier invoices
- **Stock Movements**: Purchase, sale, adjustment, return tracking
- **Batch Management**: FIFO/LIFO batch tracking with full history
- **Account Mappings**: Automatic GL account assignment
- **Reports**: Stock levels, movements, valuations, trends

## Routes & Pages

```
/stock                               - Stock dashboard
/stock/purchase-orders               - Purchase orders list
/stock/purchase-orders/new          - Create PO
/stock/purchase-orders/[id]         - PO detail
/stock/settings                     - Stock settings

/items                               - Items catalog
/items/[id]                         - Item detail
/items/new                          - Create item
/items/tags                         - Item tag manager

/categories                          - Item categories

/supplier/invoices                   - Supplier invoices
```

## Components

### Stock Dashboard (`app/stock/page.tsx`)
- **Components:**
  - `StockQuickAccess` - Quick actions
  - `PurchaseOrdersTable` - Recent POs
  - `InventoryTable` - Stock overview
  - `LowStockAlertsTable` - Items below reorder level
  - `StockReports` - Report links

### Purchase Orders

#### PurchaseOrdersTable (`app/components/Stock/PurchaseOrdersTable.tsx`)
- **Features:**
  - List all POs with status
  - Filter by supplier, status, date
  - Search by PO number
  - Pagination
- **Columns:** PO #, Supplier, Date, Status, Total, Actions
- **Status:** Draft → Sent → Partial → Received → Cancelled

#### ReceiveStockModal (`app/components/Stock/ReceiveStockModal.tsx`)
- **Features:**
  - Receive items against PO
  - Batch tracking (optional)
  - Quantity validation
  - Supplier invoice upload
- **Flow:**
  1. Select PO
  2. Enter received quantities
  3. Optional: Create supplier invoice
  4. Upload invoice PDF
  5. Confirm receipt

#### SupplierInvoiceUpload (`app/components/Stock/SupplierInvoiceUpload.tsx`)
- **Features:**
  - PDF upload with drag-and-drop
  - File validation (PDF only, size limit)
  - Preview before upload

### Inventory Management

#### InventoryTable (`app/components/Stock/InventoryTable.tsx`)
- **Features:**
  - All items with stock levels
  - Filter by category, status
  - Search by name/SKU
  - Reorder alerts
- **Columns:** Item, Category, On Hand, Reorder Level, Status, Value

#### LowStockAlertsTable (`app/components/Stock/LowStockAlertsTable.tsx`)
- Shows items below reorder level
- Quick reorder action

#### StockMovementsTable (`app/components/Stock/StockMovementsTable.tsx`)
- Complete stock movement history
- Filter by item, type, date
- Export capability

#### StockAdjustmentModal (`app/components/Stock/StockAdjustmentModal.tsx`)
- Adjust stock quantities
- Reason tracking
- Audit trail

### Item Detail (`app/components/ItemDetail/`)

#### ItemDetailContent (`app/components/ItemDetail/ItemDetailContent.tsx`)
- Main item detail layout
- Tabs: Item Details, Sales History, Stock Information, Supplier Costs, Settings

#### ItemDetailsForm (`app/components/ItemDetail/ItemDetailsForm.tsx`)
- Edit item properties:
  - Name, Brand, Category
  - Purchase prices (last, min, max)
  - Selling price
  - Units (primary, secondary, conversion)
  - Tags

#### ItemDetailSidebar (`app/components/ItemDetail/ItemDetailSidebar.tsx`)
- Quick actions
- Stock summary
- Tag management

#### ItemDetailTabs (`app/components/ItemDetail/ItemDetailTabs.tsx`)
- Tab navigation for item detail

#### Supplier Costs Tab (inside `ItemDetailContent`)
- Shows purchase cost analysis for this specific item across all suppliers and batches
- **Sections:**
  1. **Cost & Profit Overview** — 5 summary cards:
     - Selling price (actual avg from sales or catalog fallback)
     - Total Purchase Cost (all batches)
     - Revenue (actual from batch-level data or sales average)
     - Profit / Loss
     - Overall Margin %
  2. **Cost by Supplier** — aggregated table per supplier:
     - Supplier name, batch count, total qty, total cost, avg unit cost, sell price, margin per unit
  3. **Profit & Loss by Batch** — granular per-batch table:
     - Batch #, PO/supplier, qty bought, qty sold, unit cost, sell price (+profit/unit), total cost, revenue, profit/loss, margin, invoice #, invoice actions (preview/download)
     - Uses `batch.revenue` (actual) when available; falls back to avg sell price estimate
  4. **Actual Sales Transactions** — per-sale table:
     - Date, sale #, customer, batch source (with batch cost), qty, actual unit price (with vs-catalog diff), vs cost profit/unit, discount, total
     - Uses `sale.batch_id` and `sale.batch_unit_cost` for batch-specific profit; falls back to avg cost
  5. **Cumulative P&L** — running total table:
     - Batch-by-batch running cost, running profit, running margin
- **Data sources:**
  - `itemsApi.getItemBatches()` — batch history with `revenue` object
  - `itemsApi.getItemSales()` — sale records with `batch_id` and `batch_unit_cost`
- **Profit method:** Prefers actual batch-level revenue (`batch.revenue.profit`). Falls back to actual avg selling price from sales, then catalog `Item.selling_price`.

#### StockAnalyticsChart (`app/components/ItemDetail/StockAnalyticsChart.tsx`)
- Stock level trends
- Movement visualization

#### SalesAnalyticsChart (`app/components/ItemDetail/SalesAnalyticsChart.tsx`)
- Sales trends for the item
- Revenue analysis

### Stock KPIs & Charts

#### StockKPIs (`app/components/Stock/StockKPIs.tsx`)
- Total items in stock
- Total stock value
- Low stock count
- Out of stock count

#### WarehouseStockChart (`app/components/Stock/WarehouseStockChart.tsx`)
- Stock distribution by category
- Visual bar/pie chart

#### StockAccountMappingsBanner (`app/components/Stock/StockAccountMappingsBanner.tsx`)
- Shows current GL account mappings
- Auto-detect suggestions
- Link to configure

### Stock Settings

#### useRentalAccountMappings (`app/components/Rentals/Shared/useRentalAccountMappings.ts`)
Wait, that's rentals - Stock uses `app/lib/stockAccountMappingsClient.ts`

#### stockAccountMappingsClient (`app/lib/stockAccountMappingsClient.ts`)
- Get current mappings
- Auto-detect accounts
- Update mappings
- Reset to defaults

## Type Definitions

### Core Stock Types

```typescript
// Item Types
interface Item {
  id: number;
  serial_number: string;  // CAT-XXXXXX format
  name: string;
  brand: string | null;
  category_id: number | null;
  category?: Category | null;
  picture_url: string | null;
  total_profit: number;
  total_quantity_sold?: number;
  // Purchase prices (from suppliers)
  last_purchase_price: number | null;
  lowest_purchase_price: number | null;
  highest_purchase_price: number | null;
  // Selling price (to customers)
  selling_price: number | null;
  // Unit tracking
  primary_unit: string;     // e.g., "bag", "box", "piece"
  secondary_unit: string | null;  // e.g., "kg", "liter"
  conversion_rate: number | null; // 1 bag = 10 kg
  tags?: ItemTag[];
  created_at: string;
  updated_at: string;
}

// Stock Types
interface ItemStock {
  id: number;
  item_id: number;
  item?: Item;
  quantity_on_hand: number;
  reorder_level: number;
  stock_value: number;  // quantity × selling_price
  last_restocked_at: string | null;
  created_at: string;
  updated_at: string;
}

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Batch Types
interface ItemStockBatch {
  id: number;
  item_id: number;
  purchased_qty: number;
  remaining_qty: number;
  unit_cost: number;
  total_cost: number;
  received_at: string;
  status: 'active' | 'depleted' | 'cancelled';
}

// Purchase Order Types
interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier?: Supplier;
  order_date: string;
  expected_delivery_date: string | null;
  status: 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';
  total_amount: number;
  notes: string | null;
  items: PurchaseOrderItem[];
  invoice?: SupplierInvoice | null;
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  item_id: number;
  item?: Item;
  quantity_ordered: number;
  quantity_received: number;
  quantity_received_final: number | null;
  unit_price: number;
  final_unit_price: number | null;
  total_price: number;
  status: 'pending' | 'partial' | 'received';
  batch_id?: number | null;
}

// Stock Movement Types
interface StockMovement {
  id: number;
  item_id: number;
  item?: Item;
  batch_id: number | null;
  movement_type: 'purchase' | 'sale' | 'adjustment' | 'return' | 'transfer';
  quantity: number;  // Positive = in, Negative = out
  unit_cost: number | null;
  reference_type: string | null;  // 'purchase_order', 'sale_invoice'
  reference_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

### Batch History Types (Complete Stock Tracking)

```typescript
interface ItemBatchHistoryResponse {
  item: {
    id: number;
    serial_number: string;
    name: string;
    primary_unit: string;
  };
  data: ItemBatchHistoryEntry[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

interface ItemBatchHistoryEntry {
  batch_id: number;
  status: 'active' | 'depleted' | 'cancelled';
  received_at: string | null;
  costing: {
    unit_cost: number;
    total_cost: number;
  };
  quantities: {
    purchased_qty: number;
    remaining_qty: number;
    consumed_qty: number;   // purchased - remaining
    sold_qty: number;
    returned_qty: number;
    net_sold_qty: number;   // max(0, sold - returned)
  };
  purchase_order: {
    id: number;
    po_number: string;
    order_date: string | null;
    received_date: string | null;
    supplier_name: string | null;
    supplier: {
      id: number;
      serial_number: string;
      name: string;
    } | null;
  } | null;
  supplier_invoice: {
    id: number;
    invoice_number: string;
    invoice_type: string;
    invoice_date: string | null;
    status: string;
    total_amount: number;
    pdf_path: string | null;
  } | null;
  purchase_order_item: {
    id: number;
    quantity_ordered: number;
    quantity_received: number;
    quantity_received_final: number | null;
    unit_price: number;
    final_unit_price: number | null;
  } | null;
}
```

### Account Mapping Types

```typescript
interface StockAccountMapping {
  id: number;
  inventory_account_id: number;
  accounts_payable_account_id: number;
  inventory_account?: Account;
  accounts_payable_account?: Account;
  created_at: string;
  updated_at: string;
}

interface AutoDetectResponse {
  detected_accounts: {
    inventory_account: Account;
    inventory_detection: {
      confidence: number;
      method: string;
      reason: string;
    };
    accounts_payable_account: Account;
    payable_detection: {
      confidence: number;
      method: string;
      reason: string;
    };
  } | null;
  confidence: 'high' | 'medium' | 'low' | 'none';
  message: string;
  suggestions?: string[];
}
```

## API Endpoints

### Items API

```typescript
// List items
GET /items?page=1&per_page=20&search=&category_id=
Response: Paginated<Item>

// Get item detail
GET /items/{id}
Response: Item

// Create item
POST /items
Body: { name, category_id, primary_unit, selling_price, ... }
Response: Item

// Update item
PUT /items/{id}
Body: Partial<Item>
Response: Item

// Delete item
DELETE /items/{id}

// Get item stock
GET /items/{id}/stock
Response: ItemStock

// Get batch history (Full tracking)
GET /items/{id}/batches?page=1&per_page=20
Response: ItemBatchHistoryResponse

// Get active batch
GET /items/{id}/batches/active
Response: ItemActiveBatchResponse

// Get batch queue (FIFO)
GET /items/{id}/batches/queue?only_active=true
Response: ItemBatchQueueResponse

// Get sales analytics
GET /items/{id}/analytics/sales?period=month
Response: SalesAnalyticsResponse

// Get stock analytics
GET /items/{id}/analytics/stock?period=month
Response: StockAnalyticsResponse
```

### Purchase Orders API

```typescript
// List POs
GET /purchase-orders?supplier_id=&status=&page=1&per_page=20
Response: Paginated<PurchaseOrder>

// Get PO detail
GET /purchase-orders/{id}
Response: PurchaseOrder

// Create PO
POST /purchase-orders
Body: { supplier_id, order_date, items: [...] }
Response: PurchaseOrder

// Update PO
PUT /purchase-orders/{id}
Body: Partial<PurchaseOrder>
Response: PurchaseOrder

// Delete PO
DELETE /purchase-orders/{id}

// Add item to PO
POST /purchase-orders/{id}/items
Body: { item_id, quantity_ordered, unit_price }
Response: PurchaseOrderItem

// Update PO item
PATCH /purchase-orders/{id}/items/{itemId}
Body: { quantity_ordered, unit_price }
Response: PurchaseOrderItem

// Remove PO item
DELETE /purchase-orders/{id}/items/{itemId}

// Receive item (with batch tracking)
POST /purchase-orders/{id}/items/{itemId}/receive
Body: {
  quantity_received: number,
  batch_reference?: string,
  unit_cost?: number,
  received_at?: string
}
Response: PurchaseOrderItem

// Upload supplier invoice
POST /purchase-orders/{id}/upload-invoice
Content-Type: multipart/form-data
Body: { invoice: File }
Response: { invoice: SupplierInvoice }

// Export PO to PDF
GET /purchase-orders/{id}/export/pdf
Response: Blob

// Export PO to Excel
GET /purchase-orders/{id}/export/excel
Response: Blob
```

### Stock Movements API

```typescript
// List movements
GET /stock-movements?item_id=&movement_type=&page=1&per_page=20
Response: Paginated<StockMovement>

// Create movement (adjustment)
POST /stock-movements
Body: {
  item_id: number,
  movement_type: 'adjustment',
  quantity: number,
  notes?: string
}
Response: StockMovement
```

### Stock Account Mappings API

```typescript
// Get current mapping
GET /stock-account-mappings
Response: StockAccountMapping

// Auto-detect accounts
GET /stock-account-mappings/detect
Response: AutoDetectResponse

// Update mapping
PUT /stock-account-mappings
Body: {
  inventory_account_id: number,
  accounts_payable_account_id: number
}
Response: StockAccountMapping

// Reset mapping
DELETE /stock-account-mappings
Response: { message: string }
```

### Categories API

```typescript
// List categories
GET /categories?page=1&per_page=20
Response: Paginated<Category>

// Create category
POST /categories
Body: { name, alias, description }
Response: Category

// Update category
PUT /categories/{id}
Body: Partial<Category>
Response: Category

// Delete category
DELETE /categories/{id}
```

### Item Tags API

```typescript
// List tags
GET /item-tags
Response: ItemTag[]

// Create tag
POST /item-tags
Body: { name, color }
Response: ItemTag

// Update tag
PUT /item-tags/{id}
Body: { name, color }
Response: ItemTag

// Delete tag
DELETE /item-tags/{id}

// Sync item tags
POST /items/{id}/tags
Body: { tag_ids: number[] }
Response: Item
```

## Business Logic

### Batch Tracking (FIFO)

```typescript
// When selling items:
// 1. Get active batches (queue)
const queue = await itemsApi.getBatchQueue(itemId, { only_active: true });

// 2. Consume from oldest batch first (FIFO)
let remainingToSell = saleQuantity;
for (const batch of queue.batches) {
  if (remainingToSell <= 0) break;

  const takeFromBatch = Math.min(batch.remaining_qty, remainingToSell);
  // Record sale against this batch
  remainingToSell -= takeFromBatch;
}
```

### Stock Value Calculation

```typescript
// Stock value = quantity × selling_price
const stockValue = itemStock.quantity_on_hand * (item.selling_price || 0);

// Total stock value (for reporting)
const totalValue = items.reduce((sum, item) => {
  return sum + (item.stock?.stock_value || 0);
}, 0);
```

### Reorder Level Alerts

```typescript
const stockStatus: StockStatus =
  quantity_on_hand <= 0 ? 'out_of_stock' :
  quantity_on_hand <= reorder_level ? 'low_stock' :
  'in_stock';
```

### Purchase Order Flow

```
1. Create PO (status: draft)
   ↓
2. Send to Supplier (status: sent)
   ↓
3. Receive Items (status: partial or received)
   - Create stock batches
   - Update inventory quantities
   - Record stock movements
   - Generate accounting entries (optional)
   ↓
4. Upload Invoice (optional)
   ↓
5. Complete (status: received)
```

### Automatic Accounting Entries

When receiving stock with account mappings configured:

```
Debit: Inventory Account (Asset+)
Credit: Accounts Payable (Liability+)
```

When supplier invoice is paid:

```
Debit: Accounts Payable (Liability-)
Credit: Cash/Bank (Asset-)
```

## Component Usage Examples

### Displaying Item Stock
```typescript
import { itemsApi } from "../lib/apiClient";

function ItemStockView({ itemId }: { itemId: number }) {
  const [stock, setStock] = useState<ItemStock | null>(null);

  useEffect(() => {
    itemsApi.getStock(itemId).then(setStock);
  }, [itemId]);

  return (
    <div>
      <p>On Hand: {stock?.quantity_on_hand}</p>
      <p>Reorder Level: {stock?.reorder_level}</p>
      <p>Value: ${stock?.stock_value.toFixed(2)}</p>
    </div>
  );
}
```

### Creating Purchase Order
```typescript
const handleCreatePO = async () => {
  const po = await purchaseOrdersApi.createPurchaseOrder({
    supplier_id: 123,
    order_date: new Date().toISOString().split('T')[0],
    items: [
      {
        item_id: 1,
        quantity_ordered: 100,
        unit_price: 50.00
      }
    ]
  });

  console.log("Created PO:", po.po_number);
};
```

### Receiving Stock
```typescript
const handleReceive = async () => {
  await purchaseOrdersApi.receiveItem(poId, itemId, {
    quantity_received: 100,
    unit_cost: 45.00,
    received_at: new Date().toISOString()
  });

  // Refresh data
  refresh();
};
```

### Batch History Display
```typescript
const [batchHistory, setBatchHistory] = useState<ItemBatchHistoryResponse | null>(null);

useEffect(() => {
  itemsApi.getBatchHistory(itemId, { page: 1, per_page: 20 })
    .then(setBatchHistory);
}, [itemId]);

// Display batch table with PO and supplier info
{batchHistory?.data.map(batch => (
  <tr key={batch.batch_id}>
    <td>{batch.received_at}</td>
    <td>{batch.purchase_order?.po_number}</td>
    <td>{batch.purchase_order?.supplier_name}</td>
    <td>{batch.quantities.purchased_qty}</td>
    <td>{batch.quantities.remaining_qty}</td>
    <td>{batch.quantities.net_sold_qty}</td>
  </tr>
))}
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Items | module.stock | read |
| Create/Edit Items | module.stock | read-write |
| View Stock Levels | module.stock | read |
| Create POs | module.stock | read-write |
| Receive Stock | module.stock | read-write |
| Adjust Stock | module.stock | read-write |
| View Reports | module.stock | read |
| Configure Accounts | module.stock | read-write |

## Related Documentation
- [Type System](./04-type-system.md) - Item, PurchaseOrder, StockMovement types
- [API Client](./03-api-client.md) - itemsApi, purchaseOrdersApi
- [Accounting Module](./06-modules-accounting.md) - Account mappings and journal entries
- [Supplier Module](./08-modules-suppliers.md) - Supplier integration with POs
