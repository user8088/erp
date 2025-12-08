# Item Tags System - Frontend Integration Documentation

## Overview

This document provides comprehensive details for integrating the **Item Tags System** with the frontend application. Tags help categorize and organize items (e.g., "Raw Material", "Finished Goods", "Perishable", "Fast Moving", etc.) using a flexible many-to-many relationship.

---

## Table of Contents

1. [Authentication & Headers](#authentication--headers)
2. [Data Models](#data-models)
3. [Tag Management APIs](#tag-management-apis)
4. [Tag Assignment APIs](#tag-assignment-apis)
5. [Error Handling](#error-handling)
6. [Implementation Examples](#implementation-examples)
7. [Common Workflows](#common-workflows)

---

## Authentication & Headers

All endpoints require authentication using Laravel Sanctum tokens.

### Required Headers

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer {token}
```

---

## Data Models

### ItemTag

```typescript
interface ItemTag {
  id: number;
  name: string; // Unique tag name
  color: string; // Hex color code (e.g., "#3b82f6")
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
}
```

### Item (with Tags)

```typescript
interface Item {
  id: number;
  serial_number: string;
  name: string;
  brand: string | null;
  category_id: number | null;
  category: Category | null;
  selling_price: string | null;
  primary_unit: string;
  secondary_unit: string | null;
  conversion_rate: string | null;
  tags: ItemTag[]; // Array of assigned tags
  // ... other fields
}
```

---

## Tag Management APIs

### 1. Get All Tags

Get paginated list of all item tags.

**Endpoint:** `GET /api/item-tags`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number |
| per_page | integer | No | 50 | Items per page (max 100) |
| search | string | No | - | Search tag names |

**Example Request:**

```bash
GET /api/item-tags?per_page=50&search=raw
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Raw Material",
      "color": "#3b82f6",
      "created_at": "2025-12-08T10:00:00Z",
      "updated_at": "2025-12-08T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Finished Goods",
      "color": "#10b981",
      "created_at": "2025-12-08T10:05:00Z",
      "updated_at": "2025-12-08T10:05:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 50,
    "total": 2,
    "last_page": 1,
    "from": 1,
    "to": 2
  }
}
```

---

### 2. Get Single Tag

Get details of a specific tag.

**Endpoint:** `GET /api/item-tags/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Tag ID |

**Example Request:**

```bash
GET /api/item-tags/1
```

**Response (200 OK):**

```json
{
  "tag": {
    "id": 1,
    "name": "Raw Material",
    "color": "#3b82f6",
    "created_at": "2025-12-08T10:00:00Z",
    "updated_at": "2025-12-08T10:00:00Z"
  }
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 404 Not Found | `{ "message": "No query results for model [App\\Models\\ItemTag]." }` |

---

### 3. Create Tag

Create a new item tag.

**Endpoint:** `POST /api/item-tags`

**Request Body:**

```json
{
  "name": "Raw Material",
  "color": "#3b82f6"
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| name | required, string, max:255, unique:item_tags | Tag name (must be unique) |
| color | required, string, hex format | Hex color code (e.g., #3b82f6) |

**Example Request:**

```bash
POST /api/item-tags
{
  "name": "Fast Moving",
  "color": "#f59e0b"
}
```

**Response (201 Created):**

```json
{
  "tag": {
    "id": 3,
    "name": "Fast Moving",
    "color": "#f59e0b",
    "created_at": "2025-12-08T11:00:00Z",
    "updated_at": "2025-12-08T11:00:00Z"
  },
  "message": "Tag created successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 422 Unprocessable Entity | `{ "message": "Validation failed", "errors": { "name": ["A tag with this name already exists."] } }` |

---

### 4. Update Tag

Update an existing tag.

**Endpoint:** `PATCH /api/item-tags/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Tag ID |

**Request Body:** (all fields optional for partial update)

```json
{
  "name": "Raw Materials",
  "color": "#2563eb"
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| name | sometimes, required, string, max:255, unique (excluding current tag) | Tag name |
| color | sometimes, required, string, hex format | Hex color code |

**Response (200 OK):**

```json
{
  "tag": {
    "id": 1,
    "name": "Raw Materials",
    "color": "#2563eb",
    "created_at": "2025-12-08T10:00:00Z",
    "updated_at": "2025-12-08T11:15:00Z"
  },
  "message": "Tag updated successfully"
}
```

---

### 5. Delete Tag

Delete a tag (also removes all assignments to items).

**Endpoint:** `DELETE /api/item-tags/{id}`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | Tag ID |

**Example Request:**

```bash
DELETE /api/item-tags/1
```

**Response (200 OK):**

```json
{
  "message": "Tag deleted successfully"
}
```

**Notes:**
- Deleting a tag automatically removes it from all items (cascade delete in pivot table)
- No orphaned relationships remain

---

## Tag Assignment APIs

### 6. Assign Tag to Item

Assign a tag to a specific item.

**Endpoint:** `POST /api/item-tags/{tagId}/assign`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| tagId | integer | Tag ID |

**Request Body:**

```json
{
  "item_id": 9
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| item_id | required, exists:items | Item must exist |

**Example Request:**

```bash
POST /api/item-tags/1/assign
{
  "item_id": 9
}
```

**Response (200 OK):**

```json
{
  "message": "Tag assigned to item successfully"
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 400 Bad Request | `{ "message": "Tag is already assigned to this item" }` |
| 404 Not Found | `{ "message": "Item not found" }` |

---

### 7. Remove Tag from Item

Remove a tag from a specific item.

**Endpoint:** `POST /api/item-tags/{tagId}/remove`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| tagId | integer | Tag ID |

**Request Body:**

```json
{
  "item_id": 9
}
```

**Response (200 OK):**

```json
{
  "message": "Tag removed from item successfully"
}
```

**Notes:**
- Safe to call even if tag isn't assigned (no error)
- Detaches the relationship without affecting tag or item

---

### 8. Get Item's Tags

Get all tags assigned to a specific item.

**Endpoint:** `GET /api/items/{itemId}/tags`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| itemId | integer | Item ID |

**Example Request:**

```bash
GET /api/items/9/tags
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": 1,
      "name": "Raw Material",
      "color": "#3b82f6",
      "created_at": "2025-12-08T10:00:00Z",
      "updated_at": "2025-12-08T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Construction Material",
      "color": "#10b981",
      "created_at": "2025-12-08T10:05:00Z",
      "updated_at": "2025-12-08T10:05:00Z"
    }
  ]
}
```

---

### 9. Sync Item Tags

Replace all tags for an item at once.

**Endpoint:** `POST /api/items/{itemId}/tags/sync`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| itemId | integer | Item ID |

**Request Body:**

```json
{
  "tag_ids": [1, 2, 3]
}
```

**Validation Rules:**

| Field | Rules | Description |
|-------|-------|-------------|
| tag_ids | required, array | Array of tag IDs |
| tag_ids.* | exists:item_tags | Each tag must exist |

**Example Request:**

```bash
POST /api/items/9/tags/sync
{
  "tag_ids": [1, 2, 3]
}
```

**Response (200 OK):**

```json
{
  "message": "Item tags updated successfully",
  "data": [
    {
      "id": 1,
      "name": "Raw Material",
      "color": "#3b82f6",
      "created_at": "2025-12-08T10:00:00Z",
      "updated_at": "2025-12-08T10:00:00Z"
    },
    {
      "id": 2,
      "name": "Finished Goods",
      "color": "#10b981",
      "created_at": "2025-12-08T10:05:00Z",
      "updated_at": "2025-12-08T10:05:00Z"
    },
    {
      "id": 3,
      "name": "Fast Moving",
      "color": "#f59e0b",
      "created_at": "2025-12-08T10:10:00Z",
      "updated_at": "2025-12-08T10:10:00Z"
    }
  ]
}
```

**Notes:**
- **Replaces all existing tags** with the provided list
- Previous tags not in the list are removed
- New tags in the list are added
- Use empty array `[]` to remove all tags

---

## Error Handling

### Standard Error Response Format

```json
{
  "message": "Error description",
  "errors": {
    "field_name": ["Error message 1"]
  }
}
```

### Common HTTP Status Codes

| Status Code | Meaning | When It Occurs |
|-------------|---------|----------------|
| 200 OK | Success | Request completed successfully |
| 201 Created | Created | Tag created successfully |
| 400 Bad Request | Bad request | Tag already assigned, etc. |
| 404 Not Found | Not found | Tag or item doesn't exist |
| 422 Unprocessable Entity | Validation error | Request validation failed |

---

## Implementation Examples

### React/TypeScript Example

#### Fetch All Tags

```typescript
interface ItemTag {
  id: number;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

async function fetchTags(page: number = 1, search?: string) {
  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('per_page', '50');
  if (search) params.append('search', search);

  const response = await fetch(`/api/item-tags?${params}`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) throw new Error('Failed to fetch tags');
  return await response.json();
}

// Usage
const { data: tags, meta } = await fetchTags(1, 'raw');
```

---

#### Create Tag

```typescript
interface CreateTagData {
  name: string;
  color: string; // Hex color like "#3b82f6"
}

async function createTag(data: CreateTagData) {
  const response = await fetch('/api/item-tags', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create tag');
  }

  return await response.json();
}

// Usage
try {
  const result = await createTag({
    name: 'Fast Moving',
    color: '#f59e0b'
  });
  console.log('Tag created:', result.tag.id);
  showSuccess(result.message);
} catch (error) {
  showError(error.message);
}
```

---

#### Display Tag Badge Component

```tsx
interface TagBadgeProps {
  tag: ItemTag;
  onRemove?: () => void;
}

function TagBadge({ tag, onRemove }: TagBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${tag.color}20`, // 20 = 12.5% opacity
        color: tag.color,
        border: `1px solid ${tag.color}40`
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70"
          aria-label="Remove tag"
        >
          ×
        </button>
      )}
    </span>
  );
}

// Usage
<div className="flex flex-wrap gap-2">
  {item.tags.map(tag => (
    <TagBadge key={tag.id} tag={tag} onRemove={() => removeTag(tag.id)} />
  ))}
</div>
```

---

#### Assign Tag to Item

```typescript
async function assignTagToItem(tagId: number, itemId: number) {
  const response = await fetch(`/api/item-tags/${tagId}/assign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ item_id: itemId })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to assign tag');
  }

  return await response.json();
}

// Usage
try {
  await assignTagToItem(1, 9); // Assign tag #1 to item #9
  showSuccess('Tag assigned successfully');
  refreshItem();
} catch (error) {
  showError(error.message);
}
```

---

#### Sync Tags (Replace All)

```typescript
async function syncItemTags(itemId: number, tagIds: number[]) {
  const response = await fetch(`/api/items/${itemId}/tags/sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ tag_ids: tagIds })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to sync tags');
  }

  return await response.json();
}

// Usage - Replace all tags at once
const selectedTagIds = [1, 2, 3];
const result = await syncItemTags(9, selectedTagIds);
console.log('Tags updated:', result.data);
```

---

#### Multi-Select Tag Picker Component

```tsx
interface TagPickerProps {
  availableTags: ItemTag[];
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
}

function TagPicker({ availableTags, selectedTagIds, onChange }: TagPickerProps) {
  const toggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  return (
    <div className="tag-picker">
      <label>Tags</label>
      <div className="flex flex-wrap gap-2 mt-2">
        {availableTags.map(tag => (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggleTag(tag.id)}
            className={`px-3 py-1 rounded-full text-sm ${
              selectedTagIds.includes(tag.id)
                ? 'opacity-100'
                : 'opacity-50'
            }`}
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
              border: `2px solid ${
                selectedTagIds.includes(tag.id) ? tag.color : 'transparent'
              }`
            }}
          >
            {selectedTagIds.includes(tag.id) && '✓ '}
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// Usage in item form
const [selectedTags, setSelectedTags] = useState<number[]>(item.tags.map(t => t.id));

<TagPicker
  availableTags={allTags}
  selectedTagIds={selectedTags}
  onChange={setSelectedTags}
/>

// On save:
await syncItemTags(itemId, selectedTags);
```

---

### Vue.js Example

#### Composable for Tag Management

```typescript
// useItemTags.ts
import { ref } from 'vue';

export function useItemTags() {
  const tags = ref<ItemTag[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchTags = async (search?: string) => {
    loading.value = true;
    error.value = null;
    
    try {
      const params = new URLSearchParams();
      params.append('per_page', '100');
      if (search) params.append('search', search);

      const response = await fetch(`/api/item-tags?${params}`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch tags');
      
      const data = await response.json();
      tags.value = data.data;
      return data;
    } catch (e) {
      error.value = e.message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  const createTag = async (name: string, color: string) => {
    try {
      const response = await fetch('/api/item-tags', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name, color })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const result = await response.json();
      tags.value.push(result.tag);
      return result;
    } catch (e) {
      error.value = e.message;
      throw e;
    }
  };

  const syncItemTags = async (itemId: number, tagIds: number[]) => {
    try {
      const response = await fetch(`/api/items/${itemId}/tags/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ tag_ids: tagIds })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      return await response.json();
    } catch (e) {
      error.value = e.message;
      throw e;
    }
  };

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    syncItemTags
  };
}
```

---

## Common Workflows

### Workflow 1: Create Tags for Organization

```javascript
// Create common tags
const commonTags = [
  { name: 'Raw Material', color: '#3b82f6' },
  { name: 'Finished Goods', color: '#10b981' },
  { name: 'Perishable', color: '#ef4444' },
  { name: 'Fast Moving', color: '#f59e0b' },
  { name: 'Seasonal', color: '#8b5cf6' },
  { name: 'Import', color: '#06b6d4' },
];

