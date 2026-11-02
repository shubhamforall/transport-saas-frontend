import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { AppProviders } from '@/app/providers';
import { createQueryClient } from '@/app/query-client';
import { routes } from '@/app/router';
import { resetApiStateForTests } from '@/lib/api';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import type { MeResponse, Plan } from '@/types/api';

function plan(code: string, name: string, priceMinor: number, sortOrder: number): Plan {
  return {
    id: `p-${code}`,
    code,
    name,
    description: `${name} plan`,
    priceMinor,
    currency: 'INR',
    billingInterval: 'MONTHLY',
    limits: code === 'business' ? {} : { maxUsers: 3, maxVehicles: 10 },
    features: [],
    isActive: true,
    sortOrder,
    onlineCheckout: false,
  };
}

const PLANS = [
  plan('starter', 'Starter', 49_900, 1),
  plan('growth', 'Growth', 99_900, 2),
  plan('business', 'Business', 1_99_900, 3),
];

const unauthorized = {
  status: 401,
  body: { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
};

function renderAt(path: string) {
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
  server.on('GET', '/plans', { status: 200, body: { items: PLANS } });
  server.on('POST', '/auth/refresh', unauthorized);
});
afterEach(() => server.restore());

describe('public website', () => {
  it('shows the landing page with live plans to signed-out visitors', async () => {
    server.on('GET', '/auth/me', unauthorized);
    renderAt('/');
    expect(
      await screen.findByRole('heading', { level: 1, name: /bookings, trips and gst invoices/i }),
    ).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Growth' })).toBeInTheDocument();
    expect(screen.getByText('₹999.00')).toBeInTheDocument();
    expect(screen.getByText('Unlimited vehicles')).toBeInTheDocument();
    expect(screen.getByText('Most popular')).toBeInTheDocument();
    const header = await screen.findByRole('banner');
    expect(await within(header).findByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    expect(within(header).getByRole('link', { name: 'Start free trial' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it('offers signed-in people a way back to their dashboard', async () => {
    const session: MeResponse = {
      user: { id: 'u1', name: 'Ravi Sharma', email: 'ravi@example.com', isPlatformAdmin: false },
      memberships: [
        {
          tenantId: 'ctenant000000000000000001',
          tenantName: 'Deccan Roadways Co.',
          role: 'OWNER',
        } as MeResponse['memberships'][number],
      ],
    };
    server.on('GET', '/auth/me', { status: 200, body: session });
    renderAt('/pricing');
    const header = await screen.findByRole('banner');
    expect(await within(header).findByRole('link', { name: 'Open dashboard' })).toHaveAttribute(
      'href',
      '/t/ctenant000000000000000001/dashboard',
    );
    expect(within(header).queryByRole('link', { name: 'Sign in' })).toBeNull();
  });

  it('/app still sends signed-out people to sign in', async () => {
    server.on('GET', '/auth/me', unauthorized);
    const router = renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('opens each page from the navigation', async () => {
    server.on('GET', '/auth/me', unauthorized);
    const user = userEvent.setup();
    const router = renderAt('/');
    const nav = (await screen.findAllByRole('navigation', { name: 'Main' }))[0]!;
    await user.click(within(nav).getByRole('link', { name: 'Features' }));
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /how a transport office works/i },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: 'About' }));
    expect(
      await screen.findByRole('heading', { name: 'Why we built Vaharo' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Privacy policy' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Privacy policy' }, { timeout: 5000 }),
    ).toBeVisible();
    expect(router.state.location.pathname).toBe('/privacy');
  });
});

describe('contact form', () => {
  beforeEach(() => server.on('GET', '/auth/me', unauthorized));

  it('checks the fields before sending', async () => {
    const user = userEvent.setup();
    renderAt('/contact');
    await user.click(await screen.findByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Enter your name')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText(/tell us a little more/i)).toBeInTheDocument();
    expect(server.calls.some((c) => c.path === '/contact')).toBe(false);
  });

  it('sends the message and thanks the visitor', async () => {
    server.on('POST', '/contact', { status: 202, body: { received: true } });
    const user = userEvent.setup();
    renderAt('/contact');
    await user.type(await screen.findByLabelText(/your name/i), 'Ravi Sharma');
    await user.type(screen.getByLabelText(/^email/i), 'ravi@example.com');
    await user.selectOptions(screen.getByLabelText(/what can we help with/i), 'pricing');
    await user.type(screen.getByLabelText(/^message/i), 'We run 12 trucks around Pune.');
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Thanks, we got your message')).toBeInTheDocument();
    const call = server.calls.find((c) => c.method === 'POST' && c.path === '/contact')!;
    expect(call.body).toEqual({
      name: 'Ravi Sharma',
      email: 'ravi@example.com',
      topic: 'pricing',
      message: 'We run 12 trucks around Pune.',
    });
    expect(call.headers['X-CSRF-Token']).toBe('csrf-test-token');
  });

  it('shows server errors on the right field', async () => {
    server.on('POST', '/contact', {
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Check the form',
          fieldErrors: { email: ['This email domain is not allowed'] },
        },
      },
    });
    const user = userEvent.setup();
    renderAt('/contact');
    await user.type(await screen.findByLabelText(/your name/i), 'Ravi Sharma');
    await user.type(screen.getByLabelText(/^email/i), 'ravi@example.com');
    await user.type(screen.getByLabelText(/^message/i), 'We run 12 trucks around Pune.');
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('This email domain is not allowed')).toBeInTheDocument();
  });
});
