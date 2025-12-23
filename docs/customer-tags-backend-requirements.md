# Customer Tags System - Backend Implementation Requirements

## Overview
Implement a tag management system for customers that allows creating, updating, deleting tags, and assigning/removing tags from customers. This should follow the same pattern as the existing item tags system.

---

## Database Schema

### Migration: Create `customer_tags` Table

```php
Schema::create('customer_tags', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('color', 7); // Hex color code like #3b82f6
    $table->timestamps();
    
    $table->unique('name');
    $table->index('name');
});
```

### Migration: Create `customer_tag_assignments` Pivot Table

```php
Schema::create('customer_tag_assignments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
    $table->foreignId('customer_tag_id')->constrained('customer_tags')->onDelete('cascade');
    $table->timestamps();
    
    $table->unique(['customer_id', 'customer_tag_id']);
    $table->index('customer_id');
    $table->index('customer_tag_id');
});
```

---

## Model

### Create `CustomerTag` Model

**Location:** `app/Models/CustomerTag.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class CustomerTag extends Model
{
    protected $fillable = [
        'name',
        'color',
    ];

    protected $casts = [
        'id' => 'integer',
    ];

    /**
     * Get all customers with this tag
     */
    public function customers(): BelongsToMany
    {
        return $this->belongsToMany(Customer::class, 'customer_tag_assignments')
            ->withTimestamps();
    }
}
```

### Update `Customer` Model

**Location:** `app/Models/Customer.php`

Add the relationship method:

```php
/**
 * Get all tags assigned to this customer
 */
public function tags(): BelongsToMany
{
    return $this->belongsToMany(CustomerTag::class, 'customer_tag_assignments')
        ->withTimestamps();
}
```

---

## Policy

### Create `CustomerTagPolicy`

**Location:** `app/Policies/CustomerTagPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\CustomerTag;
use App\Models\User;

class CustomerTagPolicy
{
    /**
     * Determine if the user can view customer tags.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('module.customer,read');
    }

    /**
     * Determine if the user can view a customer tag.
     */
    public function view(User $user, CustomerTag $customerTag): bool
    {
        return $user->hasPermission('module.customer,read');
    }

    /**
     * Determine if the user can create customer tags.
     */
    public function create(User $user): bool
    {
        return $user->hasPermission('module.customer,read-write');
    }

    /**
     * Determine if the user can update a customer tag.
     */
    public function update(User $user, CustomerTag $customerTag): bool
    {
        return $user->hasPermission('module.customer,read-write');
    }

    /**
     * Determine if the user can delete a customer tag.
     */
    public function delete(User $user, CustomerTag $customerTag): bool
    {
        return $user->hasPermission('module.customer,read-write');
    }
}
```

**Register the policy in `app/Providers/AuthServiceProvider.php`:**

```php
protected $policies = [
    CustomerTag::class => CustomerTagPolicy::class,
];
```

---

## Controller

### Create `CustomerTagController`

