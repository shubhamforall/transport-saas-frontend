import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Menu, Plus, X } from 'lucide-react';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { CreateCompanyModal } from '@/features/tenants/CreateCompanyModal';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { SubscriptionSummary } from '@/types/api';
import { lastTenant, useSession, useSetSession } from '@/features/auth/session';
import { authApi } from '@/features/auth/api';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/cn';
import { Brand } from './Brand';
import { NAV, navLabelFor } from './nav';
import { ProfileMenu } from './ProfileMenu';

function useSignOut() {
  const qc = useQueryClient();
  const setSession = useSetSession();
  const navigate = useNavigate();
  const toast = useToast();
  return async () => {
    try {
      await authApi.logout();
    } catch {
      // Cookies may already be gone; signing out locally is still correct.
    }
    lastTenant.clear();
    setSession(null);
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
    navigate('/sign-in', { replace: true });
    toast.success('You have been signed out.');
  };
}

function WorkspaceSwitcher({ onNewCompany }: { onNewCompany: () => void }) {
  const { tenant } = useCurrentTenant();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const memberships = session?.memberships ?? [];

  return (
    <div className="mx-1.5 rounded-xl border border-line p-3">
      <label htmlFor="workspace-switcher" className="block text-[11px] font-semibold text-muted">
        Company
      </label>
      <select
        id="workspace-switcher"
        value={tenant.id}
        onChange={(e) => {
          if (e.target.value === '__new') onNewCompany();
          else navigate(`/t/${e.target.value}/dashboard`);
        }}
        className="mt-1 w-full truncate bg-transparent text-[13px] font-bold text-ink outline-none"
      >
        {memberships.map((m) => (
          <option key={m.tenantId} value={m.tenantId}>
            {m.tenantName}
          </option>
        ))}
        {!memberships.some((m) => m.tenantId === tenant.id) && (
          <option value={tenant.id}>{tenant.name}</option>
        )}
        <option value="__new">+ Create another company</option>
      </select>
    </div>
  );
}

