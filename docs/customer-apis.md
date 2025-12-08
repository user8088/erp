# Customer Management API Documentation

## Base URL
```
/api/customers
```

## Authentication
All endpoints require authentication using Laravel Sanctum (Bearer token).

Include the token in the Authorization header:
```
Authorization: Bearer {your-token}
```

## Permissions
- **Read Access**: `module.customer,read` - Required for GET endpoints
- **Read-Write Access**: `module.customer,read-write` - Required for POST, PATCH, DELETE endpoints

---

## Endpoints

### 1. List Customers (with Pagination & Filters)

**Endpoint:** `GET /api/customers`

**Description:** Retrieve a paginated list of customers with optional filtering and sorting.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | integer | No | 1 | Current page number |
| `per_page` | integer | No | 10 | Items per page (max: 100) |
| `search` | string | No | - | Search in serial_number, name, email, phone |
| `status` | enum | No | - | Filter by status: 'clear' or 'has_dues' |
| `rating_filter` | string | No | - | Filter by rating: '8+', '5-7', or 'below5' |
| `sort_by` | string | No | created_at | Sort field (e.g., name, email, created_at) |
| `sort_order` | string | No | desc | Sort order: 'asc' or 'desc' |

**Example Request:**
```javascript
// Using fetch
const response = await fetch('/api/customers?page=1&per_page=20&search=john&status=clear&rating_filter=8+&sort_by=name&sort_order=asc', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Example Response (200 OK):**
```json
{
  "data": [
    {
      "id": 1,
      "serial_number": "CUST-20241207-001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+92-300-1234567",
      "address": "123 Main St, Karachi",
      "rating": 8,
      "status": "clear",
      "picture_url": "https://example.com/storage/customer-profiles/customer_abc123.jpg",
      "created_at": "2024-12-07T10:30:00+00:00",
      "updated_at": "2024-12-07T10:30:00+00:00"
    },
    {
      "id": 2,
      "serial_number": "CUST-20241207-002",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+92-300-9876543",
      "address": "456 Oak Ave, Lahore",
      "rating": 9,
      "status": "has_dues",
      "picture_url": null,
      "created_at": "2024-12-07T11:15:00+00:00",
      "updated_at": "2024-12-07T11:15:00+00:00"
    }
  ],
  "meta": {
    "current_page": 1,
    "per_page": 20,
    "total": 50,
    "last_page": 3,
    "from": 1,
    "to": 20
  }
}
```

---

### 2. Get Single Customer

**Endpoint:** `GET /api/customers/{id}`

**Description:** Retrieve details of a specific customer by ID.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**
- `id` (integer, required): Customer ID

**Example Request:**
```javascript
const response = await fetch('/api/customers/1', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Example Response (200 OK):**
```json
{
  "customer": {
    "id": 1,
    "serial_number": "CUST-20241207-001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+92-300-1234567",
    "address": "123 Main St, Karachi",
    "rating": 8,
    "status": "clear",
    "picture_url": "https://example.com/storage/customer-profiles/customer_abc123.jpg",
    "created_at": "2024-12-07T10:30:00+00:00",
    "updated_at": "2024-12-07T10:30:00+00:00"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "No query results for model [App\\Models\\Customer] 1"
}
```

---

### 3. Create Customer

**Endpoint:** `POST /api/customers`

**Description:** Create a new customer. Serial number is auto-generated.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Default | Constraints |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Max: 255 characters |
| `email` | string | Yes | - | Valid email, unique, max: 255 |
| `phone` | string | No | null | Max: 50 characters |
| `address` | string | No | null | Text |
| `rating` | integer | No | 5 | Min: 1, Max: 10 |
| `status` | enum | No | clear | 'clear' or 'has_dues' |
| `picture_url` | string | No | null | Base64 image or URL |

**Example Request (without picture):**
```javascript
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    phone: "+92-300-1234567",
    address: "123 Main St, Karachi",
    rating: 8,
    status: "clear"
  })
});

const data = await response.json();
```

**Example Request (with base64 picture):**
```javascript
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    phone: "+92-300-1234567",
    address: "123 Main St, Karachi",
    rating: 8,
    status: "clear",
    picture_url: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
  })
});

const data = await response.json();
```

**Example Response (201 Created):**
```json
{
  "customer": {
    "id": 1,
    "serial_number": "CUST-20241207-001",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+92-300-1234567",
    "address": "123 Main St, Karachi",
    "rating": 8,
    "status": "clear",
    "picture_url": "https://example.com/storage/customer-profiles/customer_abc123.jpg",
    "created_at": "2024-12-07T10:30:00+00:00",
    "updated_at": "2024-12-07T10:30:00+00:00"
  },
  "message": "Customer created successfully."
}
```

**Error Response (422 Validation Error):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."],
    "rating": ["The rating must be between 1 and 10."]
  }
}
```

**Error Response (422 Image Error):**
```json
{
  "message": "Failed to create customer.",
  "error": "Image size must not exceed 5MB"
}
```

---

### 4. Update Customer

**Endpoint:** `PATCH /api/customers/{id}`

**Description:** Update an existing customer. All fields are optional (partial update).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**
- `id` (integer, required): Customer ID

**Request Body:** (all fields optional)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | No | Max: 255 characters |
| `email` | string | No | Valid email, unique (except current), max: 255 |
| `phone` | string | No | Max: 50 characters |
| `address` | string | No | Text |
| `rating` | integer | No | Min: 1, Max: 10 |
| `status` | enum | No | 'clear' or 'has_dues' |
| `picture_url` | string | No | Base64 image or URL |

**Example Request:**
```javascript
const response = await fetch('/api/customers/1', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "John Doe Updated",
    rating: 9,
    status: "has_dues"
  })
});