for (const tagData of commonTags) {
  await createTag(tagData);
}
```

---

### Workflow 2: Tag Items During Creation

```javascript
// When creating/editing an item
const handleSaveItem = async (itemData) => {
  // 1. Create/update the item
  const response = await fetch('/api/items', {
    method: 'POST',
    body: JSON.stringify(itemData)
  });
  const { item } = await response.json();

  // 2. Sync tags
  if (selectedTagIds.length > 0) {
    await syncItemTags(item.id, selectedTagIds);
  }

  showSuccess('Item saved with tags');
};
```

---

### Workflow 3: Filter Items by Tag

```javascript
// Frontend filtering (after fetching items with tags)
function filterItemsByTag(items: Item[], tagId: number) {
  return items.filter(item =>
    item.tags.some(tag => tag.id === tagId)
  );
}

// Usage
const rawMaterialItems = filterItemsByTag(allItems, 1); // Tag ID 1 = "Raw Material"
```

---

### Workflow 4: Bulk Tag Assignment

```javascript
// Assign same tag to multiple items
async function bulkAssignTag(tagId: number, itemIds: number[]) {
  const promises = itemIds.map(itemId =>
    assignTagToItem(tagId, itemId)
  );
  
  await Promise.all(promises);
  showSuccess(`Tag assigned to ${itemIds.length} items`);
}

