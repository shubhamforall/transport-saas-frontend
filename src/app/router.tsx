import type { ComponentType } from 'react';
import { Navigate, createBrowserRouter, type RouteObject } from 'react-router';
import { HomeRedirect, RedirectIfSignedIn, RequireAuth } from '@/features/auth/guards';
import { SignInPage } from '@/features/auth/SignInPage';
import { SignUpPage } from '@/features/auth/SignUpPage';
import { OnboardingPage } from '@/features/tenants/OnboardingPage';
import { TenantLayout } from '@/features/tenants/TenantLayout';
import { NotFoundPage } from '@/routes/NotFoundPage';

/**
 * Feature pages are code-split: each loads when first visited, so the first page load stays
 * small on slow mobile connections.
 */
function page<M>(load: () => Promise<M>, name: keyof M): Pick<RouteObject, 'lazy'> {
  return {
    lazy: async () => ({ Component: (await load())[name] as ComponentType }),
  };
}

const customers = () => import('@/features/customers/CustomersListPage');
const customerForm = () => import('@/features/customers/CustomerFormPage');
const customerDetail = () => import('@/features/customers/CustomerDetailPage');
const vehicles = () => import('@/features/vehicles/VehiclesListPage');
const vehicleForm = () => import('@/features/vehicles/VehicleFormPage');
const vehicleDetail = () => import('@/features/vehicles/VehicleDetailPage');
const jobs = () => import('@/features/jobs/JobsListPage');
const jobForm = () => import('@/features/jobs/JobFormPage');
const jobDetail = () => import('@/features/jobs/JobDetailPage');
const invoices = () => import('@/features/invoices/InvoicesListPage');
const newInvoice = () => import('@/features/invoices/NewInvoicePage');
const invoiceEditor = () => import('@/features/invoices/InvoiceEditorPage');
const invoiceDetail = () => import('@/features/invoices/InvoiceDetailPage');
const platform = () => import('@/features/platform/PlatformPages');

export const routes: RouteObject[] = [
  { path: '/', element: <HomeRedirect /> },
  {
    element: <RedirectIfSignedIn />,
    children: [
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      {
        path: '/forgot-password',
        ...page(() => import('@/features/auth/PasswordResetPages'), 'ForgotPasswordPage'),
      },
    ],
  },
  // Reachable signed in or out.
  {
    path: '/reset-password',
    ...page(() => import('@/features/auth/PasswordResetPages'), 'ResetPasswordPage'),
  },
  {
    path: '/invitations/accept',
    ...page(() => import('@/features/team/AcceptInvitationPage'), 'AcceptInvitationPage'),
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/onboarding', element: <OnboardingPage /> },
      {
        path: '/t/:tenantId',
        element: <TenantLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          {
            path: 'dashboard',
            ...page(() => import('@/features/dashboard/DashboardPage'), 'DashboardPage'),
          },
          { path: 'customers', ...page(customers, 'CustomersListPage') },
          { path: 'customers/new', ...page(customerForm, 'CustomerFormPage') },
          { path: 'customers/:customerId', ...page(customerDetail, 'CustomerDetailPage') },
          { path: 'customers/:customerId/edit', ...page(customerForm, 'CustomerFormPage') },
          { path: 'vehicles', ...page(vehicles, 'VehiclesListPage') },
          { path: 'vehicles/new', ...page(vehicleForm, 'VehicleFormPage') },
          { path: 'vehicles/:vehicleId', ...page(vehicleDetail, 'VehicleDetailPage') },
          { path: 'vehicles/:vehicleId/edit', ...page(vehicleForm, 'VehicleFormPage') },
          { path: 'jobs', ...page(jobs, 'JobsListPage') },
          { path: 'jobs/new', ...page(jobForm, 'JobFormPage') },
          { path: 'jobs/:jobId', ...page(jobDetail, 'JobDetailPage') },
          { path: 'jobs/:jobId/edit', ...page(jobForm, 'JobFormPage') },
          { path: 'invoices', ...page(invoices, 'InvoicesListPage') },
          { path: 'invoices/new', ...page(newInvoice, 'NewInvoicePage') },
          { path: 'invoices/:invoiceId', ...page(invoiceDetail, 'InvoiceDetailPage') },
          { path: 'invoices/:invoiceId/edit', ...page(invoiceEditor, 'InvoiceEditorPage') },
          {
            path: 'payments',
            ...page(() => import('@/features/payments/PaymentsListPage'), 'PaymentsListPage'),
          },
          {
            path: 'reports',
            ...page(() => import('@/features/reports/ReportsPage'), 'ReportsPage'),
          },
          { path: 'team', ...page(() => import('@/features/team/TeamPage'), 'TeamPage') },
          {
            path: 'billing',
            ...page(() => import('@/features/billing/BillingPage'), 'BillingPage'),
          },
          {
            path: 'settings',
            ...page(() => import('@/features/settings/CompanySettingsPage'), 'CompanySettingsPage'),
          },
        ],
      },
      {
        path: '/platform',
        ...page(() => import('@/features/platform/PlatformLayout'), 'PlatformLayout'),
        children: [
          { index: true, element: <Navigate to="tenants" replace /> },
          { path: 'tenants', ...page(platform, 'PlatformTenantsPage') },
          { path: 'tenants/:tenantId', ...page(platform, 'PlatformTenantDetailPage') },
          { path: 'plans', ...page(platform, 'PlatformPlansPage') },
          { path: 'subscriptions', ...page(platform, 'PlatformSubscriptionsPage') },
          { path: 'webhooks', ...page(platform, 'PlatformWebhooksPage') },
          { path: 'audit', ...page(platform, 'PlatformAuditPage') },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes);
