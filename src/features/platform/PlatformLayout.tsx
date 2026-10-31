import { Link, NavLink, Navigate, Outlet } from 'react-router';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { Spinner } from '@/components/ui/Feedback';
import { cn } from '@/lib/cn';
import { useSession } from '@/features/auth/session';

const NAV = [
  { to: 'tenants', label: 'Companies' },
  { to: 'plans', label: 'Plans' },
  { to: 'subscriptions', label: 'Subscriptions' },
  { to: 'webhooks', label: 'Webhook events' },
  { to: 'audit', label: 'Audit log' },
];

/** Super Admin area. Separate from company navigation; only platform admins see it. */
export function PlatformLayout() {
  const { data: session, isPending } = useSession();
  if (isPending) return <Spinner />;
  if (!session?.user.isPlatformAdmin) return <Navigate to="/" replace />;
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-navy text-white">
        <div className="mx-auto flex max-w-310 flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-3">
            <Brand className="text-white" />
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
              <ShieldCheck className="size-3.5" aria-hidden /> Super Admin
            </span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/80 hover:text-white"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> Back to my workspace
          </Link>
        </div>
        <nav
          aria-label="Super Admin"
          className="mx-auto flex max-w-310 gap-1 overflow-x-auto px-4 sm:px-8"
        >
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={`/platform/${n.to}`}
              className={({ isActive }) =>
                cn(
                  'rounded-t-lg px-3.5 py-2 text-[13px] font-semibold whitespace-nowrap',
                  isActive ? 'bg-page text-ink' : 'text-white/75 hover:text-white',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-310 px-4 pt-6 pb-12 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
