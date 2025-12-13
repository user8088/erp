import {
  DollarSign,
  ShoppingCart,
  Store,
  Package,
  Wrench,
  ArrowLeft,
  ArrowRight,
  FileText,
  Users,
  Truck,
  Key,
  User,
  Tag,
  Box,
  FolderOpen,
  HandCoins,
  Settings2,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: NavItem[];
  isExpanded?: boolean;
}

export const navigationData: NavItem[] = [
  {
    id: "store",
    label: "STORE DASHBOARD",
    children: []
  },
  {
    id: "home",
    label: "Home",
    icon: Wrench,
    href: "/",
    isExpanded: false
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: DollarSign,
    href: "/accounting",
    children: [
      {
        id: "payables",
        label: "Payables",
        icon: ArrowLeft,
        href: "/accounting/payables",
      },
      {
        id: "receivables",
        label: "Receivables",
        icon: ArrowRight,
        href: "/accounting/receivables",
      },
      {
        id: "financial-reports",
        label: "Financial Reports",
        icon: FileText,
        href: "/accounting/financial-reports",
      },
    ],
    isExpanded: true
  },
  {
    id: "customer",
    label: "Customer",
    icon: User,
    href: "/customer",
    children: [
      {
        id: "customer-invoices",
        label: "Customer Invoices",
        icon: FileText,
        href: "/customer/invoices",
      },
    ],
    isExpanded: false
  },
  {
    id: "buying",
    label: "Buying",
    icon: ShoppingCart,
    href: "/buying",
    children: [
      {
        id: "purchase-invoices",
        label: "Purchase Invoices",
        icon: FileText,
        href: "/buying/purchase-invoices",
      },
    ],
    isExpanded: false
  },
  {
    id: "selling",
    label: "Selling",
    icon: Store,
    href: "/selling",
    children: [
      {
        id: "sale-invoices",
        label: "Sale Invoices",
        icon: FileText,
        href: "/selling/sale-invoices",
      },
    ],
    isExpanded: false
  },
  {
    id: "stock",
    label: "Stock",
    icon: Package,
    href: "/stock",
    isExpanded: false
  },
  {
    id: "items",
    label: "Items",
    icon: Box,
    href: "/items",
    children: [
      {
        id: "categories",
        label: "Categories",
        icon: FolderOpen,
        href: "/categories",
      },
      {
        id: "item-tags",
        label: "Tag Manager",
        icon: Tag,
        href: "/items/tags",
      },
    ],
    isExpanded: false
  },
  {
    id: "suppliers",
    label: "Suppliers",
    icon: Truck,
    href: "/suppliers",
    children: [
      {
        id: "supplier-invoices",
        label: "Supplier Invoices",
        icon: FileText,
        href: "/supplier/invoices",
      },
    ],
    isExpanded: false
  },
  {
    id: "staff",
    label: "Staff",
    icon: Users,
    href: "/staff",
    children: [
      {
        id: "staff-members",
        label: "Staff Members",
        icon: User,
        href: "/staff/members",
      },
      {
        id: "staff-invoices",
        label: "Staff Invoices",
        icon: FileText,
        href: "/staff/invoices",
      },
      {
        id: "tag-manager",
        label: "Tag Manager",
        icon: Tag,
        href: "/staff/tags",
      },
      {
        id: "staff-settings",
        label: "Settings",
        icon: Settings2,
        href: "/staff/settings",
      },
    ],
    isExpanded: false
  },
  {
    id: "transport",
    label: "Transport",
    icon: Truck,
    href: "/transport",
    isExpanded: false
  },
  {
    id: "rental",
    label: "Rental",
    icon: Key,
    href: "/rental",
    children: [
      {
        id: "rental-invoices",
        label: "Rental Invoices",
        icon: FileText,
        href: "/rental/invoices",
      },
    ],
    isExpanded: false
  }
];

