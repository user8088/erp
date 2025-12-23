# Supplier Attachments System - Backend Implementation Requirements

## Overview
Implement an attachment system for suppliers that allows uploading, viewing, downloading, and deleting documents associated with supplier records. This should follow the same pattern as the existing **customer attachments** and **user attachments** systems.

---

## Database Schema

### Migration: Create `supplier_attachments` Table

```php
Schema::create('supplier_attachments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
    $table->string('file_name');
    $table->string('storage_path'); // Path in storage (non-public)
    $table->string('mime_type');
    $table->unsignedBigInteger('size_bytes');
    $table->timestamps();
    
    $table->index('supplier_id');
});
```

---

## Model

### Create `SupplierAttachment` Model

**Location:** `app/Models/SupplierAttachment.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierAttachment extends Model
{
    protected $fillable = [
        'supplier_id',
        'file_name',
        'storage_path',
        'mime_type',
        'size_bytes',
    ];

    protected $casts = [
        'supplier_id' => 'integer',
        'size_bytes' => 'integer',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
```

---

## Policy

### Create `SupplierAttachmentPolicy`

**Location:** `app/Policies/SupplierAttachmentPolicy.php`

```php
<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\SupplierAttachment;
use App\Models\User;

class SupplierAttachmentPolicy
{
    /**
     * Determine if the user can upload attachments for a supplier.
     */
    public function uploadAttachments(User $user, Supplier $supplier): bool
    {
        // Example: Check if user has supplier module write access
        return $user->hasPermission('module.supplier,read-write');
    }

    /**
     * Determine if the user can view attachments for a supplier.
     */
    public function viewAttachments(User $user, Supplier $supplier): bool
    {
        return $user->hasPermission('module.supplier,read');
    }

    /**
     * Determine if the user can delete an attachment.
     */
    public function delete(User $user, SupplierAttachment $attachment): bool
    {
        return $user->hasPermission('module.supplier,read-write') &&
               $this->uploadAttachments($user, $attachment->supplier);
    }

    /**
     * Determine if the user can download an attachment.
     */
    public function download(User $user, SupplierAttachment $attachment): bool
    {
        // User must be able to view the supplier to download attachments
        return $this->viewAttachments($user, $attachment->supplier);
    }
}
```

**Register the policy in `app/Providers/AuthServiceProvider.php`:**

```php
protected $policies = [
    SupplierAttachment::class => SupplierAttachmentPolicy::class,
];
```

---

## Controller

### Create `SupplierAttachmentController`

**Location:** `app/Http/Controllers/Api/SupplierAttachmentController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Models\SupplierAttachment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class SupplierAttachmentController extends Controller
{
    /**
     * List all attachments for a supplier
     *
     * GET /api/suppliers/{id}/attachments
     */
    public function index(Supplier $supplier): JsonResponse
    {
        $this->authorize('viewAttachments', SupplierAttachment::class, $supplier);

        $attachments = SupplierAttachment::where('supplier_id', $supplier->id)
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
     * Upload a new attachment for a supplier
     *
     * POST /api/suppliers/{id}/attachments
     */
    public function store(Request $request, Supplier $supplier): JsonResponse
    {
        $this->authorize('uploadAttachments', SupplierAttachment::class, $supplier);

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
        $storagePath = $file->store('supplier-attachments', 'private');

        $attachment = SupplierAttachment::create([
            'supplier_id' => $supplier->id,
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
     * DELETE /api/suppliers/{id}/attachments/{attachmentId}
     */
    public function destroy(Supplier $supplier, SupplierAttachment $attachment): JsonResponse
    {
        // Ensure attachment belongs to the supplier
        if ($attachment->supplier_id !== $supplier->id) {
            return response()->json([
                'message' => 'Attachment not found for this supplier.',
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

Use the **same unified download endpoint** as for user/customer attachments, so the frontend can call:

- `GET /api/attachments/{attachmentId}/download`

Extend your existing `AttachmentController@download` (or equivalent) to also handle `SupplierAttachment`:

```php
public function download(Request $request, $attachmentId): Response
{
    // Try supplier attachment first
    $supplierAttachment = \App\Models\SupplierAttachment::find($attachmentId);
    if ($supplierAttachment) {
        $this->authorize('download', $supplierAttachment);

        if (!Storage::disk('private')->exists($supplierAttachment->storage_path)) {
            abort(404, 'File not found');
        }

        return response()->download(
            Storage::disk('private')->path($supplierAttachment->storage_path),
            $supplierAttachment->file_name,
            ['Content-Type' => $supplierAttachment->mime_type]
        );
    }

    // Existing logic: try customer/user attachments...
    // $customerAttachment = CustomerAttachment::find($attachmentId);
    // $userAttachment = UserAttachment::find($attachmentId);
    // ...

    abort(404, 'Attachment not found');
}
```

---

## Routes

### Add to `routes/api.php`

```php
// Supplier Attachments
Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/suppliers/{supplier}/attachments', [SupplierAttachmentController::class, 'index'])
        ->middleware('permission:module.supplier,read');
    
    Route::post('/suppliers/{supplier}/attachments', [SupplierAttachmentController::class, 'store'])
        ->middleware('permission:module.supplier,read-write');
    
    Route::delete('/suppliers/{supplier}/attachments/{attachment}', [SupplierAttachmentController::class, 'destroy'])
        ->middleware('permission:module.supplier,read-write');
    
    // Unified download endpoint already exists:
    // Route::get('/attachments/{attachmentId}/download', [AttachmentController::class, 'download'])
    //     ->where('attachmentId', '[0-9]+');
});
```

---

## API Endpoints Summary

### 1. List Supplier Attachments

**Endpoint:** `GET /api/suppliers/{id}/attachments`

**Authentication:** Required (Bearer token)

**Permissions:** `module.supplier,read`

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
    }
  ]
}
```

