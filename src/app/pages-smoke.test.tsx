import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/router';
import { resetApiStateForTests } from '@/lib/api';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import type { Permission } from '@/types/api';

/** Every page renders with realistic API data and shows its heading (catches runtime crashes). */

const T = 'ctenant000000000000000001';
const ALL: Permission[] = [
  'tenant.read',
  'tenant.update',
  'members.read',
  'members.manage',
  'billing.manage',
  'customers.read',
  'customers.write',
  'vehicles.read',
  'vehicles.write',
  'jobs.read',
  'jobs.write',
  'invoices.read',
  'invoices.write',
  'payments.read',
  'payments.write',
  'reports.read',
];
const paged = <X,>(items: X[]) => ({
  items,
  page: 1,
  pageSize: 20,
  total: items.length,
  totalPages: 1,
});

const tenant = {
  id: T,
  name: 'Deccan Roadways Co.',
  legalName: null,
  phone: null,
  email: null,
  addressLine1: 'MIDC',
  addressLine2: null,
  city: 'Pune',
  state: 'Maharashtra',
  postalCode: '411001',
  country: 'IN',
  gstin: null,
  stateCode: '27',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  status: 'ACTIVE',
  jobNumberPrefix: 'JOB-',
  invoicePrefix: 'INV',
  defaultPaymentTermsDays: 30,
  defaultTaxRateBps: 1800,
  defaultSacCode: null,
  invoiceTerms: null,
  paymentInstructions: null,
  createdAt: '2026-10-28T10:00:00Z',
  updatedAt: '2026-10-28T10:00:00Z',
  myRole: 'OWNER',
  myPermissions: ALL,
};
const customer = {
  id: 'ccust00000000000000000001',
  customerType: 'BUSINESS',
  name: 'ABC Ltd.',
  contactPerson: 'Rahul',
  email: 'a@abc.example',
  phone: '+919876543210',
  addressLine1: 'Andheri',
  addressLine2: null,
  city: 'Mumbai',
  state: 'Maharashtra',
  stateCode: '27',
  postalCode: '400069',
  gstin: null,
  paymentTermsDays: 15,
  notes: null,
  status: 'ACTIVE',
  createdAt: '',
  updatedAt: '',
  jobCount: 1,
  invoiceCount: 1,
};
const vehicle = {
  id: 'cveh000000000000000000001',
  registrationNumberDisplay: 'MH 12 AB 1234',
  registrationNumberNormalized: 'MH12AB1234',
  vehicleType: 'HEAVY_TRUCK',
  makeModel: 'Tata',
  capacityMilli: 16000,
  capacityUnit: 'TONNES',
  ownershipType: 'OWNED',
  notes: null,
  status: 'ACTIVE',
  createdAt: '',
  jobCount: 1,
};
const job = {
  id: 'cjob000000000000000000001',
  jobNumber: 'JOB-0001',
  customerId: customer.id,
  vehicleId: vehicle.id,
  customer: { id: customer.id, name: 'ABC Ltd.', status: 'ACTIVE' },
  vehicle: {
    id: vehicle.id,
    registrationNumberDisplay: 'MH 12 AB 1234',
    vehicleType: 'HEAVY_TRUCK',
  },
  bookingDate: '2026-10-28',
  originAddress: null,
  originCity: 'Mumbai',
  destinationAddress: null,
  destinationCity: 'Pune',
  plannedPickupDate: null,
  actualPickupDate: '2026-10-29',
  plannedDeliveryDate: null,
  actualDeliveryDate: '2026-10-30',
  driverName: 'Ramesh',
  driverPhone: null,
  goodsDescription: 'Machine parts',
  quantityMilli: 40000,
  quantityUnit: 'boxes',
  lrNumber: 'LR-1',
  freightAmountMinor: 1_200_000,
  discountAmountMinor: 0,
  taxRateBps: 1800,
  status: 'DELIVERED',
  internalNotes: null,
  charges: [{ id: 'ch1', description: 'Loading', amountMinor: 50_000 }],
  chargesTotalMinor: 50_000,
  totalMinor: 1_250_000,
  invoice: null,
  invoiceState: 'NOT_INVOICED',
  allowedTransitions: ['IN_TRANSIT'],
  createdAt: '',
  statusHistory: [
    {
      id: 'e1',
      fromStatus: null,
      toStatus: 'BOOKED',
      note: null,
      createdAt: '2026-10-28T10:00:00Z',
    },
  ],
};
const invoice = {
  id: 'cinv000000000000000000001',
  invoiceNumber: 'INV/26-27/0001',
  status: 'PARTIALLY_PAID',
  displayStatus: 'PARTIALLY_PAID',
  customerId: customer.id,
  customer: { id: customer.id, name: 'ABC Ltd.', email: 'a@abc.example' },
  invoiceDate: '2026-10-31',
  dueDate: '2026-11-15',
  taxType: 'INTRA_STATE',
  placeOfSupplyStateCode: '27',
  billTo: { name: 'ABC Ltd.', city: 'Mumbai' },
  from: { name: 'Deccan Roadways Co.', city: 'Pune', stateCode: '27' },
  currency: 'INR',
  subtotalMinor: 1_250_000,
  discountMinor: 0,
  taxableMinor: 1_250_000,
  cgstMinor: 112_500,
  sgstMinor: 112_500,
  igstMinor: 0,
  taxTotalMinor: 225_000,
  grandTotalMinor: 1_475_000,
  amountPaidMinor: 500_000,
  balanceMinor: 975_000,
  notes: 'Thanks',
  terms: null,
  items: [
    {
      id: 'i1',
      description: 'Freight',
      sacCode: '996511',
      quantityMilli: 1000,
      unitPriceMinor: 1_250_000,
      discountMinor: 0,
      taxableAmountMinor: 1_250_000,
      taxRateBps: 1800,
      taxAmountMinor: 225_000,
      lineTotalMinor: 1_475_000,
    },
  ],
  jobs: [
    {
      id: job.id,
      jobNumber: 'JOB-0001',
      originCity: 'Mumbai',
      destinationCity: 'Pune',
      goodsDescription: 'Machine parts',
      lrNumber: 'LR-1',
      vehicleRegistration: 'MH 12 AB 1234',
      actualDeliveryDate: '2026-10-30',
    },
  ],
  payments: [
    {
      paymentId: 'p1',
      paymentDate: '2026-10-31',
      method: 'UPI',
      reference: 'UTR1',
      allocatedAmountMinor: 500_000,
    },
  ],
  issuedAt: '2026-10-31T00:00:00Z',
  cancelledAt: null,
  cancellationReason: null,
  lastEmailedAt: null,
  createdAt: '',
};
const plan = {
  id: 'cplan00000000000000000001',
  code: 'starter',
  name: 'Starter',
  description: null,
  priceMinor: 49_900,
  currency: 'INR',
  billingInterval: 'MONTHLY',
  limits: { maxUsers: 3 },
  features: ['GST invoices'],
  isActive: true,
  sortOrder: 1,
  onlineCheckout: false,
};

