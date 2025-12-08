# BACKEND FIX REQUIRED: Item Units Not Being Saved

## Problem
The frontend is correctly sending `primary_unit`, `secondary_unit`, and `conversion_rate` in the request body when creating/updating items, but the backend is NOT saving these values to the database.

## Evidence
Frontend sends this payload to `POST /items`:
```json
{
  "name": "Debug Test",
  "brand": "ABC",
  "category_id": 1,
  "primary_unit": "Box",
  "secondary_unit": "Meter",
  "conversion_rate": 100
}
```

Backend responds with success (200), but when retrieving the item, it returns:
```json
{
  "primary_unit": "piece",
  "secondary_unit": null,
  "conversion_rate": null
}
```

## What Needs to be Fixed in Backend

### 1. Check Request Validation
Ensure your item creation/update endpoints accept these fields:
- `primary_unit` (string, required)
- `secondary_unit` (string, nullable)
- `conversion_rate` (number, nullable)

**Example (Laravel):**
```php
// In your ItemRequest or validation rules
public function rules()
{
    return [
        'name' => 'required|string|max:255',
        'brand' => 'nullable|string|max:255',
        'category_id' => 'nullable|integer|exists:categories,id',
        'primary_unit' => 'required|string|max:50',  // ADD THIS
        'secondary_unit' => 'nullable|string|max:50', // ADD THIS
        'conversion_rate' => 'nullable|numeric|min:0', // ADD THIS
        // ... other fields
    ];
}
```

### 2. Check Database Migration
Ensure the `items` table has these columns:
```sql
ALTER TABLE items 
ADD COLUMN primary_unit VARCHAR(50) NOT NULL DEFAULT 'piece',
ADD COLUMN secondary_unit VARCHAR(50) NULL,
ADD COLUMN conversion_rate DECIMAL(10,2) NULL;
```

**Check if they exist:**
```sql
DESCRIBE items;
```

### 3. Check Model Mass Assignment
Ensure the Item model allows these fields to be mass-assigned:

**Example (Laravel):**
```php
// In app/Models/Item.php
protected $fillable = [
    'name',
    'brand',
    'category_id',
    'primary_unit',      // ADD THIS
    'secondary_unit',    // ADD THIS
    'conversion_rate',   // ADD THIS
    // ... other fields
];
```

### 4. Check Controller Logic
Ensure the controller is actually saving these fields:

**Example (Laravel):**
```php
// In ItemController@store
public function store(Request $request)
{
    $validated = $request->validate([
        'name' => 'required|string',
        'primary_unit' => 'required|string',
        'secondary_unit' => 'nullable|string',
        'conversion_rate' => 'nullable|numeric',
        // ... other fields
    ]);

    $item = Item::create($validated);

    return response()->json([
        'message' => 'Item created successfully.',
        'item' => $item
    ]);
}

// In ItemController@update
public function update(Request $request, $id)
{
    $item = Item::findOrFail($id);
    
    $validated = $request->validate([
        'name' => 'required|string',
        'primary_unit' => 'required|string',
        'secondary_unit' => 'nullable|string',
        'conversion_rate' => 'nullable|numeric',
        // ... other fields
    ]);

    $item->update($validated);

    return response()->json([
        'message' => 'Item updated successfully.',
        'item' => $item->fresh()
    ]);
}
```

### 5. Remove Any Default Value Logic
Check if there's any code that's overriding these values with defaults like "piece":

**Search for:**
- `primary_unit = 'piece'`
- Any observers/events that set defaults
- Any mutators or accessors that modify these fields

## Testing After Fix

1. **Create a test item:**
```bash
curl -X POST http://your-api/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Item",
    "primary_unit": "bag",
    "secondary_unit": "kg",
    "conversion_rate": 50
  }'
```

2. **Verify the response includes:**
```json
{
  "item": {
    "id": 1,
    "name": "Test Item",
    "primary_unit": "bag",
    "secondary_unit": "kg",
    "conversion_rate": 50
  }
}
```

3. **Retrieve the item and verify:**
```bash
curl -X GET http://your-api/items/1
```

Should return the same values.

## Quick Diagnosis Commands

**If using Laravel:**
```bash
# Check if columns exist
php artisan tinker
>>> Schema::hasColumn('items', 'primary_unit')
>>> Schema::hasColumn('items', 'secondary_unit')
>>> Schema::hasColumn('items', 'conversion_rate')

# Check what's in the database
>>> \DB::table('items')->select('primary_unit', 'secondary_unit', 'conversion_rate')->get()

# Test creating directly
>>> $item = \App\Models\Item::create([
    'name' => 'Test',
    'primary_unit' => 'box',
    'secondary_unit' => 'meter',
    'conversion_rate' => 100
]);
>>> $item->refresh();
>>> $item->primary_unit
```

## Summary
✅ Frontend is working correctly and sending the data
❌ Backend is NOT saving the data to database
🔧 Fix required: Update backend validation, model, and controller to accept and save these fields
