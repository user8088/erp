# Frontend Structure - Detailed Documentation

## Next.js App Router Configuration

### Root Layout (`app/layout.tsx`)
- **Purpose**: Root HTML structure and global providers
- **Providers (outer to inner)**:
  1. `UserProvider` - Authentication context
  2. `ToastProvider` - Notification system
  3. `SidebarProvider` - Navigation state
  4. `AuthShell` - Route protection wrapper
- **Fonts**: Geist Sans & Geist Mono (via next/font/google)

### AuthShell (`app/AuthShell.tsx`)
- **Type**: Client Component
- **Responsibilities**:
  - Route protection (redirects unauthenticated users to /login)
  - Post-login redirect to home
  - Persist last visited route in localStorage
  - Layout rendering (Sidebar + Header + MainContent)
- **Behavior**:
  - Login page: Renders without ERP chrome
  - Protected routes: Full layout with auth check
  - Redirect loop prevention via `authLoading` state

## Page Structure

### Route Patterns

```
app/
├── page.tsx                      # Dashboard (Home)
├── login/page.tsx                # Login page (no auth required)
├── layout.tsx                    # Root layout
│
├── accounting/
│   ├── page.tsx                  # Accounting dashboard
│   ├── accounts/page.tsx         # Accounts list
│   ├── accounts/new/page.tsx     # New account form
│   ├── accounts/[id]/page.tsx    # Account detail
│   ├── payables/page.tsx         # Accounts payable
│   ├── receivables/page.tsx      # Accounts receivable
│   └── financial-reports/page.tsx
│
├── stock/
│   ├── page.tsx                  # Stock dashboard
│   ├── purchase-orders/
│   │   ├── page.tsx              # PO list
│   │   ├── new/page.tsx          # Create PO
│   │   └── [id]/page.tsx         # PO detail
│   └── settings/page.tsx         # Stock settings
│
├── selling/
│   ├── page.tsx                  # Selling dashboard
│   ├── sale-invoices/page.tsx    # Sale invoices
│   ├── sales-orders/page.tsx     # Sales orders
│   ├── point-of-sale/page.tsx    # POS interface
│   └── settings/page.tsx         # Selling settings
│
├── customer/
│   ├── page.tsx                  # Customers list
│   ├── [id]/page.tsx             # Customer detail
│   ├── new/page.tsx              # New customer
│   ├── invoices/page.tsx         # Customer invoices
│   └── tags/page.tsx             # Customer tags
│
├── suppliers/
│   ├── page.tsx                  # Suppliers list
│   ├── [id]/page.tsx             # Supplier detail
│   └── new/page.tsx              # New supplier
│
├── items/
│   ├── page.tsx                  # Items list
│   ├── [id]/page.tsx             # Item detail
│   ├── new/page.tsx              # New item
│   └── tags/page.tsx             # Item tags
│
├── staff/
│   ├── page.tsx                  # Staff dashboard
│   ├── members/
│   │   ├── page.tsx              # Staff list
│   │   ├── [id]/page.tsx         # Staff detail
│   │   └── new/page.tsx          # New staff
│   ├── attendance/page.tsx       # Attendance tracking
│   ├── invoices/page.tsx         # Staff invoices
│   ├── roles/page.tsx            # Role management
│   └── settings/page.tsx         # Staff settings
│
├── rental/
│   ├── items/
│   │   ├── page.tsx              # Rental items list
│   │   ├── [id]/page.tsx         # Item detail
│   │   └── new/page.tsx          # New item
│   ├── agreements/
│   │   ├── page.tsx              # Agreements list
│   │   └── new/page.tsx          # New agreement
│   ├── categories/page.tsx       # Rental categories
│   ├── payments/page.tsx       # Rental payments
│   ├── returns/page.tsx        # Returned items
│   └── settings/page.tsx       # Rental settings
│
├── transport/
│   ├── page.tsx                  # Vehicles list
│   ├── [id]/page.tsx             # Vehicle detail
│   └── new/page.tsx              # New vehicle
│
└── (various report pages)        # Financial reports, trends, etc.
```

## Component Architecture

### Component Organization