function SidebarNav({ compact, onNavigate }: { compact: boolean; onNavigate?: () => void }) {
  const { tenant, can } = useCurrentTenant();
  return (
    <>
      {NAV.map((group) => {
        const items = group.items.filter((i) => !i.permission || can(i.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <p
              className={cn(
                'mb-2 px-3 text-[10px] font-extrabold tracking-[1.2px] text-slate-400 uppercase',
                compact && 'sr-only',
              )}
            >
              {group.label}
            </p>
            <ul className="grid gap-1">
              {items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={`/t/${tenant.id}/${to}`}
                    onClick={onNavigate}
                    title={compact ? label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-[13px] transition-colors',
                        compact && 'justify-center',
                        isActive
                          ? 'bg-brand-soft font-bold text-brand-dark'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                      )
                    }
                  >
                    <Icon className="size-4.5 shrink-0" aria-hidden />
                    <span className={cn(compact && 'sr-only')}>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Current plan in the sidebar corner, linking to Billing. */
function PlanCard({ compact }: { compact: boolean }) {
  const { tenant } = useCurrentTenant();
  const { data } = useTenantQuery<SubscriptionSummary>(['subscription'], '/subscription');
  const sub = data?.subscription;
  if (!sub) return null;
  const readOnly = data.access.mode === 'READ_ONLY';
  const status = readOnly
    ? 'Read-only · choose a plan'
    : sub.status === 'TRIAL'
      ? `Free trial${sub.trialEndsAt ? ` · ends ${shortDate(sub.trialEndsAt)}` : ''}`
      : sub.status === 'PAST_DUE'
        ? 'Payment due'
        : sub.status === 'PENDING'
          ? 'Waiting for payment'
          : sub.cancelAtPeriodEnd && sub.currentPeriodEnd
            ? `Ends ${shortDate(sub.currentPeriodEnd)}`
            : 'Active';
  const tone = readOnly
    ? 'border-red-200 bg-red-50 text-red-700'
    : sub.status === 'ACTIVE'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-blue-200 bg-blue-50 text-blue-700';

  if (compact) {
    return (
      <NavLink
        to={`/t/${tenant.id}/billing`}
        title={`${sub.plan.name} plan · ${status}`}
        className={cn(
          'mt-auto grid h-9 place-items-center rounded-lg border text-[10px] font-extrabold',
          tone,
        )}
      >
        <CreditCard className="size-4" aria-hidden />
        <span className="sr-only">
          {sub.plan.name} plan, {status}
        </span>
      </NavLink>
    );
  }
  return (
    <NavLink
      to={`/t/${tenant.id}/billing`}
      className="mt-auto block rounded-xl border border-line p-3 transition-colors hover:border-blue-200 hover:bg-slate-50"
    >
      <p className="text-[11px] font-semibold text-muted">Current plan</p>
      <p className="mt-0.5 text-[15px] font-bold text-ink">{sub.plan.name}</p>
      <span
        className={cn(
          'mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold',
          tone,
        )}
      >
        <span aria-hidden>●</span> {status}
      </span>
      <p className="mt-2 text-[11px] font-semibold text-brand">View plans →</p>
    </NavLink>
  );
}

/** Plan / subscription status pill, linking to Billing. */
function PlanPill({ className }: { className?: string }) {
  const { tenant } = useCurrentTenant();
  const { data } = useTenantQuery<SubscriptionSummary>(['subscription'], '/subscription');
  const sub = data?.subscription;
  if (!sub) return null;
  const readOnly = data.access.mode === 'READ_ONLY';
  const label = readOnly
    ? 'Read-only'
    : sub.status === 'TRIAL'
      ? `Trial${sub.trialEndsAt ? ` until ${new Date(sub.trialEndsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}`
      : `${sub.plan.name} plan`;
  return (
    <NavLink
      to={`/t/${tenant.id}/billing`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap',
        readOnly
          ? 'border-red-200 bg-red-50 text-red-700'
          : sub.status === 'TRIAL' || sub.status === 'PAST_DUE'
            ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
        className,
      )}
    >
      <span aria-hidden>●</span> {label}
    </NavLink>
  );
}

/** Shown on every page while the subscription is read-only. */
function ReadOnlyBanner() {
  const { tenant } = useCurrentTenant();
  const { data } = useTenantQuery<SubscriptionSummary>(['subscription'], '/subscription');
  if (data?.access.mode !== 'READ_ONLY') return null;
  return (
    <div
      role="status"
      className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-center text-xs text-red-800 sm:px-8"
    >
      {data.access.reason} Your data is safe and can be viewed and exported.{' '}
      <NavLink to={`/t/${tenant.id}/billing`} className="font-bold underline">
        Choose a plan
      </NavLink>{' '}
      to make changes again.
    </div>
  );
}

/** Responsive shell: full sidebar on desktop, icon rail on tablet, drawer on phones. */
export function AppShell() {
  const { tenant } = useCurrentTenant();
  const signOut = useSignOut();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = () => {
    setDrawerOpen(false);
    setCreateOpen(true);
  };
  const segment = location.pathname.split('/')[3];
  const pageLabel = segment === 'profile' ? 'My profile' : navLabelFor(segment);

  useEffect(() => {
    document.title = `${pageLabel} · ${tenant.name} · Vaharo`;
  }, [pageLabel, tenant.name]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <div className="min-h-screen sm:grid sm:grid-cols-[76px_1fr] lg:grid-cols-[246px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-brand focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Tablet icon rail */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-7 border-r border-line bg-white px-2.5 py-5 sm:flex lg:hidden">
        <Brand compact className="justify-center" />
        <nav aria-label="Main" className="flex flex-col gap-6">
          <SidebarNav compact />
        </nav>
        <PlanCard compact />
      </aside>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-7 overflow-y-auto border-r border-line bg-white px-4 py-6 lg:flex">
        <Brand className="px-2.5" />
        <WorkspaceSwitcher onNewCompany={openCreate} />
        <nav aria-label="Main" className="flex flex-col gap-6">
          <SidebarNav compact={false} />
        </nav>
        <PlanCard compact={false} />
      </aside>

      {/* Phone drawer */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-white px-4 py-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Brand className="px-2" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-muted hover:bg-slate-100"
              >
                <X className="size-5" />
              </button>
            </div>
            <WorkspaceSwitcher onNewCompany={openCreate} />
            <nav aria-label="Main" className="flex flex-col gap-6">
              <SidebarNav compact={false} onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <PlanCard compact={false} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14.5 items-center justify-between gap-3 border-b border-line bg-white px-4 sm:h-17.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="-ml-1.5 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 sm:hidden"
            >
              <Menu className="size-5" />
            </button>
            <p className="truncate text-[13px] text-muted">
              <span className="max-sm:hidden lg:hidden">{tenant.name}</span>
              <span className="hidden lg:inline">Workspace</span>
              <span className="mx-2 text-slate-300 max-sm:hidden">/</span>
              <b className="text-ink">{pageLabel}</b>
            </p>
          </div>
          <div className="flex items-center gap-4 text-[13px]">
            {/* The sidebar shows the plan on desktop; smaller screens get the pill here. */}
            <PlanPill className="max-sm:hidden lg:hidden" />
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 font-semibold text-brand hover:underline max-md:hidden"
              title="Create another company"
            >
              <Plus className="size-4" aria-hidden /> New company
            </button>
            <ProfileMenu onNewCompany={openCreate} onSignOut={() => void signOut()} />
          </div>
        </header>
        <ReadOnlyBanner />
        <main id="main" className="mx-auto max-w-310 px-3.5 pt-6 pb-12 sm:px-8 sm:pt-8">
          <Outlet />
        </main>
        <CreateCompanyModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    </div>
  );
}
