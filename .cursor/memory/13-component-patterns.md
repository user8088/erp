# Component Patterns & Best Practices

## Component Architecture Patterns

### 1. List-Detail Pattern

All entities follow the same List-Detail pattern for consistency.

#### List Components Structure
```
[Entity]s/
├── [Entity]sTable.tsx          - Main data table
├── [Entity]ActionBar.tsx       - Bulk actions, exports
├── [Entity]FilterBar.tsx       - Search and filters
├── [Entity]sPagination.tsx    - Pagination controls
└── use[Entity]sList.ts         - Data fetching hook
```

#### Example: Customers List
```typescript
// useCustomersList.ts - Custom Hook Pattern
export function useCustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetCustomersParams>({});
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => {
    invalidateCustomersCache();
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    // Fetch with cancellation support
    let cancelled = false;
    const key = `${page}-${perPage}-${JSON.stringify(filters)}`;

    const load = async () => {
      // Serve from cache if available
      if (customersCache.has(key)) {
        const cached = customersCache.get(key)!;
        setCustomers(cached.customers);
        setTotal(cached.total);
        return;
      }

      setLoading(true);
      try {
        const data = await customersApi.getCustomers({
          page,
          per_page: perPage,
          ...filters,
        });
        if (!cancelled) {
          setCustomers(data.data);
          setTotal(data.meta.total);
          customersCache.set(key, { customers: data.data, total: data.meta.total });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [page, perPage, filters, refreshTrigger]);

  return {
    customers, page, perPage, total, loading, error,
    setPage, setPerPage, filters, setFilters, refresh
  };
}
```

#### Detail Components Structure
```
[Entity]Detail/
├── [Entity]DetailContent.tsx   - Main layout with tabs
├── [Entity]DetailHeader.tsx    - Header with actions
├── [Entity]DetailsForm.tsx     - Edit form
├── [Entity]DetailSidebar.tsx  - Side info/actions
├── [Entity]DetailTabs.tsx     - Tab navigation
└── [SpecificComponents].tsx     - Feature-specific
```

### 2. Modal Pattern

Standard modal implementation for actions.

```typescript
// RecordPaymentModal.tsx
interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: number;
  outstandingBalance?: number;
  onPaymentRecorded: () => void;
}

export default function RecordPaymentModal({
  isOpen,
  onClose,
  customerId,
  outstandingBalance,
  onPaymentRecorded
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await customersApi.recordPayment(customerId, {
        amount: Number(amount),
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
      });
      addToast("Payment recorded successfully", "success");
      onPaymentRecorded();
      onClose();
    } catch (e) {
      addToast("Failed to record payment", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>
        <form onSubmit={handleSubmit}>
          {/* Form fields */}
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading}>Record</button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 3. Tab Pattern

Tab navigation for detail views.

```typescript
// CustomerDetailTabs.tsx
interface CustomerDetailTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: "details", label: "Details" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "earnings", label: "Earnings" },
  { id: "rentals", label: "Rentals" },
];

export default function CustomerDetailTabs({
  activeTab,
  onTabChange
}: CustomerDetailTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

### 4. Form Pattern

Standard form with validation.

```typescript
// CustomerDetailsForm.tsx
interface CustomerDetailsFormProps {
  customer?: Customer;
  onSave: (data: CustomerFormData) => void;
  onCancel: () => void;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  rating: number;
}

export default function CustomerDetailsForm({
  customer,
  onSave,
  onCancel
}: CustomerDetailsFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: customer?.name ?? "",
    email: customer?.email ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    rating: customer?.rating ?? 5,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerFormData, string>>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (formData.email && !formData.email.includes("@")) {
      newErrors.email = "Invalid email format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CustomerFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={handleChange("name")}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.name ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      {/* Other fields... */}

      <div className="flex justify-end gap-2 pt-4">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </form>
  );
}
```

### 5. Table Pattern

Data table with sorting, pagination, and actions.

```typescript
// CustomersTable.tsx
interface CustomersTableProps {
  customers: Customer[];
  loading: boolean;
  onRowClick?: (customer: Customer) => void;
}

export default function CustomersTable({
  customers,
  loading,
  onRowClick
}: CustomersTableProps) {
  if (loading && customers.length === 0) {
    return <div className="p-4 text-gray-500">Loading...</div>;
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Serial #
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Name
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Rating
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr
              key={customer.id}
              onClick={() => onRowClick?.(customer)}
              className="hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-sm text-gray-900">
                {customer.serial_number}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900">
                {customer.name}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < customer.rating / 2
                          ? "text-yellow-400 fill-current"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  customer.status === "clear"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}>
                  {customer.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Action
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 && !loading && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                No customers found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

### 6. Filter Bar Pattern

Search and filter controls.

```typescript
// CustomerFilterBar.tsx
interface CustomerFilterBarProps {
  filters: GetCustomersParams;
  onChange: (filters: GetCustomersParams) => void;
}

export default function CustomerFilterBar({
  filters,
  onChange
}: CustomerFilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <input
        type="search"
        placeholder="Search customers..."
        value={filters.search || ""}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
      />

      <select
        value={filters.status || ""}
        onChange={(e) => onChange({
          ...filters,
          status: e.target.value as CustomerStatus || undefined
        })}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
      >
        <option value="">All Statuses</option>
        <option value="clear">Clear</option>
        <option value="has_dues">Has Dues</option>
      </select>

      <select
        value={filters.rating_filter || ""}
        onChange={(e) => onChange({
          ...filters,
          rating_filter: e.target.value || undefined
        })}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
      >
        <option value="">All Ratings</option>
        <option value="8+">8+ Stars</option>
        <option value="5-7">5-7 Stars</option>
        <option value="below5">Below 5</option>
      </select>

      <button
        onClick={() => onChange({})}
        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
      >
        Clear Filters
      </button>
    </div>
  );
}
```

## Styling Patterns

### Common Tailwind Classes

#### Layout
```css
/* Page Container */
max-w-7xl mx-auto min-h-full py-4 px-4 sm:px-6 lg:px-8

