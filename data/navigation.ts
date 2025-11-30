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
  Building2,
  User
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
    id: "public",
    label: "PUBLIC",
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
    isExpanded: false
  },
  {
    id: "buying",
    label: "Buying",
    icon: ShoppingCart,
    href: "/buying",
    isExpanded: false
  },
  {
    id: "selling",
    label: "Selling",
    icon: Store,
    href: "/selling",
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
    id: "staff",
    label: "Staff",
    icon: Users,
    href: "/staff",
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
    isExpanded: false
  },
  {
    id: "supplier",
    label: "Supplier",
    icon: Building2,
    href: "/supplier",
    isExpanded: false
  }
];

