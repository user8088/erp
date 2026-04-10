# ERP System - Architecture Overview

## Project Name
**Mughal ERP UI** - A comprehensive Enterprise Resource Planning system frontend

## Tech Stack

### Core Technologies
- **Framework**: Next.js 16.0.10 (App Router)
- **UI Library**: React 19.2.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Build Tool**: Next.js built-in (Turbopack for dev)

### Additional Dependencies
- **Icons**: lucide-react (0.555.0)
- **Charts**: recharts (3.5.1)
- **Authentication**: Laravel Sanctum (backend)
- **HTTP Client**: Native fetch with custom wrapper

## Project Structure

```
ERP-ROOT/
├── app/                          # Next.js App Router
│   ├── components/               # React components organized by domain
│   ├── lib/                      # Utilities, API client, types
│   ├── (routes)/                 # Page routes (see below)
│   ├── login/                    # Authentication page
│   ├── page.tsx                  # Dashboard (Home)
│   ├── layout.tsx                # Root layout
│   ├── AuthShell.tsx             # Auth wrapper component
│   └── globals.css               # Global styles
├── data/                         # Static data (navigation config)
├── package.json                  # Dependencies
└── repomix-output.xml           # Codebase snapshot for AI context
```

## Module Architecture

The ERP is organized into 10 primary business modules:

### 1. **Accounting** (`/accounting/*`)
- Chart of Accounts management
- Journal Entries
- Accounts Payable/Receivable
- Financial Reports (P&L, Balance Sheet, Trial Balance)
- General Ledger

### 2. **Stock** (`/stock/*`)
- Inventory management
- Purchase Orders
- Stock movements and adjustments
- Low stock alerts
- Stock account mappings

### 3. **Selling** (`/selling/*`)
- Sale Invoices
- Sales Orders
- Point of Sale (POS)
- Sales analytics and trends

### 4. **Customers** (`/customer/*`)
- Customer management
- Customer invoices
- Customer tags
- Ledger summaries

### 5. **Suppliers** (`/suppliers/*`)
- Supplier management
- Supplier invoices
- Purchase history
- Supplier payments

### 6. **Staff** (`/staff/*`)
- Staff members management
- Attendance tracking
- Salary processing
- Advances and payroll
- Staff roles and users

### 7. **Rental** (`/rental/*`)
- Rental items management
- Rental agreements
- Rental categories
- Payment tracking
- Returns processing

### 8. **Transport** (`/transport/*`)
- Vehicle management
- Delivery orders
- Vehicle maintenance
- Profitability tracking

### 9. **Items** (`/items/*`, `/categories/*`)
- Product catalog
- Categories management
- Item tags
- Stock levels

### 10. **Store Settings** (`/store-settings`)
- Global configuration
- Account mappings

## Architecture Patterns

### Client-Side Architecture
1. **Context Providers** (in `app/components/`):
   - `UserContext` - Authentication and user state
   - `SidebarContext` - Navigation state
   - `ToastProvider` - Notifications

2. **API Architecture**:
   - Centralized API client in `app/lib/apiClient.ts`
   - Domain-specific API modules (accountsApi, itemsApi, etc.)
   - Response caching with `apiCache.ts`

3. **State Management**:
   - React Context for global state (auth, sidebar, toast)
   - Local component state with `useState`
   - Custom hooks for data fetching (`useCustomersList`, `useItemsList`, etc.)

### Backend Integration
- **API Base URL**: Configurable via `NEXT_PUBLIC_API_BASE_URL`
- **Authentication**: JWT Bearer tokens (Laravel Sanctum)
- **CSRF Protection**: Enabled for Laravel backend
- **Permission System**: Role-based access control (RBAC)

### Key Design Decisions
1. **Server Components by Default**: Uses Next.js App Router
2. **Client Components**: Marked with `"use client"` for interactivity
3. **No External State Management**: Uses React Context + hooks instead of Redux/Zustand
4. **Native Fetch**: No Axios - uses native fetch with custom wrapper
5. **Tailwind CSS**: Utility-first styling
6. **No UI Component Library**: Custom components with Tailwind

## File Organization Principles

### Components
- **Location**: `app/components/[Domain]/`
- **Naming**: PascalCase (e.g., `CustomerDetailContent.tsx`)
- **Structure**: One main component per file, related components grouped in folders

### Pages
- **Location**: `app/[route]/page.tsx`
- **Pattern**: Server component that renders client components
- **Client Pages**: Use `[Name]Client.tsx` pattern for interactive pages

### Hooks
- **Location**: `app/components/[Domain]/use[Name].ts`
- **Pattern**: Custom hooks for data fetching and list management
- **Caching**: Built-in caching with cache invalidation helpers

### Types
- **Location**: `app/lib/types.ts`
- **Pattern**: Single source of truth for all TypeScript interfaces
- **Exports**: All types exported from this file

## Data Flow

```
User Action → Component → API Client → Backend API → Database
                 ↓
            State Update ← Response
                 ↓
            UI Re-render
```

## Authentication Flow

1. User submits credentials on `/login`
2. Backend validates and returns `access_token`
3. Token stored in `localStorage`
4. User info fetched from `/auth/me`
5. Permissions loaded and stored in context
6. AuthShell manages protected routes

## Permission System

- **Levels**: `no-access`, `read`, `read-write`
- **Format**: `module.[module-name]` (e.g., `module.accounting`)
- **Access Control**: Sidebar filtering and UI element visibility
- **Helper**: `hasAtLeast(code, level)` function

## Performance Optimizations

1. **API Caching**: `cachedGet` with automatic invalidation
2. **Pagination**: All lists support server-side pagination
3. **Lazy Loading**: Components loaded on demand
4. **Image Optimization**: Next.js Image component (where applicable)
5. **Tree Shaking**: ES modules for dead code elimination

## Development Guidelines

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Async/await for async operations
- Error boundaries at page level

### Naming Conventions
- Components: PascalCase
- Hooks: camelCase with `use` prefix
- API functions: camelCase
- Types/Interfaces: PascalCase

### Error Handling
- API errors caught and displayed via Toast
- Form validation errors displayed inline
- 401/403 errors trigger re-authentication

## Related Documentation
- [Frontend Structure](./02-frontend-structure.md)
- [API Client](./03-api-client.md)
- [Type System](./04-type-system.md)
- [Authentication & Permissions](./05-authentication-permissions.md)