```
app/components/
├── Sidebar/                      # Navigation
│   ├── index.tsx                 # Main sidebar component
│   ├── NavItem.tsx               # Navigation item
│   ├── SidebarContext.tsx        # Collapse/expand state
│   └── types.ts                  # Type definitions
│
├── Header/                       # Top bar
│   ├── index.tsx                 # Header component
│   ├── SearchBar.tsx             # Global search
│   └── UserMenu.tsx              # User dropdown
│
├── User/                         # Auth-related
│   └── UserContext.tsx           # Auth context provider
│
├── ui/                           # Reusable UI primitives
│   └── ToastProvider.tsx         # Toast notification system
│
├── Dashboard/                    # Home page sections
│   ├── DashboardPeriodFilter.tsx
│   ├── FinancialSummary.tsx
│   ├── SellingSummary.tsx
│   ├── StockSummary.tsx
│   ├── CustomerSummary.tsx
│   ├── StaffSummary.tsx
│   ├── RentalSummary.tsx
│   ├── TransportSummary.tsx
│   ├── ShortcutsSection.tsx
│   └── ReportsSection.tsx
│
├── Accounting/                   # Accounting module
│   ├── AccountingReports.tsx
│   ├── AccountingShortcuts.tsx
│   ├── DeleteAccountModal.tsx
│   ├── FinancialCard.tsx
│   ├── FinancialSummary.tsx
│   ├── JournalEntryForm.tsx
│   └── ProfitLossChart.tsx
│
├── Stock/                        # Stock module
│   ├── InventoryTable.tsx
│   ├── LowStockAlertsTable.tsx
│   ├── OtherCostsSection.tsx
│   ├── PurchaseOrdersTable.tsx
│   ├── ReceiveItemRow.tsx
│   ├── ReceiveStockModal.tsx
│   ├── StockAccountMappingsBanner.tsx
│   ├── StockAdditionalReports.tsx
│   ├── StockAdjustmentModal.tsx
│   ├── StockKPIs.tsx
│   ├── StockMovementsTable.tsx
│   ├── StockQuickAccess.tsx
│   ├── StockReports.tsx
│   ├── StockTabs.tsx
│   ├── SupplierInvoiceUpload.tsx
│   └── WarehouseStockChart.tsx
│
├── Selling/                      # Selling module
│   ├── SalesOrderTrendsChart.tsx
│   ├── SellingAdditionalSections.tsx
│   ├── SellingChartsPanel.tsx
│   ├── SellingChartsPanelHome.tsx
│   ├── SellingQuickAccess.tsx
│   └── SellingReports.tsx
│
├── Customers/                    # Customer list
│   ├── CustomerActionBar.tsx
│   ├── CustomerFilterBar.tsx
│   ├── CustomersPagination.tsx
│   ├── CustomersTable.tsx
│   └── useCustomersList.ts
│
├── CustomerDetail/               # Customer detail view
│   ├── CustomerDeliveryProfit.tsx
│   ├── CustomerDetailContent.tsx
│   ├── CustomerDetailHeader.tsx
│   ├── CustomerDetailsForm.tsx
│   ├── CustomerDetailSidebar.tsx
│   ├── CustomerDetailTabs.tsx
│   ├── CustomerEarnings.tsx
│   ├── CustomerRentals.tsx
│   ├── CustomerStockProfit.tsx
│   └── RecordPaymentModal.tsx
│
├── Suppliers/                    # Supplier list
│   ├── SupplierActionBar.tsx
│   ├── SupplierFilterBar.tsx
│   ├── SupplierPaymentModal.tsx
│   ├── SuppliersPagination.tsx
│   ├── SuppliersTable.tsx
│   └── useSuppliersList.ts
│
├── SupplierDetail/               # Supplier detail view
│   ├── SupplierDetailContent.tsx
│   ├── SupplierDetailHeader.tsx
│   ├── SupplierDetailsForm.tsx
│   ├── SupplierDetailSidebar.tsx
│   └── SupplierDetailTabs.tsx
│
├── Items/                        # Items list
│   ├── ItemActionBar.tsx
│   ├── ItemFilterBar.tsx
│   ├── ItemsPagination.tsx
│   ├── ItemsTable.tsx
│   └── useItemsList.ts
│
├── ItemDetail/                   # Item detail view
│   ├── ItemDetailContent.tsx
│   ├── ItemDetailHeader.tsx
│   ├── ItemDetailsForm.tsx
│   ├── ItemDetailSidebar.tsx
│   ├── ItemDetailTabs.tsx
│   ├── SalesAnalyticsChart.tsx
│   └── StockAnalyticsChart.tsx
│
├── Staff/                        # Staff list
│   ├── StaffActionBar.tsx
│   ├── StaffFilterBar.tsx
│   ├── StaffReports.tsx
│   ├── StaffShortcuts.tsx
│   ├── StaffTable.tsx
│   └── useStaffList.ts
│
├── StaffDetail/                  # Staff detail view
│   ├── AttendanceDeductionModal.tsx
│   ├── StaffDetailContent.tsx
│   ├── StaffDetailHeader.tsx
│   ├── StaffDetailsForm.tsx
│   ├── StaffDetailSidebar.tsx
│   ├── StaffDetailTabs.tsx
│   ├── StaffMoreInformation.tsx
│   └── StaffSettingsTab.tsx
│
├── Users/                        # User management
│   ├── UsersActionBar.tsx
│   ├── UsersFilterBar.tsx
│   ├── UsersImageView.tsx
│   ├── UsersPagination.tsx
│   ├── UsersTable.tsx
│   └── useUsersList.ts
│
├── UserDetail/                   # User detail view
│   ├── MoreInformation.tsx
│   ├── UserActivity.tsx
│   ├── UserComments.tsx
│   ├── UserDetailContent.tsx
│   ├── UserDetailHeader.tsx
│   ├── UserDetailsForm.tsx
│   ├── UserDetailSidebar.tsx
│   ├── UserDetailTabs.tsx
│   ├── UserRolesPermissions.tsx
│   └── UserSettings.tsx
│
├── Rentals/                      # Rental module
│   ├── RentalAgreements/
│   │   ├── RecordPaymentModal.tsx
│   │   ├── RentalAgreementDetailModal.tsx
│   │   ├── RentalAgreementsTable.tsx
│   │   ├── ReturnRentalModal.tsx
│   │   ├── useRentalAgreementsList.ts
│   │   └── WriteOffBadDebtModal.tsx
│   ├── RentalCategories/
│   │   └── useRentalCategoriesList.ts
│   ├── RentalItems/
│   │   ├── RentalItemsActionBar.tsx
│   │   ├── RentalItemsFilterBar.tsx
│   │   ├── RentalItemsPagination.tsx
│   │   ├── RentalItemsTable.tsx
│   │   └── useRentalItemsList.ts
│   └── Shared/
│       ├── PaymentStatusBadge.tsx
│       ├── RentalAccountingStatusBanner.tsx
│       ├── StatusBadge.tsx
│       └── useRentalAccountMappings.ts
│
├── Vehicles/                     # Transport module
│   ├── VehicleActionBar.tsx
│   ├── VehicleFilterBar.tsx
│   ├── VehiclesPagination.tsx
│   ├── VehiclesTable.tsx
│   └── useVehiclesList.ts
│
├── VehicleDetail/                # Vehicle detail view
│   ├── VehicleDeliveryOrders.tsx
│   ├── VehicleDetailContent.tsx
│   ├── VehicleDetailHeader.tsx
│   ├── VehicleDetailsForm.tsx
│   ├── VehicleDetailSidebar.tsx
│   ├── VehicleDetailTabs.tsx
│   ├── VehicleMaintenance.tsx
│   ├── VehicleProfitability.tsx
│   └── VehicleSettings.tsx
│
├── Buying/                       # Buying module
│   ├── BuyingReports.tsx
│   ├── BuyingShortcuts.tsx
│   └── PurchaseOrderTrendsChart.tsx
│
├── Categories/                   # Category management
│   └── useCategoriesList.ts
│
├── Payables/                     # Accounts payable
│   ├── PayablesReports.tsx
│   └── PayablesShortcuts.tsx
│
├── Receivables/                  # Accounts receivable
│   ├── ReceivablesReports.tsx
│   ├── ReceivablesReportsList.tsx
│   └── ReceivablesShortcuts.tsx
│
├── FinancialReports/             # Financial reporting
│   ├── FinancialReportsSections.tsx
│   ├── OtherReports.tsx
│   ├── ReportFilters.tsx
│   └── TrendChart.tsx
│
└── Charts/                       # Chart utilities
    ├── ChartContainer.tsx
    └── TabSwitcher.tsx
```

