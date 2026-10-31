import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/router';
import { resetApiStateForTests } from '@/lib/api';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import type { MeResponse, Role, Tenant } from '@/types/api';

const ALL_PERMISSIONS = [
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
] as Tenant['myPermissions'];

const VIEWER_PERMISSIONS: Tenant['myPermissions'] = [
  'tenant.read',
  'customers.read',
  'vehicles.read',
  'jobs.read',
  'invoices.read',
  'payments.read',
  'reports.read',
];

function tenant(role: Role = 'OWNER'): Tenant {
  return {
    id: 'ctenant000000000000000001',
    name: 'Patil Transport Co.',
    legalName: null,
    phone: null,
    email: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Pune',
    state: 'Maharashtra',
    postalCode: null,
    country: 'IN',
    gstin: null,
    stateCode: '27',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    status: 'ACTIVE',
    jobNumberPrefix: 'JOB-',
    invoicePrefix: 'INV',
    defaultPaymentTermsDays: 30,
    defaultTaxRateBps: 0,
    defaultSacCode: null,
    invoiceTerms: null,
    paymentInstructions: null,
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
    myRole: role,
    myPermissions: role === 'VIEWER' ? VIEWER_PERMISSIONS : ALL_PERMISSIONS,
  };
}

function me(memberships: MeResponse['memberships'] = []): MeResponse {
  return {
    user: { id: 'u1', name: 'Shubham Patil', email: 'shubham@example.com', isPlatformAdmin: false },
    memberships,
  };
}

function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(
    <AppProviders client={createQueryClient()}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return router;
}

let server: FakeApi;
beforeEach(() => {
  resetApiStateForTests();
  localStorage.clear();
  server = fakeApi();
  server.on('GET', '/health', {
    status: 200,
    body: { status: 'ok', service: 'vaharo-api', time: new Date().toISOString() },
  });
});
afterEach(() => server.restore());

