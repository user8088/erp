# Accounting Module Documentation

## Overview

The Accounting module provides complete financial management including:
- Chart of Accounts (hierarchical account structure)
- Journal Entries (double-entry bookkeeping)
- Accounts Payable/Receivable
- Financial Reports (P&L, Balance Sheet, Trial Balance, General Ledger)

## Routes & Pages

```
/accounting                          - Accounting dashboard
/accounting/accounts                   - Chart of Accounts list
/accounting/accounts/new             - Create new account
/accounting/accounts/[id]            - Account detail & transactions
/accounting/payables                 - Accounts Payable
/accounting/receivables              - Accounts Receivable
/accounting/financial-reports        - Financial reports hub

/chart-of-accounts                   - Alias for accounts list
/journal-entry/new                   - Create journal entry
/profit-and-loss-statement           - P&L report
/balance-sheet                       - Balance Sheet report
/trial-balance                       - Trial Balance report
/general-ledger                      - General Ledger report
/cash-flow                           - Cash Flow report
/consolidated-financial-statement    - Consolidated reports
```

## Components

### Chart of Accounts (`app/components/Accounting/`)

#### AccountsListPage (`app/accounting/accounts/page.tsx`)
- **Features:**
  - Filter by account type (Asset, Liability, Equity, Income, Expense)
  - Filter by group/ledger
  - Search by name or number
  - Enable/disable accounts
  - Pagination (20 per page)
- **Permissions:** `module.accounting` read/write

#### NewAccountPage (`app/accounting/accounts/new/page.tsx`)
- **Form Fields:**
  - Account Name (required)
  - Parent Account (required for ledger accounts)
  - Account Number (optional)
  - Account Type (Asset, Liability, Equity, Income, Expense)
  - Tax Rate (optional)
  - Balance Side (Debit/Credit for ledger accounts)
  - Is Group checkbox
  - Disable checkbox
- **Validation:**
  - Parent account type must match child
  - Ledger accounts require parent and balance side
  - Group accounts cannot have balance side
- **API:** `accountsApi.createAccount()`

#### AccountDetailClient (`app/accounting/accounts/[id]/AccountDetailClient.tsx`)
- **Features:**
  - Account details display
  - Transaction history table
  - Date range filtering
  - Balance calculation
  - Statement download (PDF)
  - Edit/Delete account
- **Transactions Display:**
  - Date, Voucher Type, Reference
  - Description
  - Debit/Credit amounts
  - Running balance

### Financial Reports

#### FinancialSummary (`app/components/Accounting/FinancialSummary.tsx`)
- **Metrics:**
  - Total Revenue
  - Total Expenses
  - Net Profit
  - Profit Margin %
- **Period filtering support**

#### ProfitLossChart (`app/components/Accounting/ProfitLossChart.tsx`)
- Visual chart of profit/loss over time
- Uses Recharts library

#### AccountingReports (`app/components/Accounting/AccountingReports.tsx`)
- Quick links to:
  - Chart of Accounts
  - Journal Entry
  - Financial Reports

#### AccountingShortcuts (`app/components/Accounting/AccountingShortcuts.tsx`)
- Common actions dashboard

### Journal Entry

#### JournalEntryForm (`app/components/Accounting/JournalEntryForm.tsx`)
- **Features:**
  - Multi-line entry form
  - Account selection with autocomplete
  - Debit/Credit input
  - Auto-balance validation (total debits = total credits)
  - Description fields
- **Validation:**
  - At least 2 lines required
  - Debits must equal credits
  - All accounts must be valid
- **API:** `journalApi.createJournalEntry()`

### Receivables & Payables

#### ReceivablesReports (`app/components/Receivables/`)
- Customer balance summary
- Aging report (current, 30, 60, 90+ days)
- Outstanding invoices list

#### PayablesReports (`app/components/Payables/`)
- Supplier balance summary
- Aging report
- Outstanding POs/invoices

### Financial Reports Sections

#### FinancialReportsSections (`app/components/FinancialReports/`)
- **Reports Available:**
  - Trial Balance
  - Profit & Loss
  - Balance Sheet
  - General Ledger
  - Cash Flow
  - Profitability Analysis
  - Trend Analysis

