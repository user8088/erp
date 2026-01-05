# Items & Categories API Documentation

## Overview

This document describes the implemented backend API for the **Items Management** and **Categories Management** features in the ERP system.

### Implementation Status: ✅ Complete

All features described in `TODO.mdc` have been implemented and are ready to use.

---

## What's Been Implemented

### ✅ Database Schema
- **Categories Table**: Stores product categories with optional aliases for serial number generation
- **Items Table**: Stores individual products/items with auto-generated serial numbers

### ✅ Models
- **Category Model**: With auto-uppercase alias and relationship to items
- **Item Model**: With serial number generation logic and relationship to category

### ✅ Services
- **CategoryService**: Business logic for category CRUD operations
- **ItemService**: Business logic for item CRUD operations with image handling

### ✅ Controllers
- **CategoryController**: API endpoints for category management
- **ItemController**: API endpoints for item management

### ✅ Request Validation
- Store/Update/BulkDelete validation for both categories and items
- Custom validation rules and error messages

### ✅ API Resources
- **CategoryResource**: Formats category data for API responses
- **ItemResource**: Formats item data with nested category relationship

### ✅ Routes
- All API routes registered with proper permission middleware
- Follows the same pattern as existing modules (users, customers, etc.)

---

## Database Schema

### Categories Table

```sql
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    alias VARCHAR(10) NULL UNIQUE,
    description TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,

    INDEX idx_name (name),
    INDEX idx_alias (alias)
);
```

**Fields:**
- `name`: Category name (unique, required)
- `alias`: Short code for serial number prefix (uppercase, unique, max 10 chars)
- `description`: Optional description
- Supports soft deletes

### Items Table

```sql
CREATE TABLE items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255) NULL,
    category_id BIGINT UNSIGNED NULL,
    picture_url TEXT NULL,
    total_profit DECIMAL(15, 2) DEFAULT 0.00,
    last_purchase_price DECIMAL(15, 2) NULL,
    lowest_purchase_price DECIMAL(15, 2) NULL,
    highest_purchase_price DECIMAL(15, 2) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    deleted_at TIMESTAMP NULL,

    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_serial_number (serial_number),
    INDEX idx_name (name),
    INDEX idx_category (category_id),
    INDEX idx_brand (brand)
);
```

**Fields:**
- `serial_number`: Auto-generated unique identifier (e.g., `CONST-000001`)
- `name`: Item name
- `brand`: Brand name (optional)
- `category_id`: Foreign key to categories (nullable)
- `picture_url`: URL to item image
- `total_profit`: Calculated field for cumulative profit
- `last_purchase_price`: Last price at which this item was purchased from supplier (optional)
- `lowest_purchase_price`: Lowest price ever paid when buying this item from suppliers (optional)
- `highest_purchase_price`: Highest price ever paid when buying this item from suppliers (optional)
- Supports soft deletes

---

## Serial Number Generation

Items automatically get serial numbers based on their category's alias:

### Format
- **With category alias**: `{ALIAS}-{SEQUENCE}` (e.g., `CONST-000001`, `ELEC-000002`)
- **Without category/alias**: `ITEM-{SEQUENCE}` (e.g., `ITEM-000001`)
- Sequence is 6 digits, padded with zeros

### How It Works
1. When creating an item, the system checks if it has a category
2. If yes and category has an alias, use that alias as prefix
3. Otherwise, use "ITEM" as prefix
4. Find the last item with that prefix and increment the sequence
5. Uses MySQL named locks to prevent race conditions in concurrent requests

### Example
```
Category: "Construction Material" (alias: "CONST")
First item: CONST-000001
Second item: CONST-000002
Third item: CONST-000003
...
```

---

## API Endpoints

### Base URL
All endpoints are prefixed with `/api`

### Authentication
All endpoints require authentication using Sanctum token:
```
Authorization: Bearer {token}
```

---

## Categories API

### 1. List Categories

**Endpoint:** `GET /api/categories`

