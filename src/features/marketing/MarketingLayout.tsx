import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { Menu, X } from 'lucide-react';
import { Brand, BRAND_NAME } from '@/components/layout/Brand';
import { buttonClass } from '@/components/ui/button-class';
import { cn } from '@/lib/cn';
import { homePathFor, useSession } from '@/features/auth/session';

const NAV = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/features', label: 'Features' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/contact', label: 'Contact' },
] as const;

/** Sign-in buttons, or a way back into the app for people already signed in. */
function AccountActions({ stacked = false }: { stacked?: boolean }) {
  const { data: session, isPending } = useSession();
  if (isPending) return <div className={cn(stacked ? 'h-24' : 'h-9 w-48')} aria-hidden />;
  const wrap = cn('flex gap-2', stacked && 'flex-col');
  if (session) {
    return (
      <div className={wrap}>
        <Link to={homePathFor(session)} className={buttonClass('primary')}>
          Open dashboard
        </Link>
      </div>
    );
  }
  return (
    <div className={wrap}>
      <Link to="/sign-in" className={buttonClass(stacked ? 'secondary' : 'ghost')}>
        Sign in
      </Link>
      <Link to="/sign-up" className={buttonClass('primary')}>
        Start free trial
      </Link>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);
  // Close the mobile menu after navigating.
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors',
      isActive ? 'text-brand' : 'text-slate-600 hover:text-ink',
    );

  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" aria-label={`${BRAND_NAME} home`}>
          <Brand />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block">
          <AccountActions />
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-line bg-white px-4 pt-2 pb-5 md:hidden">
          <nav aria-label="Main" className="flex flex-col">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'} className={linkClass}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-3">
            <AccountActions stacked />
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  const columns = [
    {
      title: 'Product',
      links: [
        { to: '/features', label: 'Features' },
        { to: '/pricing', label: 'Pricing' },
        { to: '/sign-up', label: 'Start free trial' },
        { to: '/sign-in', label: 'Sign in' },
      ],
    },
    {
      title: 'Company',
      links: [
        { to: '/about', label: 'About us' },
        { to: '/contact', label: 'Contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { to: '/privacy', label: 'Privacy policy' },
        { to: '/terms', label: 'Terms of service' },
      ],
    },
  ];
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Brand />
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-muted">
            Bookings, trips, GST invoices and payments for goods-transport businesses in India, in
            one place.
          </p>
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">{c.title}</p>
            <ul className="mt-3 flex flex-col gap-2">
              {c.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-[13px] text-slate-600 hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-subtle sm:px-6">
          © {new Date().getFullYear()} {BRAND_NAME}. Made in India.
        </p>
      </div>
    </footer>
  );
}

/** Public website shell: header, page, footer. */
export function MarketingLayout() {
  const { pathname, hash } = useLocation();

  // New page starts at the top, unless the link points at a section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.();
    else window.scrollTo?.(0, 0);
  }, [pathname, hash]);

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
