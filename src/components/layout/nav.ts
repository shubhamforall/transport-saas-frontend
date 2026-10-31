import {
  ChartColumn,
  CreditCard,
  FileText,
  LayoutDashboard,
  Route,
  Settings,
  Truck,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@/types/api';

export interface NavItem {
  /** Path segment under /t/:tenantId/ */
  to: string;
  label: string;
  icon: LucideIcon;
  /** Hidden when the role lacks this permission (UI only; the API enforces it). */
  permission?: Permission;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/** Sidebar order follows the project plan (section 6, Navigation). */
export const NAV: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: 'customers', label: 'Customers', icon: Users, permission: 'customers.read' },
      { to: 'vehicles', label: 'Vehicles', icon: Truck, permission: 'vehicles.read' },
      { to: 'jobs', label: 'Transport jobs', icon: Route, permission: 'jobs.read' },
      { to: 'invoices', label: 'Invoices', icon: FileText, permission: 'invoices.read' },
      { to: 'payments', label: 'Payments', icon: Wallet, permission: 'payments.read' },
      { to: 'reports', label: 'Reports', icon: ChartColumn, permission: 'reports.read' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: 'team', label: 'Team', icon: UsersRound, permission: 'members.read' },
      { to: 'billing', label: 'Billing & plan', icon: CreditCard, permission: 'tenant.read' },
      { to: 'settings', label: 'Company settings', icon: Settings, permission: 'tenant.read' },
    ],
  },
];

export function navLabelFor(segment: string | undefined): string {
  for (const group of NAV) {
    const item = group.items.find((i) => i.to === segment);
    if (item) return item.label;
  }
  return 'Workspace';
}