#### ReportFilters (`app/components/FinancialReports/ReportFilters.tsx`)
- **Filter Options:**
  - Date range (start/end)
  - Period presets (This Month, Last Month, etc.)
  - Comparison type (None, Previous Period, Previous Year)
  - Account selection
  - Group by (Day, Week, Month, Quarter, Year)

## Type Definitions

### Core Accounting Types

```typescript
// Account Types
type RootAccountType = "asset" | "liability" | "equity" | "income" | "expense";
type NormalBalance = "debit" | "credit";

interface Account {
  id: number;
  company_id: number;
  name: string;
  number: string | null;
  root_type: RootAccountType;
  is_group: boolean;           // true = parent account, false = ledger
  normal_balance: NormalBalance | null;
  tax_rate: number | null;
  is_disabled: boolean;
  currency: string | null;
  parent_id: number | null;
  parent_name: string | null;
  has_children: boolean;
  balance?: number | null;
  children: Account[] | null;
}

// Journal Entry Types
interface JournalEntry {
  id?: number;
  entry_number?: string;
  entry_date?: string;
  voucher_type?: string;
  reference_number?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
  description?: string | null;
  total_debit?: number;
  total_credit?: number;
  status?: 'draft' | 'posted';
  lines?: JournalEntryLine[];
}

interface JournalEntryLine {
  id?: number;
  account_id: number;
  account?: Account | null;
  debit: number;
  credit: number;
  description?: string | null;
}

// Transaction Types
interface Transaction {
  id: number;
  date: string;
  voucher_type: string;
  reference_number: string | null;
  description: string | null;
  debit: number;
  credit: number;
  balance?: number;
  is_opening_balance?: boolean;
  created_by?: number;
  creator?: {
    id: number;
    full_name: string;
    email?: string;
  };
}
```

### Report Types

```typescript
// Trial Balance
interface TrialBalanceReport {
  accounts: TrialBalanceAccount[];
  total_debit: number;
  total_credit: number;
}

interface TrialBalanceAccount {
  account_id: number;
  account_name: string;
  account_number: string | null;
  opening_balance: number;
  debit: number;
  credit: number;
  closing_balance: number;
}

// Profit & Loss
interface ProfitLossReport {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  operating_profit: number;
  other_income: number;
  other_expenses: number;
  net_profit: number;
  details: ProfitLossDetail[];
}

// Balance Sheet
interface BalanceSheetReport {
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
}
```

## API Endpoints

### Accounts API

```typescript
// List accounts
GET /accounts?company_id=1&search=&root_type=&is_group=&page=1&per_page=20
Response: Paginated<Account>

// Get account tree
GET /accounts/tree?company_id=1&include_balances=1
Response: Account[]

// Get single account
GET /accounts/{id}
Response: { account: Account }

// Create account
POST /accounts
Body: CreateOrUpdateAccountPayload
Response: { account: Account }

// Update account
PUT /accounts/{id}
Body: Partial<CreateOrUpdateAccountPayload>
Response: { account: Account }

// Update account state (enable/disable)
PATCH /accounts/{id}/state
Body: { is_disabled: boolean }
Response: { account: Account }

// Delete account
DELETE /accounts/{id}
Body: { reallocate_to_account_id?: number }
Response: { message: string }

// Get account transactions
GET /accounts/{id}/transactions?page=&per_page=&start_date=&end_date=
Response: Paginated<Transaction>

// Get account balance
GET /accounts/{id}/balance
Response: { balance: number }

// Download account statement (PDF)
GET /accounts/{id}/statement?start_date=&end_date=
Response: Blob (PDF)

// Download chart of accounts (PDF)
GET /accounts/statement?company_id=1&include_balances=1
Response: Blob (PDF)
```

### Journal Entry API

```typescript
// Create journal entry
POST /journal-entries
Body: JournalEntry
Response: { journal_entry: JournalEntry }
```

### Reports API

