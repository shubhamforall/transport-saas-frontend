import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/router';
import { resetApiStateForTests } from '@/lib/api';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import type { Permission, Role, Tenant } from '@/types/api';

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
const VIEWER: Permission[] = [
  'tenant.read',
  'customers.read',
  'vehicles.read',
  'jobs.read',
  'invoices.read',
  'payments.read',
  'reports.read',
];
const T = 'ctenant000000000000000001';

function tenant(role: Role): Tenant {
  return {
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
    gstin: '27ABCDE1234F1Z5',
    stateCode: '27',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    status: 'ACTIVE',
    jobNumberPrefix: 'JOB-',
    invoicePrefix: 'INV',
    defaultPaymentTermsDays: 30,
    defaultTaxRateBps: 1800,
    defaultSacCode: '996511',
    invoiceTerms: null,
    paymentInstructions: null,
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
    myRole: role,
    myPermissions: role === 'VIEWER' ? VIEWER : ALL,
  };
}

let server: FakeApi;
function signedInAs(role: Role) {
  server.on('GET', '/auth/me', {
    status: 200,
    body: {
      user: { id: 'u1', name: 'Ravi Sharma', email: 's@example.com', isPlatformAdmin: false },
      memberships: [
        {
          membershipId: 'm1',
          tenantId: T,
          tenantName: 'Deccan Roadways Co.',
          role,
          permissions: role === 'VIEWER' ? VIEWER : ALL,
        },
      ],
    },
  });
  server.on('GET', `/tenants/${T}`, { status: 200, body: tenant(role) });
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders client={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

const empty = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 1 };

beforeEach(() => {
  resetApiStateForTests();
  localStorage.clear();
  server = fakeApi();
});
afterEach(() => server.restore());

describe('customers', () => {
  it('creates a customer and sends clean data to the API', async () => {
    signedInAs('OWNER');
    server.on('GET', `/tenants/${T}/customers?status=ACTIVE&pageSize=100&sort=name&order=asc`, {
      status: 200,
      body: empty,
    });
    let sent: Record<string, unknown> | undefined;
    server.on('POST', `/tenants/${T}/customers`, (init) => {
      sent = JSON.parse(String(init.body));
      return {
        status: 201,
        body: {
          id: 'ccust00000000000000000001',
          name: 'ABC Ltd.',
          status: 'ACTIVE',
          customerType: 'BUSINESS',
        },
      };
    });
    server.on('GET', `/tenants/${T}/customers/ccust00000000000000000001`, {
      status: 200,
      body: {
        id: 'ccust00000000000000000001',
        name: 'ABC Ltd.',
        status: 'ACTIVE',
        customerType: 'BUSINESS',
        jobCount: 0,
        invoiceCount: 0,
        paymentTermsDays: null,
      },
    });
    const router = renderAt(`/t/${T}/customers/new`);

    await userEvent.type(await screen.findByLabelText(/Customer \/ business name/), 'ABC Ltd.');
    await userEvent.type(screen.getByLabelText('GSTIN'), '29abcde1234f1z5');
    await userEvent.selectOptions(screen.getByLabelText('State'), '27');
    await userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    // Client-side check: GSTIN state (29) must match the chosen state (27).
    expect(await screen.findByText('GSTIN does not match the selected state')).toBeInTheDocument();
    expect(sent).toBeUndefined();

    await userEvent.clear(screen.getByLabelText('GSTIN'));
    await userEvent.type(screen.getByLabelText('GSTIN'), '27abcde1234f1z5');
    await userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/t/${T}/customers/ccust00000000000000000001`),
    );
    expect(sent).toMatchObject({
      name: 'ABC Ltd.',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      state: 'Maharashtra',
      email: null,
    });
  });

  it('viewers see the list without create buttons', async () => {
    signedInAs('VIEWER');
    server.on('GET', `/tenants/${T}/customers`, {
      status: 200,
      body: {
        ...empty,
        total: 1,
        items: [
          {
            id: 'c1',
            name: 'ABC Ltd.',
            status: 'ACTIVE',
            phone: null,
            email: null,
            city: 'Pune',
            gstin: null,
          },
        ],
      },
    });
    renderAt(`/t/${T}/customers`);
    expect(await screen.findByText('ABC Ltd.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Create customer/ })).toBeNull();
  });
});

describe('invoices', () => {
  it('draft editor shows a live preview and issues the invoice after confirmation', async () => {
    signedInAs('OWNER');
    const id = 'cinv000000000000000000001';
    const draft = {
      id,
      invoiceNumber: null,
      status: 'DRAFT',
      displayStatus: 'DRAFT',
      customerId: 'c1',
      customer: { id: 'c1', name: 'ABC Ltd.', email: null },
      invoiceDate: '2026-10-31',
      dueDate: '2026-11-30',
      taxType: 'INTRA_STATE',
      placeOfSupplyStateCode: '27',
      billTo: { name: 'ABC Ltd.' },
      from: { name: 'Deccan Roadways Co.', stateCode: '27' },
      currency: 'INR',
      subtotalMinor: 0,
      discountMinor: 0,
      taxableMinor: 0,
      cgstMinor: 0,
      sgstMinor: 0,
      igstMinor: 0,
      taxTotalMinor: 0,
      grandTotalMinor: 0,
      amountPaidMinor: 0,
      balanceMinor: 0,
      notes: null,
      terms: null,
      items: [],
      jobs: [],
      payments: [],
      issuedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      lastEmailedAt: null,
      createdAt: '2026-10-31T00:00:00Z',
    };
    let patched: Record<string, unknown> | undefined;
    let issued = false;
    server.on('GET', `/tenants/${T}/invoices/${id}`, () => ({
      status: 200,
      body: issued
        ? { ...draft, status: 'ISSUED', displayStatus: 'ISSUED', invoiceNumber: 'INV/26-27/0001' }
        : draft,
    }));
    server.on('PATCH', `/tenants/${T}/invoices/${id}`, (init) => {
      patched = JSON.parse(String(init.body));
      return { status: 200, body: draft };
    });
    server.on('POST', `/tenants/${T}/invoices/${id}/issue`, () => {
      issued = true;
      return { status: 200, body: { ...draft, status: 'ISSUED', invoiceNumber: 'INV/26-27/0001' } };
    });
    server.on('GET', `/tenants/${T}/invoices/${id}/email-logs`, {
      status: 200,
      body: { items: [] },
    });
    const router = renderAt(`/t/${T}/invoices/${id}/edit`);

    await userEvent.type(
      await screen.findByLabelText('Line 1 description'),
      'Freight Mumbai to Pune',
    );
    await userEvent.type(screen.getByLabelText('Rate (₹)'), '12000');
    // 18% split into CGST 9% + SGST 9% on ₹12,000 = ₹14,160 total
    const preview = screen.getByText('Live preview').closest('div')!.parentElement!;
    const totalRow = (await within(preview).findByText('Total due')).parentElement!;
    await waitFor(() => expect(totalRow).toHaveTextContent('₹14,160.00'));

    await userEvent.click(screen.getByRole('button', { name: /Issue invoice →/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Issue this invoice?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Issue invoice' }));

    await waitFor(() => expect(router.state.location.pathname).toBe(`/t/${T}/invoices/${id}`));
    expect(patched).toMatchObject({
      taxType: 'INTRA_STATE',
      items: [
        {
          description: 'Freight Mumbai to Pune',
          quantityMilli: 1000,
          unitPriceMinor: 1_200_000,
          taxRateBps: 1800,
          sacCode: '996511',
        },
      ],
    });
  });
});

describe('subscription', () => {
  it('shows a read-only banner when the subscription lapsed', async () => {
    signedInAs('OWNER');
    server.on('GET', `/tenants/${T}/dashboard`, { status: 200, body: null });
    server.on('GET', `/tenants/${T}/subscription`, {
      status: 200,
      body: {
        subscription: {
          id: 's1',
          status: 'TRIAL',
          provider: 'NONE',
          plan: { name: 'Starter' },
          trialEndsAt: '2026-10-01T00:00:00Z',
          currentPeriodStart: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        },
        pendingCheckout: null,
        access: { mode: 'READ_ONLY', reason: 'Your free trial has ended.', fullAccessUntil: null },
        usage: { vehicles: 0, users: 1 },
        limits: {},
        onlinePaymentsAvailable: false,
      },
    });
    renderAt(`/t/${T}/dashboard`);
    const banner = await screen.findByText(/Your free trial has ended\./);
    expect(banner).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Choose a plan|Read-only/ }).length).toBeGreaterThan(
      0,
    );
  });

  it('the Super Admin area is not available to normal users', async () => {
    signedInAs('OWNER');
    server.on('GET', `/tenants/${T}/dashboard`, { status: 200, body: null });
    localStorage.setItem('vaharo.lastTenantId', T);
    const router = renderAt('/platform/tenants');
    await waitFor(() => expect(router.state.location.pathname).not.toBe('/platform/tenants'));
  });
});

describe('account menu and plan card', () => {
  const trial = {
    subscription: {
      id: 's1',
      status: 'TRIAL',
      provider: 'NONE',
      plan: { name: 'Growth' },
      trialEndsAt: '2099-11-30T00:00:00Z',
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    pendingCheckout: null,
    access: { mode: 'FULL', reason: null, fullAccessUntil: null },
    usage: { vehicles: 0, users: 1 },
    limits: {},
    onlinePaymentsAvailable: false,
  };

  it('the avatar opens a menu with name, email and account actions; sign out works', async () => {
    signedInAs('OWNER');
    server.on('GET', `/tenants/${T}/dashboard`, { status: 200, body: null });
    server.on('GET', `/tenants/${T}/subscription`, { status: 200, body: trial });
    server.on('POST', '/auth/logout', { status: 204 });
    const router = renderAt(`/t/${T}/dashboard`);

    const button = await screen.findByRole('button', { name: /Account menu for Ravi Sharma/ });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(button);
    const menu = screen.getByRole('menu');
    expect(within(menu).getByText('Ravi Sharma')).toBeInTheDocument();
    expect(within(menu).getByText('s@example.com')).toBeInTheDocument();
    for (const name of ['My profile', 'Change password', 'Billing & plan', 'Sign out']) {
      expect(within(menu).getByRole('menuitem', { name })).toBeInTheDocument();
    }
    expect(within(menu).queryByRole('menuitem', { name: 'Super Admin' })).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await userEvent.click(button);
    await userEvent.click(screen.getByRole('menuitem', { name: 'My profile' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'My profile' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/t/${T}/profile`);

    await userEvent.click(screen.getByRole('button', { name: /Account menu/ }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === '/auth/logout')).toBe(true);
  });

  it('the sidebar corner shows the current plan', async () => {
    signedInAs('OWNER');
    server.on('GET', `/tenants/${T}/dashboard`, { status: 200, body: null });
    server.on('GET', `/tenants/${T}/subscription`, { status: 200, body: trial });
    renderAt(`/t/${T}/dashboard`);
    const card = await screen.findByRole('link', { name: /Current plan\s*Growth/ });
    expect(card).toHaveAttribute('href', `/t/${T}/billing`);
    expect(card).toHaveTextContent('Free trial · ends 30 Nov');
  });

  it('profile page saves the name and changes the password', async () => {
    signedInAs('OWNER');
    server.on('GET', `/tenants/${T}/subscription`, { status: 200, body: trial });
    server.on('PATCH', '/auth/me', (init) => ({
      status: 200,
      body: {
        user: {
          id: 'u1',
          name: (JSON.parse(init.body as string) as { name: string }).name,
          email: 's@example.com',
          isPlatformAdmin: false,
        },
        memberships: [],
      },
    }));
    server.on('POST', '/auth/change-password', {
      status: 400,
      body: {
        error: {
          code: 'WRONG_PASSWORD',
          message: 'Your current password is not correct.',
          fieldErrors: { currentPassword: ['Current password is not correct'] },
        },
      },
    });
    renderAt(`/t/${T}/profile`);
    const name = await screen.findByLabelText(/Full name/);
    await userEvent.clear(name);
    await userEvent.type(name, 'Ravi K Sharma');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Your details were saved.')).toBeInTheDocument();
    expect(server.calls.find((c) => c.method === 'PATCH')?.body).toEqual({
      name: 'Ravi K Sharma',
    });

    await userEvent.type(screen.getByLabelText(/Current password/), 'wrong-one');
    await userEvent.type(screen.getByLabelText(/^New password/), 'Brand-New-Pass1');
    await userEvent.type(screen.getByLabelText(/Confirm new password/), 'Different-Pass1');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === '/auth/change-password')).toBe(false);

    await userEvent.clear(screen.getByLabelText(/Confirm new password/));
    await userEvent.type(screen.getByLabelText(/Confirm new password/), 'Brand-New-Pass1');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Current password is not correct')).toBeInTheDocument();
  });
});