/* Card */
bg-white border border-gray-200 rounded-lg p-6 shadow-sm

/* Section */
mb-6 pb-6 border-b border-gray-200
```

#### Forms
```css
/* Input Base */
px-3 py-2 border border-gray-300 rounded-md text-sm
focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent

/* Input Error */
border-red-500 focus:ring-red-500

/* Select */
px-3 py-2 border border-gray-300 rounded-md text-sm bg-white
focus:outline-none focus:ring-2 focus:ring-orange-500

/* Button Primary */
px-4 py-2 bg-black text-white rounded-md text-sm font-medium
hover:bg-gray-800 transition-colors disabled:opacity-60

/* Button Secondary */
px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium
hover:bg-gray-50 transition-colors

/* Button Danger */
px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium
hover:bg-red-700 transition-colors
```

#### Tables
```css
/* Table Container */
border border-gray-200 rounded-lg overflow-x-auto bg-white

/* Table Header */
bg-gray-50 border-b border-gray-200

/* Header Cell */
px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap

/* Table Row */
hover:bg-gray-50 transition-colors cursor-pointer

/* Table Cell */
px-4 py-3 text-sm text-gray-900
```

#### Status Badges
```css
/* Success */
px-2.5 py-0.5 rounded-full text-xs font-medium
bg-green-100 text-green-800

/* Warning */
bg-yellow-100 text-yellow-800

/* Error */
bg-red-100 text-red-800

/* Info */
bg-blue-100 text-blue-800

/* Neutral */
bg-gray-100 text-gray-800
```

### Responsive Patterns

```typescript
// Mobile-first responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>

// Responsive table
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    {/* Table content */}
  </table>
</div>

// Responsive form
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="col-span-1">
    <label>Name</label>
    <input />
  </div>
  <div className="col-span-1">
    <label>Email</label>
    <input />
  </div>
</div>
```

## Toast Notification Pattern

```typescript
// Usage in components
const { addToast } = useToast();

// Success
addToast("Customer created successfully", "success");

// Error
addToast("Failed to save customer", "error");

// Info
addToast("Processing payment...", "info");
```

## Error Handling Patterns

### API Error Handling
```typescript
try {
  await api.operation();
} catch (e) {
  if (e instanceof ApiError) {
    switch (e.status) {
      case 422:
        // Validation errors
        setErrors(e.data?.errors);
        break;
      case 401:
        // Auth error - redirect to login
        addToast("Session expired. Please login again.", "error");
        router.push("/login");
        break;
      case 403:
        // Permission denied
        addToast("You don't have permission to perform this action", "error");
        break;
      default:
        addToast(e.message, "error");
    }
  } else {
    addToast("An unexpected error occurred", "error");
  }
}
```

### Form Error Display
```typescript
// Inline error display
<div>
  <input
    className={`border ${errors.name ? "border-red-500" : "border-gray-300"}`}
  />
  {errors.name && (
    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
  )}
</div>

// Form-level error
{formError && (
  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
    {formError}
  </div>
)}
```

## Loading States

### Skeleton Loading
```typescript
// Simple loading placeholder
{loading && (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
)}
```

### Loading Overlay
```typescript
<div className="relative">
  {children}
  {loading && (
    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  )}
</div>
```

## Best Practices

### 1. Props Interface
Always define props interface with JSDoc comments for complex props.

### 2. Default Props
Use default parameter values for optional props.

### 3. Event Handlers
Name event handlers with `handle` prefix.

### 4. State Updates
Use functional updates when new state depends on previous state.

### 5. Cleanup
Always cleanup side effects (subscriptions, timeouts, event listeners).

### 6. Accessibility
- Use semantic HTML elements
- Include proper labels for form inputs
- Support keyboard navigation
- Add aria attributes where needed

### 7. Performance
- Memoize expensive computations with `useMemo`
- Use `useCallback` for stable function references
- Implement virtualization for long lists
- Lazy load heavy components

### 8. Type Safety
- Use TypeScript strict mode
- Define all prop types
- Avoid `any` type
- Use discriminated unions for complex states
