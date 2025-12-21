# Financial Reports & Profit & Loss System

## Overview

This document outlines the complete profit & loss system and analytical reports framework based on the Chart of Accounts (COA). The system will map COA accounts to analytical categories and generate comprehensive financial reports.

## COA Mapping Strategy

### Account Root Types
- **Asset**: Resources owned by the company
- **Liability**: Obligations and debts
- **Equity**: Owner's equity and retained earnings
- **Income**: Revenue and income streams
- **Expense**: Costs and expenses

### P&L Statement Mapping

#### Income Section
- **Operating Revenue**: Income accounts related to core business operations
  - Sales Revenue
  - Service Revenue
  - Rental Income
  - Other Operating Income
- **Non-Operating Income**: Income from non-core activities
  - Interest Income
  - Dividend Income
  - Other Income

#### Expense Section
- **Cost of Goods Sold (COGS)**: Direct costs
  - Purchase Costs
  - Direct Labor
  - Manufacturing Costs
- **Operating Expenses**: Day-to-day business expenses
  - **Selling Expenses**: Marketing, Sales, Distribution
  - **Administrative Expenses**: Office, Management, Utilities
  - **General Expenses**: Miscellaneous operating costs
- **Non-Operating Expenses**: Expenses not related to core operations
  - Interest Expense
  - Loss on Asset Disposal
  - Other Expenses

#### Profit Calculations
- **Gross Profit** = Total Income - COGS
- **Operating Profit (EBIT)** = Gross Profit - Operating Expenses
- **Net Profit** = Operating Profit - Non-Operating Expenses + Non-Operating Income

### Balance Sheet Mapping

#### Assets
- **Current Assets**: Cash, Accounts Receivable, Inventory, Prepaid Expenses
- **Fixed Assets**: Property, Plant, Equipment, Vehicles
- **Intangible Assets**: Goodwill, Patents, Trademarks
- **Other Assets**: Investments, Deposits

#### Liabilities
- **Current Liabilities**: Accounts Payable, Short-term Debt, Accrued Expenses
- **Long-term Liabilities**: Long-term Debt, Deferred Tax
- **Other Liabilities**: Provisions, Contingencies

#### Equity
- **Share Capital**: Common Stock, Preferred Stock
- **Retained Earnings**: Accumulated profits
- **Reserves**: Capital Reserves, Revenue Reserves

## Recommended Report Types

### 1. Core Financial Statements

#### Profit & Loss Statement (P&L)
- **Period Comparison**: Current period vs Previous period
- **Year-to-Date**: Current year vs Previous year
- **Quarterly**: Q1, Q2, Q3, Q4 comparisons
- **Monthly**: Month-over-month trends
- **Features**:
  - Drill-down to account details
  - Export to PDF/Excel
  - Percentage change indicators
  - Budget vs Actual (future enhancement)

#### Balance Sheet
- **As of Date**: Point-in-time snapshot
- **Comparative**: Current vs Previous period
- **Features**:
  - Asset/Liability breakdown
  - Equity analysis
  - Working capital calculation
  - Financial ratios

#### Trial Balance
- **Date Range**: Specific period
- **Features**:
  - All accounts with balances
  - Debit/Credit totals
  - Unbalanced entries detection
  - Account-level drill-down

#### Cash Flow Statement
- **Operating Activities**: Cash from operations
- **Investing Activities**: Capital expenditures, investments
- **Financing Activities**: Loans, equity transactions
- **Features**:
  - Direct/Indirect method
  - Period comparison
  - Cash position

### 2. Ledger Reports

#### General Ledger
- All transactions for all accounts
- Date range filtering
- Account filtering
- Voucher type filtering

#### Customer Ledger Summary
- Outstanding balances per customer
- Aging analysis
- Payment history
- Credit limits

#### Supplier Ledger Summary
- Outstanding balances per supplier
- Aging analysis
- Payment history
- Credit terms

### 3. Analytical Reports

#### Profitability Analysis
- **Gross Profit Margin**: (Gross Profit / Revenue) × 100
- **Operating Profit Margin**: (Operating Profit / Revenue) × 100
- **Net Profit Margin**: (Net Profit / Revenue) × 100
- **ROI**: Return on Investment
- **ROE**: Return on Equity
- **ROA**: Return on Assets