**Location:** `app/Http/Controllers/Api/CustomerTagController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerTag;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class CustomerTagController extends Controller
{
    /**
     * List all customer tags
     * 
     * GET /api/customer-tags
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', CustomerTag::class);

        $query = CustomerTag::query();

        // Search by name
        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Pagination
        $perPage = min($request->get('per_page', 15), 100);
        $tags = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'data' => $tags->items(),
            'meta' => [
                'current_page' => $tags->currentPage(),
                'per_page' => $tags->perPage(),
                'total' => $tags->total(),
                'last_page' => $tags->lastPage(),
                'from' => $tags->firstItem(),
                'to' => $tags->lastItem(),
            ],
        ]);
    }

    /**
     * Get a specific customer tag
     * 
     * GET /api/customer-tags/{id}
     */
    public function show(CustomerTag $customerTag): JsonResponse
    {
        $this->authorize('view', $customerTag);

        return response()->json([
            'tag' => $customerTag,
        ]);
    }

    /**
     * Create a new customer tag
     * 
     * POST /api/customer-tags
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', CustomerTag::class);

        $validator = Validator::make($request->all(), [
            'name' => [
                'required',
                'string',
                'max:255',
                'unique:customer_tags,name',
            ],
            'color' => [
                'required',
                'string',
                'regex:/^#[0-9A-Fa-f]{6}$/',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $tag = CustomerTag::create([
            'name' => $request->name,
            'color' => $request->color,
        ]);

        return response()->json([
            'tag' => $tag,
            'message' => 'Customer tag created successfully.',
        ], 201);
    }

    /**
     * Update a customer tag
     * 
     * PATCH /api/customer-tags/{id}
     */
    public function update(Request $request, CustomerTag $customerTag): JsonResponse
    {
        $this->authorize('update', $customerTag);

        $validator = Validator::make($request->all(), [
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                'unique:customer_tags,name,' . $customerTag->id,
            ],
            'color' => [
                'sometimes',
                'required',
                'string',
                'regex:/^#[0-9A-Fa-f]{6}$/',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $customerTag->update($request->only(['name', 'color']));

        return response()->json([
            'tag' => $customerTag->fresh(),
            'message' => 'Customer tag updated successfully.',
        ]);
    }

    /**
     * Delete a customer tag
     * 
     * DELETE /api/customer-tags/{id}
     */
    public function destroy(CustomerTag $customerTag): JsonResponse
    {
        $this->authorize('delete', $customerTag);

        $customerTag->delete();

        return response()->json([
            'message' => 'Customer tag deleted successfully.',
        ]);
    }

    /**
     * Assign a tag to a customer
     * 
     * POST /api/customer-tags/{tagId}/assign
     */
    public function assign(Request $request, CustomerTag $customerTag): JsonResponse
    {
        $this->authorize('update', $customerTag);

        $validator = Validator::make($request->all(), [
            'customer_id' => [
                'required',
                'integer',
                'exists:customers,id',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $customer = \App\Models\Customer::findOrFail($request->customer_id);
        
        // Check if already assigned
        if ($customer->tags()->where('customer_tag_id', $customerTag->id)->exists()) {
            return response()->json([
                'message' => 'Tag is already assigned to this customer.',
            ], 422);
        }

        $customer->tags()->attach($customerTag->id);

        return response()->json([
            'message' => 'Tag assigned to customer successfully.',
        ]);
    }

    /**
     * Remove a tag from a customer
     * 
     * POST /api/customer-tags/{tagId}/remove
     */
    public function remove(Request $request, CustomerTag $customerTag): JsonResponse
    {
        $this->authorize('update', $customerTag);

        $validator = Validator::make($request->all(), [
            'customer_id' => [
                'required',
                'integer',
                'exists:customers,id',
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $customer = \App\Models\Customer::findOrFail($request->customer_id);
        $customer->tags()->detach($customerTag->id);

        return response()->json([
            'message' => 'Tag removed from customer successfully.',
        ]);
    }
}
```

---

## Customer Tags Endpoint

### Add to `CustomerController` (or create separate controller)

**Location:** `app/Http/Controllers/Api/CustomerController.php`

Add these methods to handle customer-specific tag operations:

```php
/**
 * Get all tags for a customer
 * 
 * GET /api/customers/{id}/tags
 */
public function tags(Customer $customer): JsonResponse
{
    $this->authorize('view', $customer);

    $tags = $customer->tags()->orderBy('name')->get();

    return response()->json([
        'data' => $tags,
    ]);
}

/**
 * Sync tags for a customer (replace all tags with provided ones)
 * 
 * POST /api/customers/{id}/tags/sync
 */
public function syncTags(Request $request, Customer $customer): JsonResponse
{
    $this->authorize('update', $customer);

    $validator = Validator::make($request->all(), [
        'tag_ids' => [
            'required',
            'array',
        ],
        'tag_ids.*' => [
            'integer',
            'exists:customer_tags,id',
        ],
    ]);

    if ($validator->fails()) {
        return response()->json([
            'message' => 'Validation failed',
            'errors' => $validator->errors(),
        ], 422);
    }

    $customer->tags()->sync($request->tag_ids);
    $tags = $customer->tags()->orderBy('name')->get();

    return response()->json([
        'message' => 'Customer tags synced successfully.',
        'data' => $tags,
    ]);
}
```

