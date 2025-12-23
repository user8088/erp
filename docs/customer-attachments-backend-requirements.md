# Customer Attachments System - Backend Implementation Requirements

## Overview
Implement an attachment system for customers that allows uploading, viewing, downloading, and deleting documents associated with customer records. This should follow the same pattern as the existing user attachments system.

---

## Database Schema

### Migration: Create `customer_attachments` Table

```php
Schema::create('customer_attachments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
    $table->string('file_name');
    $table->string('storage_path'); // Path in storage (non-public)
    $table->string('mime_type');
    $table->unsignedBigInteger('size_bytes');
    $table->timestamps();
    
    $table->index('customer_id');
});
```

---

## Model

### Create `CustomerAttachment` Model

**Location:** `app/Models/CustomerAttachment.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CustomerAttachment extends Model
{
    protected $fillable = [
        'customer_id',
        'file_name',
        'storage_path',
        'mime_type',
        'size_bytes',
    ];

    protected $casts = [
        'customer_id' => 'integer',
        'size_bytes' => 'integer',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
```

---

## Policy

### Create `CustomerAttachmentPolicy`

**Location:** `app/Policies/CustomerAttachmentPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\CustomerAttachment;
use App\Models\User;

class CustomerAttachmentPolicy
{
    /**
     * Determine if the user can upload attachments for a customer.
     */
    public function uploadAttachments(User $user, Customer $customer): bool
    {
        // Add your authorization logic here
        // Example: Check if user has customer module write access
        return $user->hasPermission('module.customer,read-write');
    }

    /**
     * Determine if the user can view attachments for a customer.
     */
    public function viewAttachments(User $user, Customer $customer): bool
    {
        return $user->hasPermission('module.customer,read');
    }

    /**
     * Determine if the user can delete an attachment.
     */
    public function delete(User $user, CustomerAttachment $attachment): bool
    {
        return $user->hasPermission('module.customer,read-write') &&
               $this->uploadAttachments($user, $attachment->customer);
    }

    /**
     * Determine if the user can download an attachment.
     */
    public function download(User $user, CustomerAttachment $attachment): bool
    {
        // User must be able to view the customer to download attachments
        return $this->viewAttachments($user, $attachment->customer);
    }
}
```

**Register the policy in `app/Providers/AuthServiceProvider.php`:**

```php
protected $policies = [
    CustomerAttachment::class => CustomerAttachmentPolicy::class,
];
```

---

## Controller

### Create `CustomerAttachmentController`

**Location:** `app/Http/Controllers/Api/CustomerAttachmentController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\CustomerAttachment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class CustomerAttachmentController extends Controller
{
    /**
     * List all attachments for a customer
     * 
     * GET /api/customers/{id}/attachments
     */
    public function index(Customer $customer): JsonResponse
    {
        $this->authorize('viewAttachments', CustomerAttachment::class, $customer);

        $attachments = CustomerAttachment::where('customer_id', $customer->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $attachments->map(function ($attachment) {
                return [
                    'id' => $attachment->id,
                    'file_name' => $attachment->file_name,
                    'mime_type' => $attachment->mime_type,
                    'size_bytes' => $attachment->size_bytes,
                    'created_at' => $attachment->created_at->toIso8601String(),
                ];
            }),
        ]);
    }

    /**
     * Upload a new attachment for a customer
     * 
     * POST /api/customers/{id}/attachments
     */
    public function store(Request $request, Customer $customer): JsonResponse
    {
        $this->authorize('uploadAttachments', CustomerAttachment::class, $customer);

        $validator = Validator::make($request->all(), [
            'file' => [
                'required',
                'file',
                'max:10240', // 10MB max
                'mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png,gif,zip,rar', // Adjust as needed
            ],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $file = $request->file('file');
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getMimeType();
        $sizeBytes = $file->getSize();

        // Generate unique storage path
        $storagePath = $file->store('customer-attachments', 'private');
        // Or use: $file->storeAs('customer-attachments', $uniqueFileName, 'private');

        $attachment = CustomerAttachment::create([
            'customer_id' => $customer->id,
            'file_name' => $originalName,
            'storage_path' => $storagePath,
            'mime_type' => $mimeType,
            'size_bytes' => $sizeBytes,
        ]);

        return response()->json([
            'attachment' => [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'mime_type' => $attachment->mime_type,
                'size_bytes' => $attachment->size_bytes,
            ],
        ], 201);
    }

    /**
     * Delete an attachment
     * 
     * DELETE /api/customers/{id}/attachments/{attachmentId}
     */
    public function destroy(Customer $customer, CustomerAttachment $attachment): JsonResponse
    {
        // Ensure attachment belongs to the customer
        if ($attachment->customer_id !== $customer->id) {
            return response()->json([
                'message' => 'Attachment not found for this customer.',
            ], 404);
        }

        $this->authorize('delete', $attachment);

        // Delete file from storage
        if (Storage::disk('private')->exists($attachment->storage_path)) {
            Storage::disk('private')->delete($attachment->storage_path);
        }

        // Delete database record
        $attachment->delete();

        return response()->json([
            'message' => 'Attachment deleted.',
        ]);
    }
}
```