const data = await response.json();
```

**Example Response (200 OK):**
```json
{
  "customer": {
    "id": 1,
    "serial_number": "CUST-20241207-001",
    "name": "John Doe Updated",
    "email": "john@example.com",
    "phone": "+92-300-1234567",
    "address": "123 Main St, Karachi",
    "rating": 9,
    "status": "has_dues",
    "picture_url": "https://example.com/storage/customer-profiles/customer_abc123.jpg",
    "created_at": "2024-12-07T10:30:00+00:00",
    "updated_at": "2024-12-07T15:45:00+00:00"
  },
  "message": "Customer updated successfully."
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "No query results for model [App\\Models\\Customer] 999"
}
```

**Error Response (422 Validation Error):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

---

### 5. Delete Single Customer

**Endpoint:** `DELETE /api/customers/{id}`

**Description:** Delete a customer (soft delete). Associated profile picture is also deleted.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**
- `id` (integer, required): Customer ID

**Example Request:**
```javascript
const response = await fetch('/api/customers/1', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  }
});

const data = await response.json();
```

**Example Response (200 OK):**
```json
{
  "message": "Customer deleted successfully."
}
```

**Error Response (404 Not Found):**
```json
{
  "message": "No query results for model [App\\Models\\Customer] 999"
}
```

**Error Response (409 Conflict):**
```json
{
  "message": "Failed to delete customer.",
  "error": "Customer has related transactions"
}
```

---

### 6. Bulk Delete Customers

**Endpoint:** `POST /api/customers/bulk-delete`

**Description:** Delete multiple customers at once.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ids` | array | Yes | Array of customer IDs to delete (min: 1) |

**Example Request:**
```javascript
const response = await fetch('/api/customers/bulk-delete', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    ids: [1, 2, 3, 4, 5]
  })
});

const data = await response.json();
```

**Example Response (200 OK):**
```json
{
  "message": "5 customer(s) deleted successfully.",
  "deleted_count": 5,
  "failed_ids": []
}
```

**Partial Success Response:**
```json
{
  "message": "3 customer(s) deleted successfully.",
  "deleted_count": 3,
  "failed_ids": [4, 5]
}
```

**Error Response (422 Validation Error):**
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "ids": ["Please provide customer IDs to delete."],
    "ids.2": ["One or more customer IDs do not exist."]
  }
}
```

---

## Data Models

### Customer Object

```typescript
interface Customer {
  id: number;
  serial_number: string;      // Auto-generated, format: CUST-YYYYMMDD-XXX
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  rating: number;              // 1-10
  status: 'clear' | 'has_dues';
  picture_url: string | null;
  created_at: string;          // ISO 8601 format
  updated_at: string;          // ISO 8601 format
}
```

### Pagination Meta Object

```typescript
interface PaginationMeta {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  from: number;
  to: number;
}
```

---

## Image Upload Guide

### Supported Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)

### Size Limit
- Maximum: 5MB per image

### Upload Methods

#### 1. Base64 Upload (Recommended for small images)

Convert your image file to base64 and send it as a string:

```javascript
// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Usage
const file = document.querySelector('input[type="file"]').files[0];
const base64 = await fileToBase64(file);