// Usage
await bulkAssignTag(1, [5, 6, 7, 8, 9]);
```

---

### Workflow 5: Tag Color Picker

```typescript
// Common color presets
const TAG_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#f59e0b' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Gray', value: '#6b7280' },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex gap-2">
      {TAG_COLORS.map(color => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          className={`w-8 h-8 rounded-full border-2 ${
            value === color.value ? 'border-gray-900' : 'border-transparent'
          }`}
          style={{ backgroundColor: color.value }}
          title={color.name}
        />
      ))}
    </div>
  );
}
```

---

## Summary

The Item Tags System provides:

✅ **Complete Tag Management** - CRUD operations for tags  
✅ **Flexible Assignment** - Assign/remove tags individually or in bulk  
✅ **Tag Sync** - Replace all tags at once  
✅ **Color Coding** - Visual organization with hex colors  
✅ **Search Support** - Find tags by name  
✅ **Automatic Cleanup** - Cascade deletes when tags or items are removed  
✅ **Many-to-Many Relationship** - Items can have multiple tags, tags can be on multiple items  
✅ **Integrated with Items** - Tags included in item API responses  

All APIs return proper status codes, include validation errors, and follow RESTful conventions.

---

**Last Updated:** December 8, 2025  
**API Version:** 1.0