## Component Patterns

### Detail Page Pattern
All entity detail pages follow a consistent structure:

```
[Entity]Detail/
├── [Entity]DetailContent.tsx      # Main layout and tabs
├── [Entity]DetailHeader.tsx       # Header with actions
├── [Entity]DetailsForm.tsx        # Edit form
├── [Entity]DetailSidebar.tsx      # Side info/actions
├── [Entity]DetailTabs.tsx         # Tab navigation
└── [SpecificComponents].tsx       # Feature-specific
```

### List Page Pattern
List pages use a consistent architecture:

```
[Entity]s/
├── [Entity]sTable.tsx             # Main table
├── [Entity]ActionBar.tsx           # Bulk actions
├── [Entity]FilterBar.tsx           # Search/filters
├── [Entity]sPagination.tsx        # Pagination controls
└── use[Entity]sList.ts             # Data fetching hook
```

### Client Component Pattern
Pages that need interactivity use the Client Component pattern:

```typescript
// page.tsx (Server Component)
import ClientComponent from "./ClientComponent";

export default function Page() {
  return <ClientComponent />;
}

// ClientComponent.tsx (Client Component)
"use client";

export default function ClientComponent() {
  // Interactive logic here
}
```

## Styling with Tailwind CSS

### Color Palette
- **Primary**: Black (`bg-black`, `text-black`)
- **Accent**: Orange (`focus:ring-orange-500`, hover states)
- **Semantic Colors**:
  - Success: Green (`bg-green-100`, `text-green-800`)
  - Warning: Orange/Red
  - Error: Red (`bg-red-50`, `text-red-600`)
  - Info: Blue

