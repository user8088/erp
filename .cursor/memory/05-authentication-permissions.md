# Authentication & Permissions System

## Overview

The ERP uses **Laravel Sanctum** for authentication with JWT Bearer tokens. The system includes:
- Token-based authentication
- Role-based access control (RBAC)
- Module-level and feature-level permissions
- Client-side permission checking

## Authentication Flow

### 1. Login Process (`app/login/page.tsx`)

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await login(email, password);
};
```

### 2. UserContext Login (`app/components/User/UserContext.tsx`)

```typescript
const login = useCallback(async (email: string, password: string) => {
  // 1. Fetch CSRF cookie for Laravel Sanctum
  await fetch('/sanctum/csrf-cookie', { credentials: 'include' });

  // 2. Send login request
  const result = await apiClient.post<{
    user: User;
    permissions?: PermissionsMap;
    access_token: string;
  }>("/auth/login", {
    login: email,
    password,
  });

  // 3. Save token FIRST (critical for subsequent requests)
  localStorage.setItem("access_token", result.access_token);

  // 4. Update state
  setUser(result.user);
  setPermissions(result.permissions ?? {});

  // 5. Refresh from /auth/me for complete user data
  const me = await apiClient.get("/auth/me", { authRequired: true });
  // Update with complete data...
}, []);
```

### 3. Token Storage

```typescript
// Stored in localStorage
localStorage.setItem("access_token", token);
localStorage.setItem("user", JSON.stringify(user));