---

## Download Endpoint

### Add to `AttachmentController` (or create separate controller)

**Location:** `app/Http/Controllers/Api/AttachmentController.php` (or extend existing)

```php
/**
 * Download a customer attachment
 * 
 * GET /api/attachments/{attachmentId}/download
 * 
 * Note: This endpoint should handle both user and customer attachments
 */
public function downloadCustomerAttachment(CustomerAttachment $attachment): Response
{
    $this->authorize('download', $attachment);

    if (!Storage::disk('private')->exists($attachment->storage_path)) {
        abort(404, 'File not found');
    }

    $filePath = Storage::disk('private')->path($attachment->storage_path);
    
    return response()->download(
        $filePath,
        $attachment->file_name,
        [
            'Content-Type' => $attachment->mime_type,
        ]
    );
}
```

**Alternative:** If you want a unified download endpoint that works for both users and customers:

```php
/**
 * Download an attachment (works for both user and customer attachments)
 * 
 * GET /api/attachments/{attachmentId}/download
 */
public function download(Request $request, $attachmentId): Response
{
    // Try to find as customer attachment first
    $customerAttachment = CustomerAttachment::find($attachmentId);
    if ($customerAttachment) {
        $this->authorize('download', $customerAttachment);
        
        if (!Storage::disk('private')->exists($customerAttachment->storage_path)) {
            abort(404, 'File not found');
        }

        return response()->download(
            Storage::disk('private')->path($customerAttachment->storage_path),
            $customerAttachment->file_name,
            ['Content-Type' => $customerAttachment->mime_type]
        );
    }

    // Fallback to user attachment (existing logic)
    $userAttachment = UserAttachment::find($attachmentId);
    if ($userAttachment) {
        // ... existing user attachment download logic
    }

    abort(404, 'Attachment not found');
}
```

---

## Routes

### Add to `routes/api.php`

```php
// Customer Attachments
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/customers/{customer}/attachments', [CustomerAttachmentController::class, 'index'])
        ->middleware('permission:module.customer,read');
    
    Route::post('/customers/{customer}/attachments', [CustomerAttachmentController::class, 'store'])
        ->middleware('permission:module.customer,read-write');
    
    Route::delete('/customers/{customer}/attachments/{attachment}', [CustomerAttachmentController::class, 'destroy'])
        ->middleware('permission:module.customer,read-write');
    
    // Unified download endpoint (if using the alternative approach)
    Route::get('/attachments/{attachmentId}/download', [AttachmentController::class, 'download'])
        ->where('attachmentId', '[0-9]+');
});
```

---

## API Endpoints Summary

### 1. List Customer Attachments

**Endpoint:** `GET /api/customers/{id}/attachments`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read`

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": 10,
      "file_name": "contract.pdf",
      "mime_type": "application/pdf",
      "size_bytes": 123456,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "id": 11,
      "file_name": "id_card.jpg",
      "mime_type": "image/jpeg",
      "size_bytes": 45678,
      "created_at": "2025-01-15T11:00:00Z"
    }
  ]
}
```

---