const unauthorized = {
  status: 401,
  body: { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
};

describe('authentication flow', () => {
  it('sends signed-out visitors to sign in', async () => {
    server.on('GET', '/auth/me', unauthorized);
    server.on('POST', '/auth/refresh', {
      status: 401,
      body: { error: { code: 'SESSION_EXPIRED', message: 'x' } },
    });
    const router = renderApp('/t/ctenant000000000000000001/dashboard');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.search).toContain('next=');
  });

  it('validates the sign-in form before calling the API', async () => {
    server.on('GET', '/auth/me', unauthorized);
    server.on('POST', '/auth/refresh', { status: 401 });
    renderApp('/sign-in');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your password')).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === '/auth/login')).toBe(false);
  });

  it('shows the server message for wrong credentials', async () => {
    server.on('GET', '/auth/me', unauthorized);
    server.on('POST', '/auth/refresh', { status: 401 });
    server.on('POST', '/auth/login', {
      status: 401,
      body: { error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } },
    });
    renderApp('/sign-in');
    await userEvent.type(await screen.findByLabelText(/Email/), 'a@b.co');
    await userEvent.type(screen.getByLabelText(/Password/), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
  });

  it('a new user without a company is sent to onboarding after sign-up', async () => {
    server.on('GET', '/auth/me', unauthorized);
    server.on('POST', '/auth/refresh', { status: 401 });
    server.on('POST', '/auth/register', { status: 201, body: me() });
    const router = renderApp('/sign-up');
    await userEvent.type(await screen.findByLabelText(/Full name/), 'Shubham Patil');
    await userEvent.type(screen.getByLabelText(/Work email/), 'shubham@example.com');
    await userEvent.type(screen.getByLabelText(/Password/), 'Str0ng-Passw0rd!');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: /Set up your company/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');
  });

  it('creating a company opens its dashboard', async () => {
    const t = tenant();
    let hasCompany = false;
    server.on('GET', '/auth/me', () => ({
      status: 200,
      body: hasCompany
        ? me([
            {
              membershipId: 'm1',
              tenantId: t.id,
              tenantName: t.name,
              role: 'OWNER',
              permissions: ALL_PERMISSIONS,
            },
          ])
        : me(),
    }));
    server.on('POST', '/tenants', () => {
      hasCompany = true;
      return { status: 201, body: t };
    });
    server.on('GET', `/tenants/${t.id}`, { status: 200, body: t });

    const router = renderApp('/onboarding');
    await userEvent.type(
      await screen.findByLabelText(/Company display name/),
      'Patil Transport Co.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Create company workspace' }));

    expect(await screen.findByRole('heading', { name: /Shubham/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/t/${t.id}/dashboard`);
    const create = server.calls.find((c) => c.method === 'POST' && c.path === '/tenants')!;
    expect(create.body).toMatchObject({ name: 'Patil Transport Co.', gstin: null });
  });
});

describe('workspace shell', () => {
  it('shows a not-found page for a company the user cannot access', async () => {
    server.on('GET', '/auth/me', { status: 200, body: me() });
    server.on('GET', '/tenants/cother0000000000000000001', {
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'Company not found' } },
    });
    renderApp('/t/cother0000000000000000001/dashboard');
    expect(await screen.findByText('Company not found')).toBeInTheDocument();
  });

  it('hides navigation the role cannot use and makes settings read-only for viewers', async () => {
    const t = tenant('VIEWER');
    server.on('GET', '/auth/me', {
      status: 200,
      body: me([
        {
          membershipId: 'm1',
          tenantId: t.id,
          tenantName: t.name,
          role: 'VIEWER',
          permissions: VIEWER_PERMISSIONS,
        },
      ]),
    });
    server.on('GET', `/tenants/${t.id}`, { status: 200, body: t });
    renderApp(`/t/${t.id}/settings`);

    expect(await screen.findByRole('heading', { name: 'Company settings' })).toBeInTheDocument();
    const nav = screen.getAllByRole('navigation', { name: 'Main' })[0]!;
    expect(within(nav).queryByRole('link', { name: /Team/ })).toBeNull();
    expect(within(nav).getByRole('link', { name: /Invoices/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Company display name/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('shows server-side field errors on company settings', async () => {
    const t = tenant('OWNER');
    server.on('GET', '/auth/me', {
      status: 200,
      body: me([
        {
          membershipId: 'm1',
          tenantId: t.id,
          tenantName: t.name,
          role: 'OWNER',
          permissions: ALL_PERMISSIONS,
        },
      ]),
    });
    server.on('GET', `/tenants/${t.id}`, { status: 200, body: t });
    server.on('PATCH', `/tenants/${t.id}`, {
      status: 400,
      body: {
        error: {
          code: 'BAD_REQUEST',
          message: 'Validation failed',
          fieldErrors: { city: ['City is not allowed'] },
        },
      },
    });
    renderApp(`/t/${t.id}/settings`);

    const city = await screen.findByLabelText('City');
    await userEvent.clear(city);
    await userEvent.type(city, 'Nashik');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('City is not allowed')).toBeInTheDocument();
  });

  it('"New company" opens a popup over the current page and switches to the new company', async () => {
    const t = tenant('OWNER');
    const created = {
      ...tenant('OWNER'),
      id: 'ctenant000000000000000002',
      name: 'Sahyadri Logistics',
    };
    server.on('GET', '/auth/me', {
      status: 200,
      body: me([
        {
          membershipId: 'm1',
          tenantId: t.id,
          tenantName: t.name,
          role: 'OWNER',
          permissions: ALL_PERMISSIONS,
        },
      ]),
    });
    server.on('GET', `/tenants/${t.id}`, { status: 200, body: t });
    server.on('POST', '/tenants', { status: 201, body: created });
    server.on('GET', `/tenants/${created.id}`, { status: 200, body: created });
    const router = renderApp(`/t/${t.id}/dashboard`);

    await userEvent.click(await screen.findByRole('button', { name: /New company/ }));

    const dialog = await screen.findByRole('dialog', { name: 'Create a new company' });
    // Still on the same page; the dashboard stays behind the popup.
    expect(router.state.location.pathname).toBe(`/t/${t.id}/dashboard`);
    expect(screen.getByRole('heading', { name: /Shubham/ })).toBeInTheDocument();

    await userEvent.type(
      within(dialog).getByLabelText(/Company display name/),
      'Sahyadri Logistics',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create company' }));

    expect(await screen.findByText(/Sahyadri Logistics created/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/t/${created.id}/dashboard`);
    expect(screen.queryByRole('dialog', { name: 'Create a new company' })).toBeNull();
  });

  it('cancel closes the popup without creating anything', async () => {
    const t = tenant('OWNER');
    server.on('GET', '/auth/me', {
      status: 200,
      body: me([
        {
          membershipId: 'm1',
          tenantId: t.id,
          tenantName: t.name,
          role: 'OWNER',
          permissions: ALL_PERMISSIONS,
        },
      ]),
    });
    server.on('GET', `/tenants/${t.id}`, { status: 200, body: t });
    renderApp(`/t/${t.id}/dashboard`);

    await userEvent.click(await screen.findByRole('button', { name: /New company/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Create a new company' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Create a new company' })).toBeNull();
    expect(server.calls.some((c) => c.method === 'POST' && c.path === '/tenants')).toBe(false);
  });
});