**Permissions Required:** `module.categories,read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page (max: 100) |
| `search` | string | - | Search in name, alias, description |
| `sort_by` | string | created_at | Field to sort by |
| `sort_order` | string | desc | Sort order: 'asc' or 'desc' |

**Example Request:**
```bash
GET /api/categories?page=1&per_page=20&search=construction
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "Construction Material",
      "alias": "CONST",
      "description": "Building and construction materials",
      "created_at": "2024-12-07T10:00:00Z",
      "updated_at": "2024-12-07T10:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

### 2. Get Single Category

**Endpoint:** `GET /api/categories/{id}`

**Permissions Required:** `module.categories,read`

**Response (200 OK):**
```json
{
  "category": {
    "id": 1,
    "name": "Construction Material",
    "alias": "CONST",
    "description": "Building materials",
    "created_at": "2024-12-07T10:00:00Z",
    "updated_at": "2024-12-07T10:00:00Z"
  }
}
```

### 3. Create Category

**Endpoint:** `POST /api/categories`

**Permissions Required:** `module.categories,read-write`

**Request Body:**
```json
{
  "name": "Construction Material",
  "alias": "CONST",
  "description": "Building and construction materials"
}
```

**Validation Rules:**
- `name`: Required, unique, max 255 characters
- `alias`: Optional, uppercase alphanumeric only, unique, max 10 characters
- `description`: Optional

**Response (201 Created):**
```json
{
  "category": {
    "id": 1,
    "name": "Construction Material",
    "alias": "CONST",
    "description": "Building and construction materials",
    "created_at": "2024-12-07T10:00:00Z",
    "updated_at": "2024-12-07T10:00:00Z"
  },
  "message": "Category created successfully."
}
```

### 4. Update Category

**Endpoint:** `PATCH /api/categories/{id}`

**Permissions Required:** `module.categories,read-write`

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Category Name",
  "alias": "NEWCODE",
  "description": "Updated description"
}
```

**Note:** If alias is updated, only NEW items will use the new alias. Existing items keep their serial numbers.

**Response (200 OK):**
```json
{
  "category": {
    "id": 1,
    "name": "Updated Category Name",
    "alias": "NEWCODE",
    "description": "Updated description",
    "created_at": "2024-12-07T10:00:00Z",
    "updated_at": "2024-12-07T15:30:00Z"
  },
  "message": "Category updated successfully."
}
```

### 5. Delete Category

**Endpoint:** `DELETE /api/categories/{id}`

**Permissions Required:** `module.categories,read-write`

**Important:** Cannot delete category if it has associated items.

**Response (200 OK):**
```json
{
  "message": "Category deleted successfully."
}
```

**Error Response (409 Conflict):**
```json
{
  "message": "Failed to delete category.",
  "error": "Category has associated items. Please reassign or delete items first."
}
```

### 6. Bulk Delete Categories

**Endpoint:** `POST /api/categories/bulk-delete`

**Permissions Required:** `module.categories,read-write`

**Request Body:**
```json
{
  "ids": [1, 2, 3]
}
```

**Response (200 OK):**
```json
{
  "message": "2 category(ies) deleted successfully.",
  "deleted_count": 2,
  "failed_ids": [3]
}
```

---

## Items API

### 1. List Items

**Endpoint:** `GET /api/items`

**Permissions Required:** `module.items,read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `per_page` | integer | 20 | Items per page (max: 100) |
| `search` | string | - | Search in serial_number, name, brand |
| `category_id` | integer | - | Filter by category |
| `brand` | string | - | Filter by brand |
| `sort_by` | string | created_at | Field to sort by |
| `sort_order` | string | desc | Sort order: 'asc' or 'desc' |

**Example Request:**
```bash
GET /api/items?page=1&per_page=20&category_id=1&brand=Fauji
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "serial_number": "CONST-000001",
      "name": "Portland Cement",
      "brand": "Fauji",
      "category_id": 1,
      "category": {
        "id": 1,
        "name": "Construction Material",
        "alias": "CONST",
        "description": "Building materials",
        "created_at": "2024-12-07T10:00:00Z",
        "updated_at": "2024-12-07T10:00:00Z"
      },
      "picture_url": "https://example.com/storage/item-pictures/item_abc123.jpg",
      "total_profit": 125000.50,
      "last_purchase_price": 450.00,
      "lowest_purchase_price": 420.00,
      "highest_purchase_price": 480.00,
      "created_at": "2024-12-07T10:30:00Z",
      "updated_at": "2024-12-07T10:30:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 1,
    "last_page": 1,
    "from": 1,
    "to": 1
  }
}
```