### 2. Upload Customer Attachment

**Endpoint:** `POST /api/customers/{id}/attachments`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (required): The file to upload (max 10MB, adjust as needed)

**Response (201 Created):**
```json
{
  "attachment": {
    "id": 12,
    "file_name": "document.pdf",
    "mime_type": "application/pdf",
    "size_bytes": 98765
  }
}
```

**Error Response (422 Validation Error):**
```json
{
  "message": "Validation failed",
  "errors": {
    "file": [
      "The file must not be greater than 10240 kilobytes.",
      "The file must be a file of type: pdf, doc, docx."
    ]
  }
}
```

---

### 3. Delete Customer Attachment

**Endpoint:** `DELETE /api/customers/{id}/attachments/{attachmentId}`

**Authentication:** Required (Bearer token)

**Permissions:** `module.customer,read-write`

**Response (200 OK):**
```json
{
  "message": "Attachment deleted."
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "Attachment not found for this customer."
}
```

---

### 4. Download Customer Attachment

**Endpoint:** `GET /api/attachments/{attachmentId}/download`

**Authentication:** Required (Bearer token)

**Permissions:** User must have `module.customer,read` permission and be authorized via policy

**Response:** 
- Content-Type: Based on attachment's `mime_type`
- Content-Disposition: `attachment; filename="original_filename.ext"`
- Body: Binary file content

**Error Response (404 Not Found):**
- If attachment doesn't exist
- If file is missing from storage
- If user doesn't have permission

---

## File Storage Configuration

### Storage Disk Setup

Ensure you have a `private` disk configured in `config/filesystems.php`:

```php
'disks' => [
    // ... other disks
    
    'private' => [
        'driver' => 'local',
        'root' => storage_path('app/private'),
        'visibility' => 'private',
    ],
],
```

### Storage Path Structure

Files should be stored in: `storage/app/private/customer-attachments/`

Example path: `storage/app/private/customer-attachments/abc123def456.pdf`

---

## Validation Rules

### File Upload Validation

- **Required:** Yes
- **Type:** File
- **Max Size:** 10MB (10240 KB) - adjust as needed
- **Allowed MIME Types:** 
  - Documents: `pdf`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`, `txt`
  - Images: `jpg`, `jpeg`, `png`, `gif`
  - Archives: `zip`, `rar`
  - Adjust based on your requirements

### Custom Validation (Optional)

You may want to add:
- File name length validation
- Virus scanning (if available)
- File content validation (e.g., verify PDF is actually a PDF)

---

## Security Considerations

1. **File Storage:** Store files in private storage, not public
2. **Authorization:** Always check permissions via policies
3. **File Validation:** Validate file types and sizes strictly
4. **Path Traversal:** Ensure file names are sanitized
5. **Storage Limits:** Consider implementing per-customer storage quotas
6. **Virus Scanning:** Consider integrating virus scanning for uploaded files

---

## Testing Checklist

- [ ] Upload single file attachment
- [ ] Upload multiple file attachments (frontend handles multiple)
- [ ] List attachments for a customer
- [ ] Download attachment
- [ ] Delete attachment
- [ ] Verify file is deleted from storage when attachment is deleted
- [ ] Test authorization (users without permission cannot access)
- [ ] Test validation (invalid file types, oversized files)
- [ ] Test 404 handling (non-existent customer/attachment)
- [ ] Test cascade delete (if customer is deleted, attachments are deleted)

---

## Migration Order

1. Create migration for `customer_attachments` table
2. Run migration: `php artisan migrate`
3. Create `CustomerAttachment` model
4. Create `CustomerAttachmentPolicy`
5. Register policy in `AuthServiceProvider`
6. Create `CustomerAttachmentController`
7. Add routes
8. Update download endpoint to handle customer attachments
9. Test all endpoints

---

## Notes

- This implementation follows the same pattern as the existing user attachments system
- Files are stored in private storage for security
- The download endpoint can be unified to handle both user and customer attachments
- Consider adding soft deletes if you want to keep attachment history
- Consider adding file versioning if customers need to upload updated versions of documents
- Add logging for audit trails (who uploaded/deleted what and when)