let server: FakeApi;
beforeEach(() => {
  resetApiStateForTests();
  localStorage.clear();
  server = fakeApi();
  server.on('GET', '/auth/me', {
    status: 200,
    body: {
      user: { id: 'u1', name: 'Ravi Sharma', email: 's@example.com', isPlatformAdmin: true },
      memberships: [
        {
          membershipId: 'm1',
          tenantId: T,
          tenantName: tenant.name,
          role: 'OWNER',
          permissions: ALL,
        },
      ],
    },
  });
  const t = `/tenants/${T}`;
  const ok = (body: unknown) => ({ status: 200, body });
  server.on('GET', t, ok(tenant));
  server.on(
    'GET',
    `${t}/subscription`,
    ok({
      subscription: {
        id: 's',
        status: 'TRIAL',
        provider: 'NONE',
        plan,
        trialEndsAt: '2099-01-01T00:00:00Z',
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
      pendingCheckout: null,
      access: { mode: 'FULL', reason: null, fullAccessUntil: null },
      usage: { vehicles: 1, users: 1 },
      limits: { maxUsers: 3 },
      onlinePaymentsAvailable: false,
    }),
  );
  server.on(
    'GET',
    `${t}/dashboard`,
    ok({
      month: '2026-10',
      jobs: { active: 1, inTransit: 0, deliveredAwaitingInvoice: 1 },
      invoicesThisMonth: { count: 1, totalMinor: 1_475_000 },
      outstanding: { count: 1, amountMinor: 975_000 },
      overdue: { count: 0, amountMinor: 0 },
      receivedThisMonthMinor: 500_000,
      counts: { activeCustomers: 1, activeVehicles: 1 },
      recentJobs: [{ ...job, customer: { name: 'ABC Ltd.' } }],
      recentInvoices: [{ ...invoice, customer: { name: 'ABC Ltd.' } }],
    }),
  );
  server.on('GET', `${t}/customers`, ok(paged([customer])));
  server.on('GET', `${t}/customers/${customer.id}`, ok(customer));
  server.on('GET', `${t}/vehicles`, ok(paged([vehicle])));
  server.on('GET', `${t}/vehicles/${vehicle.id}`, ok(vehicle));
  server.on('GET', `${t}/jobs`, ok(paged([job])));
  server.on('GET', `${t}/jobs/eligible-for-invoice`, ok({ items: [job] }));
  server.on('GET', `${t}/jobs/${job.id}`, ok(job));
  server.on('GET', `${t}/invoices`, ok(paged([{ ...invoice }])));
  server.on('GET', `${t}/invoices/${invoice.id}`, ok(invoice));
  server.on(
    'GET',
    `${t}/invoices/${invoice.id}/email-logs`,
    ok({
      items: [
        {
          id: 'l1',
          recipient: 'a@abc.example',
          subject: 's',
          status: 'SENT',
          attemptCount: 1,
          lastErrorSafe: null,
          sentAt: '',
          createdAt: '2026-10-31T00:00:00Z',
        },
      ],
    }),
  );
  server.on(
    'GET',
    `${t}/payments`,
    ok(
      paged([
        {
          id: 'p1',
          customer: { id: customer.id, name: 'ABC Ltd.' },
          paymentDate: '2026-10-31',
          amountMinor: 500_000,
          method: 'UPI',
          reference: 'UTR1',
          notes: null,
          status: 'RECORDED',
          voidReason: null,
          allocations: [
            {
              invoiceId: invoice.id,
              invoiceNumber: 'INV/26-27/0001',
              allocatedAmountMinor: 500_000,
            },
          ],
          createdAt: '',
        },
      ]),
    ),
  );
  server.on(
    'GET',
    `${t}/reports/receivables`,
    ok({
      asOf: '2026-10-31',
      items: [
        {
          customerId: customer.id,
          customerName: 'ABC Ltd.',
          invoiceCount: 1,
          notDueMinor: 975_000,
          days1to30Minor: 0,
          days31to60Minor: 0,
          days61to90Minor: 0,
          days90PlusMinor: 0,
          totalMinor: 975_000,
        },
      ],
      totals: {
        notDueMinor: 975_000,
        days1to30Minor: 0,
        days31to60Minor: 0,
        days61to90Minor: 0,
        days90PlusMinor: 0,
        totalMinor: 975_000,
      },
    }),
  );
  server.on(
    'GET',
    `${t}/members`,
    ok({
      members: [
        {
          id: 'm1',
          role: 'OWNER',
          createdAt: '2026-10-28T00:00:00Z',
          user: { id: 'u1', name: 'Ravi Sharma', email: 's@example.com' },
        },
        {
          id: 'm2',
          role: 'VIEWER',
          createdAt: '2026-10-29T00:00:00Z',
          user: { id: 'u2', name: 'Asha', email: 'asha@example.com' },
        },
      ],
      invitations: [
        {
          id: 'inv1',
          email: 'new@example.com',
          role: 'VIEWER',
          expiresAt: '2099-01-01T00:00:00Z',
          createdAt: '',
          expired: false,
        },
      ],
    }),
  );
  server.on('GET', '/plans', ok({ items: [plan] }));
  server.on(
    'GET',
    '/platform/tenants',
    ok(
      paged([
        {
          id: T,
          name: tenant.name,
          status: 'ACTIVE',
          city: 'Pune',
          createdAt: '2026-10-28T00:00:00Z',
          memberCount: 2,
          owners: [{ name: 'S', email: 's@example.com' }],
          subscription: {
            status: 'TRIAL',
            plan: { name: 'Starter' },
            trialEndsAt: null,
            currentPeriodEnd: null,
            access: 'FULL',
          },
        },
      ]),
    ),
  );
  server.on(
    'GET',
    `/platform/tenants/${T}`,
    ok({
      ...tenant,
      statusReason: null,
      memberships: [{ role: 'OWNER', createdAt: '', user: { name: 'S', email: 's@example.com' } }],
      subscriptions: [
        {
          id: 's',
          status: 'TRIAL',
          provider: 'NONE',
          plan: { code: 'starter', name: 'Starter' },
          trialEndsAt: null,
          currentPeriodEnd: null,
          createdAt: '2026-10-28T00:00:00Z',
        },
      ],
      _count: { customers: 1, vehicles: 1, jobs: 1, invoices: 1 },
      access: { mode: 'FULL', reason: null },
    }),
  );
  server.on('GET', '/platform/plans', ok({ items: [plan] }));
  server.on('GET', '/platform/subscriptions', ok(paged([])));
  server.on('GET', '/platform/webhook-events', ok(paged([])));
  server.on(
    'GET',
    '/platform/audit-logs',
    ok(
      paged([
        {
          id: 'a1',
          tenantName: tenant.name,
          actorUserId: 'u1',
          action: 'platform.tenant_status_changed',
          entityType: 'Tenant',
          entityId: T,
          metadata: { reason: 'x' },
          createdAt: '2026-10-31T00:00:00Z',
        },
      ]),
    ),
  );
  server.on(
    'GET',
    '/invitations/lookup',
    ok({
      companyName: 'Deccan Roadways Co.',
      email: 's@example.com',
      role: 'VIEWER',
      expired: false,
      accepted: false,
    }),
  );
});
afterEach(() => server.restore());

const base = `/t/${T}`;
const pages: [string, RegExp][] = [
  [`${base}/dashboard`, /Ravi/],
  [`${base}/customers`, /^Customers$/],
  [`${base}/customers/new`, /Create customer/],
  [`${base}/customers/${customer.id}`, /ABC Ltd\./],
  [`${base}/customers/${customer.id}/edit`, /Edit ABC Ltd\./],
  [`${base}/vehicles`, /^Vehicles$/],
  [`${base}/vehicles/new`, /Add vehicle/],
  [`${base}/vehicles/${vehicle.id}`, /MH 12 AB 1234/],
  [`${base}/jobs`, /Transport jobs/],
  [`${base}/jobs/new`, /Create transport job/],
  [`${base}/jobs/${job.id}`, /JOB-0001/],
  [`${base}/jobs/${job.id}/edit`, /Edit JOB-0001/],
  [`${base}/invoices`, /^Invoices$/],
  [`${base}/invoices/new`, /Create invoice/],
  [`${base}/invoices/${invoice.id}`, /INV\/26-27\/0001/],
  [`${base}/payments`, /^Payments$/],
  [`${base}/reports`, /^Reports$/],
  [`${base}/team`, /^Team$/],
  [`${base}/billing`, /Billing & plan/],
  [`${base}/settings`, /Company settings/],
  [`${base}/profile`, /My profile/],
  ['/platform/tenants', /^Companies$/],
  [`/platform/tenants/${T}`, /Deccan Roadways Co\./],
  ['/platform/plans', /^Plans$/],
  ['/platform/subscriptions', /^Subscriptions$/],
  ['/platform/webhooks', /Webhook events/],
  ['/platform/audit', /Audit log/],
  ['/invitations/accept?token=abcdefghijklmnopqrstuvwxyz', /Join Deccan Roadways Co\./],
];

describe('every page renders', () => {
  it.each(pages)('%s', async (path, heading) => {
    const router = createMemoryRouter(routes, { initialEntries: [path] });
    render(
      <AppProviders client={createQueryClient()}>
        <RouterProvider router={router} />
      </AppProviders>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: heading }, { timeout: 4000 }),
    ).toBeInTheDocument();
  });
});