---

## Routes

### Add to `routes/api.php`

```php
// Customer Tags
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/customer-tags', [CustomerTagController::class, 'index'])
        ->middleware('permission:module.customer,read');
    
    Route::get('/customer-tags/{customerTag}', [CustomerTagController::class, 'show'])
        ->middleware('permission:module.customer,read');
    
    Route::post('/customer-tags', [CustomerTagController::class, 'store'])
        ->middleware('permission:module.customer,read-write');
    
    Route::patch('/customer-tags/{customerTag}', [CustomerTagController::class, 'update'])
        ->middleware('permission:module.customer,read-write');
    
    Route::delete('/customer-tags/{customerTag}', [CustomerTagController::class, 'destroy'])
        ->middleware('permission:module.customer,read-write');
    
    Route::post('/customer-tags/{customerTag}/assign', [CustomerTagController::class, 'assign'])
        ->middleware('permission:module.customer,read-write');
    
    Route::post('/customer-tags/{customerTag}/remove', [CustomerTagController::class, 'remove'])
        ->middleware('permission:module.customer,read-write');
    
    // Customer-specific tag operations
    Route::get('/customers/{customer}/tags', [CustomerController::class, 'tags'])
        ->middleware('permission:module.customer,read');
    
    Route::post('/customers/{customer}/tags/sync', [CustomerController::class, 'syncTags'])
        ->middleware('permission:module.customer,read-write');
});
```

---

## API Endpoints Summary

### 1. List Customer Tags

**Endpoint:** `GET /api/customer-tags`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | integer | No | Page number (default: 1) |
| `per_page` | integer | No | Items per page (default: 15, max: 100) |
| `search` | string | No | Search tags by name |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "VIP",
      "color": "#f97316",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Regular",
      "color": "#3b82f6",
      "created_at": "2025-01-15T11:00:00Z",
      "updated_at": "2025-01-15T11:00:00Z"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 2,
    "last_page": 1,
    "from": 1,
    "to": 2
  }
}
```

---

### 2. Get Customer Tag

**Endpoint:** `GET /api/customer-tags/{id}`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read`

**Response (200 OK):**
```json
{
  "tag": {
    "id": 1,
    "name": "VIP",
    "color": "#f97316",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T10:30:00Z"
  }
}
```

---

### 3. Create Customer Tag

**Endpoint:** `POST /api/customer-tags`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Request Body:**
```json
{
  "name": "Corporate",
  "color": "#10b981"
}
```

**Response (201 Created):**
```json
{
  "tag": {
    "id": 3,
    "name": "Corporate",
    "color": "#10b981",
    "created_at": "2025-01-15T12:00:00Z",
    "updated_at": "2025-01-15T12:00:00Z"
  },
  "message": "Customer tag created successfully."
}
```

**Error Response (422 Validation Error):**
```json
{
  "message": "Validation failed",
  "errors": {
    "name": [
      "The name has already been taken."
    ],
    "color": [
      "The color format is invalid."
    ]
  }
}
```

---

### 4. Update Customer Tag

**Endpoint:** `PATCH /api/customer-tags/{id}`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Request Body:**
```json
{
  "name": "VIP Customer",
  "color": "#f97316"
}
```

**Response (200 OK):**
```json
{
  "tag": {
    "id": 1,
    "name": "VIP Customer",
    "color": "#f97316",
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T12:30:00Z"
  },
  "message": "Customer tag updated successfully."
}
```

---

### 5. Delete Customer Tag

**Endpoint:** `DELETE /api/customer-tags/{id}`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Response (200 OK):**
```json
{
  "message": "Customer tag deleted successfully."
}
```

**Note:** Deleting a tag will automatically remove it from all customers (due to cascade delete on pivot table).

---

### 6. Assign Tag to Customer

