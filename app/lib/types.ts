export type AccessLevel = "no-access" | "read" | "read-write";

export type PermissionsMap = Record<string, AccessLevel>;

export interface RoleSummary {
  id: string | number;
  name: string;
  description?: string | null;
}

export interface PermissionSummary {
  id: string | number;
  code: string;
  label: string;
  access_level: AccessLevel;
}

export interface Role extends RoleSummary {
  is_system?: boolean;
  permissions?: PermissionSummary[];
}

export interface User {
  id: string | number;
  email: string;
  username?: string;
  first_name?: string;
  middle_name?: string | null;
  last_name?: string | null;
  full_name: string;
  language?: string;
  time_zone?: string;
  status: "active" | "inactive";
  initials?: string;
  user_type?: string;
  phone?: string | null;
  address?: string | null;
  roles?: RoleSummary[];
}

export interface UserProfile {
  user_id: string | number;
  address?: string | null;
  cnic_front_path?: string | null;
  cnic_back_path?: string | null;
}

export interface Tag {
  id: string | number;
  name: string;
  color: string;
}

export interface Attachment {
  id: string | number;
  user_id: string | number;
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
}

// Accounting / Accounts
export type RootAccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type NormalBalance = "debit" | "credit";

export interface Account {
  id: number;
  company_id: number;
  name: string;
  number: string | null;
  root_type: RootAccountType;
  is_group: boolean;
  normal_balance: NormalBalance | null;
  tax_rate: number | null;
  is_disabled: boolean;
  currency: string | null;
  parent_id: number | null;
  parent_name: string | null;
  has_children: boolean;
  // For tree responses, children is an array; for flat responses it may be null.
  children: Account[] | null;
}

export type AccountTreeNode = Omit<Account, "children"> & {
  children: AccountTreeNode[];
};