**Note:** Category relationship is always eager-loaded.

### 2. Get Single Item

**Endpoint:** `GET /api/items/{id}`

**Permissions Required:** `module.items,read`

**Response (200 OK):**
```json
{
  "item": {
    "id": 1,
    "serial_number": "CONST-000001",
    "name": "Portland Cement",
    "brand": "Fauji",
    "category_id": 1,
    "category": {
      "id": 1,
      "name": "Construction Material",
      "alias": "CONST",
      "description": null,
      "created_at": "2024-12-07T10:00:00Z",
      "updated_at": "2024-12-07T10:00:00Z"
    },
    "picture_url": "https://example.com/storage/item-pictures/item_abc123.jpg",
    "total_profit": 125000.50,
    "last_purchase_price": 450.00,
    "lowest_purchase_price": 420.00,
    "highest_purchase_price": 480.00,
    "created_at": "2024-12-07T10:30:00Z",
    "updated_at": "2024-12-07T10:30:00Z"
  }
}
```

### 3. Create Item

**Endpoint:** `POST /api/items`

**Permissions Required:** `module.items,read-write`

**Request Body:**
```json
{
  "name": "Portland Cement",
  "brand": "Fauji",
  "category_id": 1,
  "picture_url": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "last_purchase_price": 450.00,
  "lowest_purchase_price": 420.00,
  "highest_purchase_price": 480.00
}
```

**Validation Rules:**
- `name`: Required, max 255 characters
- `brand`: Optional, max 255 characters
- `category_id`: Optional, must exist in categories table
- `picture_url`: Optional, base64 image or URL

**Image Upload:**
- Supports base64 encoded images
- Formats: JPEG, PNG, GIF
- Max size: 5MB
- Stored in `storage/app/public/item-pictures/`

**Response (201 Created):**
```json
{
  "item": {
    "id": 1,
    "serial_number": "CONST-000001",
    "name": "Portland Cement",
    "brand": "Fauji",
    "category_id": 1,
    "category": {
      "id": 1,
      "name": "Construction Material",
      "alias": "CONST",
      "description": null,
      "created_at": "2024-12-07T10:00:00Z",
      "updated_at": "2024-12-07T10:00:00Z"
    },
    "picture_url": "https://example.com/storage/item-pictures/item_abc123.jpg",
    "total_profit": 0.00,
    "last_purchase_price": 450.00,
    "lowest_purchase_price": 420.00,
    "highest_purchase_price": 480.00,
    "created_at": "2024-12-07T10:30:00Z",
    "updated_at": "2024-12-07T10:30:00Z"
  },
  "message": "Item created successfully."
}
```

### 4. Update Item

**Endpoint:** `PATCH /api/items/{id}`

**Permissions Required:** `module.items,read-write`

**Request Body:** (all fields optional)
```json
{
  "name": "Portland Cement - Premium",
  "brand": "Fauji",
  "category_id": 2,
  "picture_url": "data:image/jpeg;base64,...",
  "last_purchase_price": 475.00,
  "lowest_purchase_price": 420.00,
  "highest_purchase_price": 480.00
}
```

**Important:**
- Serial number is read-only and cannot be changed
- If category is changed, serial number remains unchanged
- Old picture is automatically deleted when uploading a new one

**Response (200 OK):**
```json
{
  "item": {
    "id": 1,
    "serial_number": "CONST-000001",
    "name": "Portland Cement - Premium",
    "brand": "Fauji",
    "category_id": 2,
    "category": { /* ... */ },
    "picture_url": "https://example.com/storage/item-pictures/item_xyz789.jpg",
    "total_profit": 125000.50,
    "last_purchase_price": 475.00,
    "lowest_purchase_price": 420.00,
    "highest_purchase_price": 480.00,
    "created_at": "2024-12-07T10:30:00Z",
    "updated_at": "2024-12-07T15:45:00Z"
  },
  "message": "Item updated successfully."
}
```