```typescript
// Trial Balance
GET /reports/trial-balance?start_date=&end_date=&company_id=1
Response: TrialBalanceReport

// Profit & Loss
GET /reports/profit-loss?start_date=&end_date=&company_id=1
Response: ProfitLossReport

// Balance Sheet
GET /reports/balance-sheet?as_of_date=&company_id=1
Response: BalanceSheetReport

// General Ledger
GET /reports/general-ledger?account_id=&start_date=&end_date=
Response: Paginated<GeneralLedgerLine>

// Cash Flow
GET /reports/cash-flow?start_date=&end_date=
Response: CashFlowReport
```

## Business Logic

### Account Hierarchy

```
Asset (Group)
├── Current Asset (Group)
│   ├── Cash (Ledger) - Debit
│   ├── Bank (Ledger) - Debit
│   └── Inventory (Ledger) - Debit
├── Fixed Asset (Group)
│   ├── Building (Ledger) - Debit
│   └── Equipment (Ledger) - Debit

Liability (Group)
├── Current Liability (Group)
│   ├── Accounts Payable (Ledger) - Credit
│   └── Short-term Loans (Ledger) - Credit

Equity (Group)
├── Capital (Ledger) - Credit
└── Retained Earnings (Ledger) - Credit

Income (Group)
├── Sales Revenue (Ledger) - Credit
└── Other Income (Ledger) - Credit

Expense (Group)
├── Cost of Goods Sold (Ledger) - Debit
├── Operating Expenses (Group)
│   ├── Rent (Ledger) - Debit
│   └── Salaries (Ledger) - Debit
```

### Double-Entry Bookkeeping Rules

1. **Every transaction affects at least two accounts**
2. **Debits must equal credits**
3. **Account type determines normal balance:**
   - Asset: Debit
   - Liability: Credit
   - Equity: Credit
   - Income: Credit
   - Expense: Debit

### Common Journal Entries

```typescript
// Sales Transaction
Debit: Accounts Receivable (Asset+)
Credit: Sales Revenue (Income+)

// Purchase Inventory
Debit: Inventory (Asset+)
Credit: Accounts Payable (Liability+)

// Payment Received
Debit: Cash (Asset+)
Credit: Accounts Receivable (Asset-)

// Expense Payment
Debit: Operating Expense (Expense+)
Credit: Cash (Asset-)
```

## Component Usage Examples

### Displaying Account List
```typescript
import { accountsApi } from "../lib/apiClient";

function AccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    accountsApi.getAccounts({
      company_id: 1,
      page: 1,
      per_page: 20
    }).then(response => {
      setAccounts(response.data);
    });
  }, []);

  return (
    <table>
      {accounts.map(account => (
        <tr key={account.id}>
          <td>{account.name}</td>
          <td>{account.number}</td>
          <td>{account.root_type}</td>
          <td>{account.is_group ? "Group" : "Ledger"}</td>
        </tr>
      ))}
    </table>
  );
}
```

### Creating Journal Entry
```typescript
const handleSubmit = async () => {
  const journalEntry: JournalEntry = {
    entry_date: "2024-01-15",
    description: "Monthly rent payment",
    lines: [
      {
        account_id: 101, // Rent Expense
        debit: 5000,
        credit: 0,
        description: "January rent"
      },
      {
        account_id: 102, // Cash
        debit: 0,
        credit: 5000,
        description: "January rent"
      }
    ]
  };

  await journalApi.createJournalEntry(journalEntry);
};
```

### Generating Reports
```typescript
const generateTrialBalance = async () => {
  const report = await reportsApi.getTrialBalance({
    company_id: 1,
    start_date: "2024-01-01",
    end_date: "2024-01-31"
  });

  console.log("Total Debits:", report.total_debit);
  console.log("Total Credits:", report.total_credit);
};
```

## Permissions

| Feature | Permission | Level |
|---------|-----------|-------|
| View Accounts | module.accounting | read |
| Create/Edit Accounts | module.accounting | read-write |
| View Journal Entries | module.accounting | read |
| Create Journal Entries | module.accounting | read-write |
| View Reports | module.accounting | read |
| Download Statements | module.accounting | read |

## Related Documentation
- [Type System](./04-type-system.md) - Account, JournalEntry, Transaction types
- [API Client](./03-api-client.md) - accountsApi, journalApi, reportsApi
- [Stock Module](./07-modules-stock.md) - Inventory accounts integration