---

### 2. Upload Supplier Attachment

**Endpoint:** `POST /api/suppliers/{id}/attachments`

**Authentication:** Required (Bearer token)

**Permissions:** `module.supplier,read-write`

**Content-Type:** `multipart/form-data`

**Request Body:**
- `file` (required): The file to upload (max 10MB, adjust as needed)

**Response (201 Created):**

```json
{
  "attachment": {
    "id": 11,
    "file_name": "invoice.pdf",
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
      "The file must be a file of type: pdf, doc, docx, xls, xlsx, ppt, pptx, txt, jpg, jpeg, png, gif, zip, rar."
    ]
  }
}
```

---

### 3. Delete Supplier Attachment

**Endpoint:** `DELETE /api/suppliers/{id}/attachments/{attachmentId}`

**Authentication:** Required (Bearer token)

**Permissions:** `module.supplier,read-write`

**Response (200 OK):**

```json
{
  "message": "Attachment deleted."
}
```

**Error Response (404 Not Found):**

```json
{
  "message": "Attachment not found for this supplier."
}
```

---

### 4. Download Supplier Attachment

**Endpoint:** `GET /api/attachments/{attachmentId}/download`

**Authentication:** Required (Bearer token)

**Permissions:** User must be authorized via `SupplierAttachmentPolicy@download`

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

Ensure you have a `private` disk configured in `config/filesystems.php` (same as for customer/user attachments):

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

Files should be stored in: `storage/app/private/supplier-attachments/`

Example path: `storage/app/private/supplier-attachments/abc123def456.pdf`

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

---

## Security Considerations

1. **File Storage:** Store files in private storage, not public  
2. **Authorization:** Always check permissions via policies  
3. **File Validation:** Validate file types and sizes strictly  
4. **Path Traversal:** Ensure file names are sanitized  
5. **Storage Limits:** Consider implementing per-supplier storage quotas  
6. **Virus Scanning:** Consider integrating virus scanning for uploaded files  

---

## Testing Checklist

- [ ] Upload single file attachment for a supplier  
- [ ] Upload multiple file attachments (frontend handles multiple)  
- [ ] List attachments for a supplier  
- [ ] Download attachment  
- [ ] Delete attachment  
- [ ] Verify file is deleted from storage when attachment is deleted  
- [ ] Test authorization (users without permission cannot access)  
- [ ] Test validation (invalid file types, oversized files)  
- [ ] Test 404 handling (non-existent supplier/attachment)  
- [ ] Test cascade delete (if supplier is deleted, attachments are deleted)  

---

## Migration Order

1. Create migration for `supplier_attachments` table  
2. Run migration: `php artisan migrate`  
3. Create `SupplierAttachment` model  
4. Create `SupplierAttachmentPolicy`  
5. Register policy in `AuthServiceProvider`  
6. Create `SupplierAttachmentController`  
7. Extend unified `AttachmentController@download` to handle supplier attachments  
8. Add routes  
9. Test all endpoints  

---

## Notes

- This implementation mirrors the existing **customer attachments** system for consistency.  
- Files are stored in private storage for security.  
- The unified download endpoint keeps the frontend simple: it only needs an `attachmentId`.  
- Consider adding audit logging (who uploaded/deleted which attachment and when).  
- Consider adding attachment categories/types (e.g., contracts, CNIC, NTN, bank details) in the future if needed.