### 5. Delete Item

**Endpoint:** `DELETE /api/items/{id}`

**Permissions Required:** `module.items,read-write`

**Note:** When sales module is implemented, items with sales records cannot be deleted.

**Response (200 OK):**
```json
{
  "message": "Item deleted successfully."
}
```

### 6. Bulk Delete Items

**Endpoint:** `POST /api/items/bulk-delete`

**Permissions Required:** `module.items,read-write`

**Request Body:**
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

**Response (200 OK):**
```json
{
  "message": "5 item(s) deleted successfully.",
  "deleted_count": 5,
  "failed_ids": []
}
```

---

## Permissions

The following permissions control access to the APIs:

### Categories
- `module.categories,read` - View categories (list, show)
- `module.categories,read-write` - Create, update, delete categories

### Items
- `module.items,read` - View items (list, show)
- `module.items,read-write` - Create, update, delete items

---

## File Structure

```
app/
├── Categories/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── CategoryController.php
│   │   ├── Requests/
│   │   │   ├── StoreCategoryRequest.php
│   │   │   ├── UpdateCategoryRequest.php
│   │   │   └── BulkDeleteCategoryRequest.php
│   │   └── Resources/
│   │       └── CategoryResource.php
│   └── Services/
│       └── CategoryService.php
│
├── Items/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── ItemController.php
│   │   ├── Requests/
│   │   │   ├── StoreItemRequest.php
│   │   │   ├── UpdateItemRequest.php
│   │   │   └── BulkDeleteItemRequest.php
│   │   └── Resources/
│   │       └── ItemResource.php
│   └── Services/
│       └── ItemService.php
│
└── Models/
    ├── Category.php
    └── Item.php

database/
└── migrations/
    ├── 2025_12_07_100000_create_categories_table.php
    └── 2025_12_07_100100_create_items_table.php

storage/
└── app/
    └── public/
        └── item-pictures/
```

---

## Testing the API

### Example: Create a Category and Item

1. **Create a category:**
```bash
curl -X POST https://erp-server-main-xegmvt.laravel.cloud/api/categories \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Construction Material",
    "alias": "CONST",
    "description": "Building materials"
  }'
```

2. **Create an item in that category:**
```bash
curl -X POST https://erp-server-main-xegmvt.laravel.cloud/api/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Portland Cement",
    "brand": "Fauji",
    "category_id": 1,
    "last_purchase_price": 450.00,
    "lowest_purchase_price": 420.00,
    "highest_purchase_price": 480.00
  }'
```

3. **List items:**
```bash
curl -X GET "https://erp-server-main-xegmvt.laravel.cloud/api/items?per_page=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Steps: Stock Module Integration

The items feature is designed to integrate with a future **Stock Module** that will:

1. **Track Inventory**: Maintain current stock levels for each item
2. **Stock Movements**: Record purchases, sales, adjustments, and transfers
3. **Valuation**: Calculate inventory value using methods like FIFO, LIFO, or Average Cost
4. **Stock Alerts**: Notify when stock falls below minimum levels
5. **Profit Calculation**: Update `total_profit` based on actual sales transactions

### Data Flow (Future Implementation)
```
Item (Master Data)
  ↓
Stock Entry (Current Inventory)
  ↓
Stock Movement (Purchases/Sales)
  ↓
Financial Records (Journal Entries)
```

### Suggested Stock Module Schema
```sql
CREATE TABLE stock_entries (
    id BIGINT UNSIGNED PRIMARY KEY,
    item_id BIGINT UNSIGNED,
    warehouse_id BIGINT UNSIGNED,
    quantity DECIMAL(15, 3),
    unit_cost DECIMAL(15, 2),
    -- ... other fields
);