// Retrieved for API calls
const token = localStorage.getItem("access_token");
headers.Authorization = `Bearer ${token}`;
```

### 4. Automatic Token Attachment (`app/lib/apiClient.ts`)

```typescript
async function request<T>(path: string, options: RequestOptions): Promise<T> {
  if (authRequired && typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers = {
        ...headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }
  // ... rest of request
}
```

### 5. Auth Initialization

```typescript
// On app load, check for existing session
useEffect(() => {
  const init = async () => {
    const hasToken = localStorage.getItem("access_token");
    if (!hasToken) {
      setAuthLoading(false);
      return;
    }

    try {
      const me = await apiClient.get("/auth/me", { authRequired: true });
      setUser(me.user);
      setPermissions(me.permissions ?? {});
    } catch (e) {
      // Clear state on auth error
      if (e.status === 401 || e.status === 419) {
        setUser(null);
        setPermissions({});
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  init();
}, []);
```

### 6. Logout Process

```typescript
const logout = useCallback(async () => {
  // 1. Call backend logout (invalidates token server-side)
  try {
    await apiClient.post("/auth/logout");
  } catch (error) {
    console.warn("Backend logout failed:", error);
  }

  // 2. Clear local state
  setUser(null);
  setPermissions({});

  // 3. Clear storage
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  localStorage.removeItem("lastPath");

  // 4. Redirect to login
  window.location.href = "/login";
}, []);
```

### 7. Route Protection (`app/AuthShell.tsx`)

```typescript
useEffect(() => {
  if (authLoading) return;

  if (pathname === "/login") {
    if (isAuthenticated) {
      router.replace("/");  // Redirect home if already logged in
    }
  } else if (!isAuthenticated) {
    router.replace("/login");  // Redirect to login if not authenticated
  }
}, [authLoading, isAuthenticated, pathname, router]);
```

## Permission System

### Permission Structure

```typescript
type AccessLevel = "no-access" | "read" | "read-write";

type PermissionsMap = Record<string, AccessLevel>;

// Example permissions from backend:
{
  "module.accounting": "read-write",
  "module.stock": "read",
  "module.selling": "no-access",
  "module.tag_manager": "read-write"
}
```

### Permission Hierarchy

```typescript
const rank: Record<AccessLevel, number> = {
  "no-access": 0,
  "read": 1,
  "read-write": 2,
};

export function hasAtLeast(
  permissions: PermissionsMap,
  code: string,
  required: AccessLevel
): boolean {
  const current = permissions[code] ?? "no-access";
  return rank[current] >= rank[required];
}
```

### Module Permissions

| Module | Permission Code | Description |
|--------|----------------|-------------|
| Accounting | `module.accounting` | Full accounting module access |
| Stock | `module.stock` | Inventory and stock management |
| Selling | `module.selling` | Sales and POS |
| Customers | `module.customer` | Customer management |
| Suppliers | `module.supplier` | Supplier management |
| Staff | `module.staff` | Staff and payroll |
| Rental | `module.rental` | Rental agreements |
| Transport | `module.transport` | Vehicle and delivery |
| Buying | `module.buying` | Purchase management |
| Tag Manager | `module.tag_manager` | Tags for all entities |

### Checking Permissions

#### In Components
```typescript
const { hasAtLeast } = useUser();

// Check for read access
const canRead = hasAtLeast("module.accounting", "read");

// Check for write access
const canWrite = hasAtLeast("module.stock", "read-write");

// Conditional rendering
{canWrite && (
  <button onClick={handleSave}>Save</button>
)}
```

#### In Sidebar (`app/components/Sidebar/index.tsx`)
```typescript
const filteredNavigation = navigationData
  .map((item) => {
    // Filter entire modules
    if (item.id === "accounting" && !hasAtLeast("module.accounting", "read")) {
      return null;
    }
    if (item.id === "staff" && !hasAtLeast("module.staff", "read")) {
      return null;
    }

    // Filter child items
    const children = item.children?.filter((child) => {
      if (child.id === "tag-manager") {
        return hasAtLeast("module.tag_manager", "read");
      }
      return true;
    });

    return { ...item, children };
  })
  .filter(Boolean);
```

### Permission-Based UI Patterns

#### 1. Hide Actions
```typescript
const { hasAtLeast } = useUser();
const canWriteCustomers = hasAtLeast("module.customer", "read-write");

// Hide edit button if no write access
{canWriteCustomers && (
  <button onClick={handleEdit}>Edit</button>
)}
```

#### 2. Disable Actions
```typescript
<button
  disabled={!canWriteCustomers}
  onClick={handleSave}
>
  Save
</button>
```

#### 3. Show Read-Only View
```typescript
{canWriteCustomers ? (
  <CustomerEditForm customer={customer} />
) : (
  <CustomerViewOnly customer={customer} />
)}
```

#### 4. Block Routes
```typescript
// In page component
export default function AccountingPage() {
  const { hasAtLeast } = useUser();
  const canRead = hasAtLeast("module.accounting", "read");

  if (!canRead) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1>Accounting Access Required</h1>
        <p>You don't have permission to view this module.</p>
      </div>
    );
  }

  return <AccountingContent />;
}
```

## User Roles

### Role Structure
```typescript
interface Role {
  id: string | number;
  name: string;
  description?: string;
  is_system?: boolean;  // Built-in roles cannot be deleted
  permissions?: PermissionSummary[];
}

interface PermissionSummary {
  id: string | number;
  code: string;
  label: string;
  access_level: AccessLevel;
}
```

### System Roles
- **Administrator**: Full access to all modules (`read-write` on everything)
- **Manager**: Read-write on most modules, limited admin access
- **Staff**: Read access to relevant modules based on department
- **Read Only**: View-only access for reporting

### User-Role Relationship
```typescript
interface User {
  id: string | number;
  email: string;
  full_name: string;
  roles?: RoleSummary[];
  // ... other fields
}
```

## Staff-User Linking

Staff members can be linked to ERP user accounts:

```typescript
interface StaffMember {
  id: number;
  full_name: string;
  is_erp_user?: boolean;
  erp_user_id?: number | null;
  user?: {
    id: number;
    email?: string;
    full_name?: string;
  };
}
```

### Linking Process
```typescript
// Link existing user to staff
await staffApi.linkUser(staffId, userId);

// Create new user for staff
await staffApi.createUser(staffId, {
  email: "staff@example.com",
  password: "...",
  full_name: "Staff Name",
  role_ids: [1, 2],
});

// Unlink user from staff
await staffApi.unlinkUser(staffId);
```

## Auth State Management

### UserContext API
```typescript
interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  authLoading: boolean;
  permissions: PermissionsMap;
  hasAtLeast: (code: string, required: AccessLevel) => boolean;
}
```

### Usage
```typescript
import { useUser } from "../components/User/UserContext";

function MyComponent() {
  const { user, isAuthenticated, authLoading, hasAtLeast, logout } = useUser();

  if (authLoading) return <Loading />;
  if (!isAuthenticated) return null;

  const canEdit = hasAtLeast("module.stock", "read-write");

  return (
    <div>
      <p>Welcome, {user.full_name}</p>
      {canEdit && <EditButton />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

## Security Considerations

### Token Security
- Tokens stored in localStorage (not httpOnly cookies)
- Token sent with every authenticated request
- Backend validates token expiration
- Logout invalidates token on server

### Permission Caching
- Permissions cached in UserContext after login
- Refreshed on full page reload
- Not updated dynamically (requires re-login for changes)

### CSRF Protection
- CSRF token fetched before login
- Credentials included in all requests
- Sanctum handles CSRF validation

### Error Handling
```typescript
try {
  await api.operation();
} catch (e) {
  if (e instanceof ApiError && e.status === 401) {
    // Token expired or invalid
    logout();
  } else if (e instanceof ApiError && e.status === 403) {
    // Permission denied
    addToast("You don't have permission to perform this action", "error");
  }
}
```

## Backend Auth Endpoints

### POST /auth/login
Authenticate user and return token.

**Request:**
```json
{
  "login": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "user": { /* User object */ },
  "permissions": {
    "module.accounting": "read-write",
    "module.stock": "read"
  },
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9..."
}
```

### GET /auth/me
Get current authenticated user.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "user": { /* User object */ },
  "permissions": { /* Permissions map */ }
}
```

### POST /auth/logout
Invalidate current token.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

### GET /sanctum/csrf-cookie
Get CSRF token for session.

**Response:** Sets `XSRF-TOKEN` cookie

## Related Documentation
- [Type System](./04-type-system.md) - User, Role, Permission types
- [API Client](./03-api-client.md) - How auth is handled in API calls
- [Frontend Structure](./02-frontend-structure.md) - AuthShell component