### Common Classes

#### Layout
```css
/* Container */
max-w-7xl mx-auto min-h-full py-4

/* Card */
bg-white border border-gray-200 rounded-lg p-6

/* Grid layouts */
grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
```

#### Forms
```css
/* Input */
px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent

/* Button Primary */
px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors

/* Button Secondary */
px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors
```

#### Tables
```css
/* Table Container */
border border-gray-200 rounded-lg overflow-x-auto bg-white

/* Header */
bg-gray-50 border-b border-gray-200
/* Header Cell */
px-4 py-3 text-left text-sm font-semibold text-gray-700

/* Row */
hover:bg-gray-50 transition-colors
/* Cell */
px-4 py-3 text-sm text-gray-900
```

#### Status Badges
```css
/* Enabled */
bg-green-100 text-green-800 rounded-full text-xs font-medium

/* Disabled */
bg-gray-100 text-gray-700 rounded-full text-xs font-medium
```

## Data Fetching Patterns

### Custom Hook Pattern
All list views use custom hooks with built-in caching:

```typescript
// useCustomersList.ts
export function useCustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GetCustomersParams>({});

  useEffect(() => {
    // Fetch data with cancellation support
    // Built-in caching
    // Error handling
  }, [page, perPage, filters]);

  return {
    customers, page, perPage, total, loading, error,
    setPage, setPerPage, filters, setFilters, refresh
  };
}
```

### API Call Pattern
```typescript
// In component
const { customers, loading, error, refresh } = useCustomersList();

// Trigger refresh
refresh();
```

## Navigation Configuration

### Navigation Data (`data/navigation.ts`)
Centralized navigation configuration with:
- Icon mappings (Lucide icons)
- Hierarchical structure
- Permission-based visibility
- Expansion state

### Permission Filtering
Sidebar filters navigation based on user permissions:
```typescript
const filteredNavigation = navigationData
  .map((item) => {
    if (item.id === "accounting" && !hasAtLeast("module.accounting", "read")) {
      return null;
    }
    // ... more checks
    return { ...item, children };
  })
  .filter(Boolean);
```

## Toast Notification System

### Usage
```typescript
import { useToast } from "../components/ui/ToastProvider";

const { addToast } = useToast();

// Success
addToast("Operation completed successfully", "success");

// Error
addToast("Failed to save data", "error");

// Info
addToast("Processing...", "info");
```

### Features
- Auto-dismiss after timeout
- Multiple toast stacking
- Success/error/info variants
- Slide-in animation
