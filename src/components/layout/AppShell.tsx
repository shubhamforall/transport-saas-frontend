import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut, Menu, Plus, ShieldCheck, X } from 'lucide-react';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { CreateCompanyModal } from '@/features/tenants/CreateCompanyModal';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { SubscriptionSummary } from '@/types/api';
import { lastTenant, useSession, useSetSession } from '@/features/auth/session';
import { authApi } from '@/features/auth/api';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/roles';
import { Brand } from './Brand';
import { NAV, navLabelFor } from './nav';

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

function UserFooter({ compact }: { compact: boolean }) {
  const { data: session } = useSession();
  const { tenant } = useCurrentTenant();
  const signOut = useSignOut();
  const name = session?.user.name ?? '';
  return (
    <div
      className={cn(
        'mt-auto flex items-center gap-2.5 border-t border-line px-2 pt-4 text-xs',
        compact && 'flex-col',
      )}
    >
      <div
        aria-hidden
        className="grid size-8.5 shrink-0 place-items-center rounded-full bg-blue-100 font-extrabold text-blue-700"
      >
        {initials(name)}
      </div>
      <div className={cn('min-w-0 flex-1', compact && 'sr-only')}>
        <p className="truncate font-bold">{name}</p>
        <p className="mt-0.5 text-subtle">{ROLE_LABELS[tenant.myRole]}</p>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        aria-label="Sign out"
        title="Sign out"
        className="rounded-md p-1.5 text-muted hover:bg-slate-100 hover:text-slate-800"
      >
        <LogOut className="size-4" />
      </button>
    </div>
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

/** Responsive shell: full sidebar on desktop, icon rail on tablet, drawer on phones. */ export function AppShell() {
  const { tenant } = useCurrentTenant();
  const { data: session } = useSession();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const openCreate = () => {
    setDrawerOpen(false);
    setCreateOpen(true);
  };
  const segment = location.pathname.split('/')[3];
  const pageLabel = navLabelFor(segment);

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
        <UserFooter compact />
      </aside>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-7 overflow-y-auto border-r border-line bg-white px-4 py-6 lg:flex">
        <Brand className="px-2.5" />
        <WorkspaceSwitcher onNewCompany={openCreate} />
        <nav aria-label="Main" className="flex flex-col gap-6">
          <SidebarNav compact={false} />
        </nav>
        <div className="mt-auto px-2">
          <PlanPill />
        </div>
        <UserFooter compact={false} />
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
            <UserFooter compact={false} />
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
            <PlanPill className="max-sm:hidden" />
            {session?.user.isPlatformAdmin && (
              <NavLink
                to="/platform"
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-ink max-md:hidden"
              >
                <ShieldCheck className="size-4" aria-hidden /> Super Admin
              </NavLink>
            )}
            {session && (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-1 font-semibold text-brand hover:underline max-md:hidden"
                title="Create another company"
              >
                <Plus className="size-4" aria-hidden /> New company
              </button>
            )}
            <div
              aria-hidden
              className="grid size-8.5 place-items-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700"
            >
              {initials(session?.user.name ?? '')}
            </div>
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