CREATE TABLE stock_movements (
    id BIGINT UNSIGNED PRIMARY KEY,
    item_id BIGINT UNSIGNED,
    movement_type ENUM('purchase', 'sale', 'adjustment', 'transfer'),
    quantity DECIMAL(15, 3),
    unit_price DECIMAL(15, 2),
    -- ... other fields
);
```

---

## Purchase Price Tracking

### Overview

Each item tracks three key price points to help you analyze cost trends and make informed purchasing decisions:

| Field | Description | Purpose |
|-------|-------------|---------|
| `last_purchase_price` | Most recent purchase price | Track current market rate |
| `lowest_purchase_price` | Best (lowest) price ever paid | Identify best deals & suppliers |
| `highest_purchase_price` | Worst (highest) price ever paid | Understand price volatility |

All three fields are **optional (nullable)** and stored as `DECIMAL(15, 2)`.

### Manual Management

You can manually set and update these fields via the API:

**Create item with prices:**
```json
POST /api/items
{
  "name": "Portland Cement",
  "brand": "Fauji",
  "category_id": 1,
  "last_purchase_price": 450.00,
  "lowest_purchase_price": 420.00,
  "highest_purchase_price": 480.00
}
```

**Update prices:**
```json
PATCH /api/items/{id}
{
  "last_purchase_price": 455.00,
  "lowest_purchase_price": 415.00,
  "highest_purchase_price": 485.00
}
```

### Automatic Updates (Future - Purchasing Module)

When the Purchasing Module is implemented, these fields will be **automatically updated** whenever you create a purchase order or invoice.

#### Auto-Update Logic

```php
/**
 * Update item prices when a purchase is made
 * This will be implemented in the Purchasing Module
 */
public function updateItemPricesOnPurchase(Item $item, float $purchasePrice): void
{
    DB::transaction(function () use ($item, $purchasePrice) {
        // Always update last purchase price
        $item->last_purchase_price = $purchasePrice;
        
        // Update lowest if this is a better deal
        if ($item->lowest_purchase_price === null || 
            $purchasePrice < $item->lowest_purchase_price) {
            $item->lowest_purchase_price = $purchasePrice;
        }
        
        // Update highest if this is more expensive
        if ($item->highest_purchase_price === null || 
            $purchasePrice > $item->highest_purchase_price) {
            $item->highest_purchase_price = $purchasePrice;
        }
        
        $item->save();
    });
}
```

#### Workflow Example

1. **First Purchase** - Buy cement at PKR 450/bag:
   ```json
   {
     "last_purchase_price": 450.00,
     "lowest_purchase_price": 450.00,
     "highest_purchase_price": 450.00
   }
   ```

2. **Second Purchase** - Buy at PKR 420/bag (better deal):
   ```json
   {
     "last_purchase_price": 420.00,      // Updated to latest
     "lowest_purchase_price": 420.00,     // Updated (new low)
     "highest_purchase_price": 450.00     // Unchanged
   }
   ```

3. **Third Purchase** - Buy at PKR 480/bag (expensive):
   ```json
   {
     "last_purchase_price": 480.00,      // Updated to latest
     "lowest_purchase_price": 420.00,     // Unchanged (still best)
     "highest_purchase_price": 480.00     // Updated (new high)
   }
   ```

4. **Fourth Purchase** - Buy at PKR 440/bag (normal):
   ```json
   {
     "last_purchase_price": 440.00,      // Updated to latest
     "lowest_purchase_price": 420.00,     // Unchanged
     "highest_purchase_price": 480.00     // Unchanged
   }
   ```

### Business Use Cases

#### 1. **Price Trend Analysis**
```
Current Price: PKR 450
Lowest Ever: PKR 420
Highest Ever: PKR 480
Range: PKR 60 (14.3% variation)
```
→ Helps you understand market volatility

#### 2. **Supplier Comparison**
Track which supplier gives you the best prices:
```sql
-- Find items where current supplier is not giving best price
SELECT name, last_purchase_price, lowest_purchase_price,
       (last_purchase_price - lowest_purchase_price) as overpaying
FROM items
WHERE last_purchase_price > lowest_purchase_price;
```

#### 3. **Pricing Strategy**
Use cost data to set competitive selling prices:
```
Lowest Cost: PKR 420
Markup (30%): PKR 126
Minimum Selling Price: PKR 546