// Send to API
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    picture_url: base64  // data:image/jpeg;base64,/9j/4AAQ...
  })
});
```

#### 2. Direct URL

If the image is already hosted, you can provide the URL directly:

```javascript
const response = await fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
    picture_url: "https://example.com/images/profile.jpg"
  })
});
```

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success (GET, PATCH, DELETE) |
| 201 | Created (POST) |
| 400 | Bad Request |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found (customer doesn't exist) |
| 409 | Conflict (e.g., cannot delete customer with transactions) |
| 422 | Unprocessable Entity (validation errors) |
| 500 | Server Error |

---

## Filter Examples

### Search by Name or Email
```javascript
GET /api/customers?search=john
```

### Filter by Status
```javascript
// Get only customers with dues
GET /api/customers?status=has_dues

// Get only customers with clear status
GET /api/customers?status=clear
```

### Filter by Rating
```javascript
// Get high-rated customers (8-10)
GET /api/customers?rating_filter=8+

// Get medium-rated customers (5-7)
GET /api/customers?rating_filter=5-7

// Get low-rated customers (1-4)
GET /api/customers?rating_filter=below5
```

### Sort Results
```javascript
// Sort by name ascending
GET /api/customers?sort_by=name&sort_order=asc

// Sort by creation date descending (newest first)
GET /api/customers?sort_by=created_at&sort_order=desc

// Sort by rating descending
GET /api/customers?sort_by=rating&sort_order=desc
```

### Combine Filters
```javascript
// Search for "john", status clear, rating 8+, sorted by name
GET /api/customers?search=john&status=clear&rating_filter=8+&sort_by=name&sort_order=asc
```

---

## React/TypeScript Example

```typescript
// types.ts
export interface Customer {
  id: number;
  serial_number: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  rating: number;
  status: 'clear' | 'has_dues';
  picture_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse {
  data: Customer[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    from: number;
    to: number;
  };
}

// api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customerAPI = {
  // List customers with filters
  getCustomers: async (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    status?: 'clear' | 'has_dues';
    rating_filter?: '8+' | '5-7' | 'below5';
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }) => {
    const response = await api.get<PaginatedResponse>('/customers', { params });
    return response.data;
  },

  // Get single customer
  getCustomer: async (id: number) => {
    const response = await api.get<{ customer: Customer }>(`/customers/${id}`);
    return response.data.customer;
  },

  // Create customer
  createCustomer: async (data: Partial<Customer>) => {
    const response = await api.post<{ customer: Customer; message: string }>('/customers', data);
    return response.data;
  },

  // Update customer
  updateCustomer: async (id: number, data: Partial<Customer>) => {
    const response = await api.patch<{ customer: Customer; message: string }>(`/customers/${id}`, data);
    return response.data;
  },

  // Delete customer
  deleteCustomer: async (id: number) => {
    const response = await api.delete<{ message: string }>(`/customers/${id}`);
    return response.data;
  },

  // Bulk delete customers
  bulkDeleteCustomers: async (ids: number[]) => {
    const response = await api.post<{
      message: string;
      deleted_count: number;
      failed_ids: number[];
    }>('/customers/bulk-delete', { ids });
    return response.data;
  },
};

// Usage in component
const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const data = await customerAPI.getCustomers({
          page: 1,
          per_page: 20,
          status: 'clear',
          sort_by: 'created_at',
          sort_order: 'desc',
        });
        setCustomers(data.data);
      } catch (error) {
        console.error('Failed to fetch customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  return (
    <div>
      {/* Render customers */}
    </div>
  );
};
```

---

## Notes

1. **Serial Number**: Automatically generated on customer creation. Format: `CUST-YYYYMMDD-XXX` (e.g., `CUST-20241207-001`). The sequence resets daily.

2. **Soft Delete**: Customers are soft-deleted (marked as deleted but not removed from database). Use `withTrashed()` in queries to include deleted records.

3. **Profile Pictures**: 
   - Stored in `storage/app/public/customer-profiles/`
   - Accessible via `/storage/customer-profiles/{filename}`
   - Old pictures are automatically deleted when updated
   - Pictures are deleted when customer is deleted

4. **Permissions**: Ensure users have the appropriate `module.customer` permissions:
   - `read`: View customers
   - `read-write`: Create, update, and delete customers

5. **Performance**: 
   - All database queries are indexed for optimal performance
   - Pagination is limited to 100 items per page
   - Use filters to narrow results for better performance

6. **Rate Limiting**: Consider implementing rate limiting on the frontend to prevent excessive API calls.

---

## Support

For issues or questions, contact the backend development team.

**API Version:** 1.0  
**Last Updated:** December 7, 2024
