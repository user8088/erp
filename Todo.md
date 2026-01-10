# Store Documents API - Backend Requirements

Please implement the following API endpoints to support the Store Settings document management feature.

## 1. Document Schema
Each document record should store:
- `id` (Primary Key)
- `name` (String, e.g., "Shop Lease Agreement")
- `type` (String, e.g., "Agreement", "Permit")
- `category` (String, e.g., "Legal", "Maintenance")
- `file_path` (String, path to the file in storage)
- `file_name` (String, original filename)
- `mime_type` (String)
- `file_size` (Integer, size in bytes)
- `upload_date` (Timestamp)
- `created_by` (Foreign Key to users)

## 2. API Endpoints

### `GET /api/store-documents`
- **Description**: Returns a list of all store documents.
- **Parameters**: 
    - `search` (Optional): Filter by name, type, or category.
    - `page`, `per_page` (Optional): Pagination.
- **Response**: Paginated list of document objects.

### `POST /api/store-documents`
- **Description**: Upload a new document.
- **Content-Type**: `multipart/form-data`
- **Payload**:
    - `file`: The file to upload (required).
    - `name`: Custom name for the document (required).
    - `type`: Document type (required).
    - `category`: Document category (required).
- **Behavior**: Store the file securely and create a record in the database.

### `DELETE /api/store-documents/{id}`
- **Description**: Delete a document and its associated file from storage.

### `GET /api/store-documents/{id}/download`
- **Description**: Securely download the document file.

---

# UI Implementation Progress
- [x] Store Settings Page created with Mock Data.
- [x] Date-based organization (Year/Month) implemented.
- [x] Integration with `apiClient.ts` started.