Highest Cost: PKR 480
Markup (30%): PKR 144
Maximum Recommended Price: PKR 624
```

#### 4. **Budget Alerts**
Set up alerts when prices exceed historical ranges:
```php
if ($newPurchasePrice > $item->highest_purchase_price * 1.1) {
    // Alert: Price is 10% higher than ever recorded!
    NotifyManager("Price alert for {$item->name}");
}
```

#### 5. **Profit Margin Calculation**
Calculate profit margins based on actual costs:
```php
$avgCost = ($item->lowest_purchase_price + $item->highest_purchase_price) / 2;
$sellingPrice = 600;
$profitMargin = (($sellingPrice - $avgCost) / $sellingPrice) * 100;
```

### Best Practices

1. **Always Set Last Purchase Price**: Update this on every purchase to track current market rates.

2. **Let System Manage Lowest/Highest**: When purchasing module is implemented, these will auto-update. Don't manually override unless correcting data.

3. **Use for Negotiations**: Reference `lowest_purchase_price` when negotiating with suppliers.

4. **Monitor Price Ranges**: Items with large ranges (high - low) indicate volatile markets - consider bulk buying when prices are low.

5. **Historical Data**: Never delete these fields. They provide valuable historical context for business decisions.

### API Response Example

```json
{
  "item": {
    "id": 1,
    "serial_number": "CONST-000001",
    "name": "Portland Cement",
    "brand": "Fauji",
    "category_id": 1,
    "category": {
      "id": 1,
      "name": "Construction Material",
      "alias": "CONST"
    },
    "picture_url": "https://example.com/storage/item-pictures/item_abc123.jpg",
    "total_profit": 125000.50,
    "last_purchase_price": 450.00,
    "lowest_purchase_price": 420.00,
    "highest_purchase_price": 480.00,
    "created_at": "2024-12-07T10:30:00Z",
    "updated_at": "2024-12-07T15:45:00Z"
  }
}
```

### Notes

- All price fields are **nullable** - new items may not have price data yet
- Prices are stored with 2 decimal precision: `DECIMAL(15, 2)`
- Validation ensures prices are non-negative: `min:0`
- Use transactions when updating multiple price fields together
- Consider currency conversions if dealing with multiple currencies (future enhancement)

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success (GET, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Bad Request |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (cannot delete due to relations) |
| 422 | Unprocessable Entity (validation errors) |
| 500 | Server Error |

---

## Important Notes

1. **Serial Numbers Are Immutable**: Once created, an item's serial number cannot be changed.

2. **Category Alias Changes**: When a category's alias is updated, existing items keep their serial numbers. Only new items get the new prefix.

3. **Soft Deletes**: Both categories and items use soft deletes and can be restored later if needed.

4. **Foreign Key Behavior**: If a category is deleted, associated items remain but lose their category association (category_id becomes NULL).

5. **Image Cleanup**: When updating/deleting items, old images are automatically deleted from storage.

6. **Total Profit**: Currently defaults to 0.00. Will be calculated automatically when the sales/invoicing module is implemented.

7. **Purchase Price Tracking**: See the detailed "Purchase Price Tracking" section above for comprehensive information on how these fields work and will be automatically updated.

8. **Concurrent Requests**: Serial number generation uses MySQL named locks to prevent duplicate serial numbers in concurrent requests.

9. **Performance**: All frequently queried fields (serial_number, name, brand, category_id) are indexed for optimal query performance.

---

## Version History

**Version 1.0** - December 7, 2024
- Initial implementation
- Categories CRUD with alias support
- Items CRUD with auto-generated serial numbers
- Image upload support for items
- Search and filtering
- Pagination
- Bulk operations
- Permission-based access control
- Purchase price tracking (last, lowest, highest)

---

## Support & Questions

For questions or issues related to the Items & Categories API, please refer to:
- Main TODO.mdc specification
- This documentation
- API route definitions in `routes/api.php`
- Test the endpoints using tools like Postman or curl

---

**Implementation Complete! 🎉**

The Items and Categories management feature is fully functional and ready for use. The system is designed to be extended with a Stock Management module in the future for complete inventory tracking.
