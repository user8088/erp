# ERP System - Complete Documentation

This directory contains comprehensive A-to-Z documentation of the entire ERP application for future agentic performance.

## Documentation Index

### 1. Architecture & Structure
| File | Description |
|------|-------------|
| [01-architecture-overview.md](./01-architecture-overview.md) | High-level architecture, tech stack, module overview |
| [02-frontend-structure.md](./02-frontend-structure.md) | Next.js app router, component organization, styling patterns |
| [03-api-client.md](./03-api-client.md) | Complete API client architecture and all domain APIs |
| [04-type-system.md](./04-type-system.md) | All TypeScript types, interfaces, and data models |
| [05-authentication-permissions.md](./05-authentication-permissions.md) | Auth flow, Laravel Sanctum, RBAC permissions |

### 2. Module Documentation
| File | Module | Description |
|------|--------|-------------|
| [06-modules-accounting.md](./06-modules-accounting.md) | Accounting | Chart of Accounts, Journal Entries, Financial Reports |
| [07-modules-stock.md](./07-modules-stock.md) | Stock | Items, Purchase Orders, Stock Movements, Batches |
| [08-modules-selling.md](./08-modules-selling.md) | Selling | Sale Invoices, Sales Orders, POS, Payments |
| [09-modules-customers.md](./09-modules-customers.md) | Customers | Customer management, tags, payments, analytics |
| [10-modules-suppliers.md](./10-modules-suppliers.md) | Suppliers | Supplier management, POs, payments |
| [11-modules-staff.md](./11-modules-staff.md) | Staff | Employees, attendance, payroll, advances |
| [12-modules-rental.md](./12-modules-rental.md) | Rental | Rental items, agreements, payments, returns |

### 3. Patterns & Relationships
| File | Description |
|------|-------------|
| [13-component-patterns.md](./13-component-patterns.md) | Reusable UI patterns, component best practices |
| [14-module-relationships.md](./14-module-relationships.md) | Cross-module dependencies and data flow |
| [15-api-endpoint-mapping.md](./15-api-endpoint-mapping.md) | Complete API endpoint reference |

## Quick Reference

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript 5
- **Auth**: Laravel Sanctum (JWT)
- **Icons**: Lucide React
- **Charts**: Recharts

### Project Structure
```
app/
├── components/           # Domain-organized React components
│   ├── Accounting/
│   ├── Stock/
│   ├── Selling/
│   ├── Customers/
│   ├── Suppliers/
│   ├── Staff/
│   ├── Rentals/
│   ├── User/
│   ├── Sidebar/
│   └── ui/
├── lib/
│   ├── apiClient.ts     # API client & domain APIs
│   ├── types.ts         # All TypeScript types
│   ├── permissions.ts   # Permission utilities
│   ├── apiCache.ts      # Response caching
│   └── format.ts        # Formatting utilities
├── (routes)/            # Page routes
├── layout.tsx           # Root layout
├── page.tsx             # Dashboard
└── AuthShell.tsx        # Route protection

data/
└── navigation.ts        # Sidebar navigation config
```

### Core Modules
1. **Accounting** - Financial management (COA, GL, Reports)
2. **Stock** - Inventory & purchase orders
3. **Selling** - Sales, POS, customer payments
4. **Customers** - CRM, tags, analytics
5. **Suppliers** - Vendor management
6. **Staff** - HR, payroll, attendance
7. **Rental** - Equipment rental management
8. **Transport** - Vehicle & delivery tracking

### Key Patterns
- **List-Detail**: All entities use consistent List → Detail flow
- **Custom Hooks**: `use[Entity]sList` for data fetching with caching
- **Modals**: Standard modal pattern for actions
- **Permissions**: `hasAtLeast(code, level)` for RBAC
- **API Client**: Domain-specific APIs with automatic auth

### Authentication
```typescript
// Check permissions
const { hasAtLeast } = useUser();
const canWrite = hasAtLeast("module.stock", "read-write");

// API calls (auto-authenticated)
const data = await customersApi.getCustomers({ page: 1 });
```

### Common API Patterns
```typescript
// Paginated list
const { data, meta } = await api.getItems({ page: 1, per_page: 20 });

// Create
const item = await api.createItem({ name: "Product" });

// Update
await api.updateItem(id, { name: "Updated" });

// Delete
await api.deleteItem(id);
```

## Usage Guidelines for AI Agents

### When Working on This Codebase

1. **Start Here**: Read this README and 01-architecture-overview.md
2. **Find Types**: Check 04-type-system.md for all data models
3. **Find APIs**: Check 03-api-client.md and 15-api-endpoint-mapping.md
4. **Module Context**: Read the specific module documentation
5. **Patterns**: Follow patterns in 13-component-patterns.md

### Common Tasks

**Adding a New Component:**
1. Check existing components in the same domain folder
2. Follow the List-Detail pattern for entities
3. Use custom hooks for data fetching
4. Apply Tailwind classes from the style guide
5. Add permission checks with `hasAtLeast`

**Adding a New API:**
1. Add types to `app/lib/types.ts`
2. Add endpoint to domain API in `app/lib/apiClient.ts`
3. Update 15-api-endpoint-mapping.md
4. Follow caching pattern with `cachedGet`

**Working with Forms:**
1. Use controlled components with `useState`
2. Implement validation before submit
3. Display inline errors
4. Show loading state during submission
5. Use `addToast` for success/error feedback

**Working with Tables:**
1. Use the standard table structure
2. Implement pagination with `use[Entity]sList`
3. Add row click handlers for navigation
4. Include action buttons with permission checks
5. Support empty states

### File Locations Quick Reference

| Need | Location |
|------|----------|
| Types | `app/lib/types.ts` |
| API Client | `app/lib/apiClient.ts` |
| API Cache | `app/lib/apiCache.ts` |
| Permissions | `app/lib/permissions.ts` |
| Format Utils | `app/lib/format.ts` |
| Navigation | `data/navigation.ts` |
| Auth Context | `app/components/User/UserContext.tsx` |
| Sidebar | `app/components/Sidebar/index.tsx` |
| Toast | `app/components/ui/ToastProvider.tsx` |

## Repomix Output

The codebase has been compressed using repomix and saved as `repomix-output.xml` in the project root. This contains the full source code in XML format for comprehensive AI context.

---

**Last Updated**: April 10, 2026  
**Total Files Documented**: 15  
**Coverage**: Complete A-to-Z application documentation