**Endpoint:** `POST /api/customer-tags/{tagId}/assign`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Request Body:**
```json
{
  "customer_id": 123
}
```

**Response (200 OK):**
```json
{
  "message": "Tag assigned to customer successfully."
}
```

**Error Response (422):**
```json
{
  "message": "Tag is already assigned to this customer."
}
```

---

### 7. Remove Tag from Customer

**Endpoint:** `POST /api/customer-tags/{tagId}/remove`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Request Body:**
```json
{
  "customer_id": 123
}
```

**Response (200 OK):**
```json
{
  "message": "Tag removed from customer successfully."
}
```

---

### 8. Get Customer Tags

**Endpoint:** `GET /api/customers/{id}/tags`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "name": "VIP",
      "color": "#f97316",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### 9. Sync Customer Tags

**Endpoint:** `POST /api/customers/{id}/tags/sync`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Request Body:**
```json
{
  "tag_ids": [1, 2, 3]
}
```

**Response (200 OK):**
```json
{
  "message": "Customer tags synced successfully.",
  "data": [
    {
      "id": 1,
      "name": "VIP",
      "color": "#f97316",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "name": "Regular",
      "color": "#3b82f6",
      "created_at": "2025-01-15T11:00:00Z",
      "updated_at": "2025-01-15T11:00:00Z"
    },
    {
      "id": 3,
      "name": "Corporate",
      "color": "#10b981",
      "created_at": "2025-01-15T12:00:00Z",
      "updated_at": "2025-01-15T12:00:00Z"
    }
  ]
}
```

---

## Validation Rules

### Tag Creation/Update

- **name**: 
  - Required
  - String
  - Max 255 characters
  - Unique (case-sensitive)
  
- **color**: 
  - Required
  - String
  - Must match hex color format: `#RRGGBB` (e.g., `#3b82f6`, `#f97316`)

### Tag Assignment

- **customer_id**: 
  - Required
  - Integer
  - Must exist in `customers` table

### Tag Sync

- **tag_ids**: 
  - Required
  - Array of integers
  - Each ID must exist in `customer_tags` table

---

## Security Considerations

1. **Authorization**: Always check permissions via policies
2. **Validation**: Strictly validate all input data
3. **Unique Constraints**: Ensure tag names are unique to prevent duplicates
4. **Cascade Deletes**: When a tag is deleted, it's automatically removed from all customers
5. **Color Validation**: Ensure color values are valid hex codes

---

## Testing Checklist

- [ ] Create a new customer tag
- [ ] Update an existing customer tag
- [ ] Delete a customer tag
- [ ] List all customer tags with pagination
- [ ] Search customer tags by name
- [ ] Assign a tag to a customer
- [ ] Remove a tag from a customer
- [ ] Get all tags for a specific customer
- [ ] Sync tags for a customer (replace all tags)
- [ ] Verify duplicate tag names are rejected
- [ ] Verify invalid color formats are rejected
- [ ] Test authorization (users without permission cannot access)
- [ ] Test cascade delete (when tag is deleted, it's removed from all customers)
- [ ] Test that assigning an already-assigned tag returns an error

---

## Migration Order

1. Create migration for `customer_tags` table
2. Create migration for `customer_tag_assignments` pivot table
3. Run migrations: `php artisan migrate`
4. Create `CustomerTag` model
5. Update `Customer` model with tags relationship
6. Create `CustomerTagPolicy`
7. Register policy in `AuthServiceProvider`
8. Create `CustomerTagController`
9. Add tag methods to `CustomerController`
10. Add routes
11. Test all endpoints

---

## Notes

- This implementation follows the same pattern as the existing item tags system
- Tag names are case-sensitive and must be unique
- Color values must be valid hex color codes (6 digits after #)
- The sync endpoint allows bulk updating of customer tags
- When a tag is deleted, all assignments are automatically removed (cascade delete)
- Consider adding tag usage counts (how many customers have each tag) for analytics
- Consider adding tag descriptions for better documentation
- Consider adding tag categories/groups if needed in the future

