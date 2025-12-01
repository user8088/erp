export type AccessLevel = "no-access" | "read" | "read-write";

export interface RoleDefinition {
  id: string;
  name: string;
  checked: boolean;
  description?: string;
  permissions?: Record<string, AccessLevel>;
}

const STORAGE_KEY = "erp_roles";

export const defaultRoles: RoleDefinition[] = [
  // Column 1
  { id: "academics_user", name: "Academics User", checked: true },
  { id: "accounts_manager", name: "Accounts Manager", checked: true },
  { id: "accounts_user", name: "Accounts User", checked: true },
  { id: "agriculture_manager", name: "Agriculture Manager", checked: true },
  { id: "agriculture_user", name: "Agriculture User", checked: true },
  { id: "analytics", name: "Analytics", checked: true },
  { id: "auditor", name: "Auditor", checked: true },
  { id: "blogger", name: "Blogger", checked: true },
  { id: "customer", name: "Customer", checked: false },
  { id: "dashboard_manager", name: "Dashboard Manager", checked: true },
  { id: "delivery_manager", name: "Delivery Manager", checked: true },
  { id: "delivery_user", name: "Delivery User", checked: true },
  { id: "employee", name: "Employee", checked: true },
  { id: "fleet_manager", name: "Fleet Manager", checked: true },
  { id: "fulfillment_user", name: "Fulfillment User", checked: true },

  // Column 2
  { id: "hr_user", name: "HR User", checked: true },
  { id: "inbox_user", name: "Inbox User", checked: true },
  { id: "item_manager", name: "Item Manager", checked: true },
  {
    id: "kb_contributor",
    name: "Knowledge Base Contributor",
    checked: true,
  },
  { id: "kb_editor", name: "Knowledge Base Editor", checked: true },
  {
    id: "maintenance_manager",
    name: "Maintenance Manager",
    checked: true,
  },
  { id: "maintenance_user", name: "Maintenance User", checked: true },
  {
    id: "manufacturing_manager",
    name: "Manufacturing Manager",
    checked: true,
  },
  {
    id: "manufacturing_user",
    name: "Manufacturing User",
    checked: true,
  },
  { id: "newsletter_manager", name: "Newsletter Manager", checked: true },
  {
    id: "prepared_report_user",
    name: "Prepared Report User",
    checked: true,
  },
  { id: "projects_manager", name: "Projects Manager", checked: true },
  { id: "projects_user", name: "Projects User", checked: true },
  { id: "purchase_manager", name: "Purchase Manager", checked: true },
  {
    id: "purchase_master_manager",
    name: "Purchase Master Manager",
    checked: true,
  },

  // Column 3
  { id: "quality_manager", name: "Quality Manager", checked: true },
  { id: "report_manager", name: "Report Manager", checked: true },
  { id: "sales_manager", name: "Sales Manager", checked: true },
  { id: "sales_master_manager", name: "Sales Master Manager", checked: true },
  { id: "sales_user", name: "Sales User", checked: true },
  { id: "script_manager", name: "Script Manager", checked: true },
  { id: "stock_manager", name: "Stock Manager", checked: true },
  { id: "stock_user", name: "Stock User", checked: true },
  { id: "supplier", name: "Supplier", checked: false },
  { id: "support_team", name: "Support Team", checked: true },
  { id: "system_manager", name: "System Manager", checked: true },
  { id: "translator", name: "Translator", checked: true },
  { id: "website_manager", name: "Website Manager", checked: true },
  { id: "workspace_manager", name: "Workspace Manager", checked: true },
];

export function getStoredRoles(): RoleDefinition[] {
  if (typeof window === "undefined") {
    return defaultRoles;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultRoles;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultRoles;
    }
    return parsed.filter(
      (r: any) =>
        r &&
        typeof r.id === "string" &&
        typeof r.name === "string" &&
        typeof r.checked === "boolean"
    );
  } catch {
    return defaultRoles;
  }
}

export function saveStoredRoles(roles: RoleDefinition[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
  } catch {
    // ignore
  }
}