#### Trend Analysis
- **Sales Invoice Trends**: Revenue over time
- **Purchase Invoice Trends**: Expenses over time
- **Profit Trends**: Profitability over time
- **Expense Trends**: Category-wise expense trends

#### Comparative Analysis
- **Period-over-Period**: Current vs Previous
- **Year-over-Year**: Same period different years
- **Budget vs Actual**: Planned vs Actual (future)
- **Department-wise**: By cost center (future)

#### Ratio Analysis
- **Liquidity Ratios**: Current Ratio, Quick Ratio
- **Profitability Ratios**: Gross Margin, Net Margin, ROE, ROA
- **Efficiency Ratios**: Asset Turnover, Inventory Turnover
- **Leverage Ratios**: Debt-to-Equity, Debt Ratio

### 4. Specialized Reports

#### Trial Balance for Party
- Customer/Supplier specific trial balance
- Outstanding balances
- Transaction history

#### Payment Period Analysis
- Average payment days
- Payment trends
- Aging buckets

#### Sales Partners Commission
- Commission calculations
- Performance metrics
- Payment tracking

#### Customer Credit Balance
- Credit limits
- Available credit
- Overdue amounts

#### Sales Payment Summary
- Payment methods breakdown
- Collection efficiency
- Outstanding receivables

## Implementation Approach

### Phase 1: Foundation (Current)
1. ✅ COA structure exists
2. ✅ Journal entries system exists
3. ✅ Account balances calculation exists
4. ⏳ COA mapping configuration
5. ⏳ Financial report types and interfaces

### Phase 2: Core Reports
1. Trial Balance
2. Profit & Loss Statement
3. Balance Sheet
4. General Ledger

### Phase 3: Analytical Reports
1. Profitability Analysis
2. Trend Analysis
3. Comparative Reports
4. Ratio Analysis

### Phase 4: Advanced Features
1. Budget vs Actual
2. Cost Center Analysis
3. Multi-currency support
4. Consolidation (multi-company)

## COA Mapping Configuration

### Mapping Structure
```typescript
interface AccountMapping {
  account_id: number;
  pnl_section: 'income' | 'cogs' | 'operating_expense' | 'non_operating';
  pnl_category: string; // e.g., 'sales_revenue', 'administrative_expense'
  balance_sheet_section?: 'current_asset' | 'fixed_asset' | 'current_liability' | 'long_term_liability' | 'equity';
  is_primary: boolean; // Primary account for this category
  order: number; // Display order in reports
}
```

### Default Mapping Rules
1. **Income accounts** → P&L Income section
2. **Expense accounts** → P&L Expense section
3. **Asset accounts** → Balance Sheet Assets
4. **Liability accounts** → Balance Sheet Liabilities
5. **Equity accounts** → Balance Sheet Equity

### Custom Mapping
- Allow users to configure custom mappings
- Support for account groups in reports
- Hierarchical category structure

## API Endpoints Required

### Financial Reports
- `GET /api/financial-reports/trial-balance`
- `GET /api/financial-reports/profit-loss`
- `GET /api/financial-reports/balance-sheet`
- `GET /api/financial-reports/cash-flow`
- `GET /api/financial-reports/general-ledger`

### Analytical Reports
- `GET /api/financial-reports/profitability-analysis`
- `GET /api/financial-reports/trends`
- `GET /api/financial-reports/ratios`
- `GET /api/financial-reports/comparative`

### COA Mapping
- `GET /api/account-mappings`
- `POST /api/account-mappings`
- `PUT /api/account-mappings/{id}`
- `DELETE /api/account-mappings/{id}`

## Report Features

### Common Features
- Date range selection
- Period comparison
- Export (PDF, Excel, CSV)
- Print-friendly format
- Drill-down capabilities
- Account filtering
- Grouping options

### UI Components
- Date picker for period selection
- Comparison toggle
- Export buttons
- Print button
- Account tree selector
- Filter panel
- Summary cards
- Charts and graphs

## Next Steps

1. Create TypeScript interfaces for all report types
2. Build API client methods for financial reports
3. Create COA mapping configuration UI
4. Implement Trial Balance report
5. Implement Profit & Loss Statement
6. Implement Balance Sheet
7. Add analytical reports
8. Add export functionality
9. Add charts and visualizations

