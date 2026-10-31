import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CreditCard, KeyRound, LogOut, Plus, ShieldCheck, UserRound } from 'lucide-react';
import { useSession } from '@/features/auth/session';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/roles';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8.5 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-slate-700 ' +
  'outline-none hover:bg-slate-50 hover:text-ink focus-visible:bg-slate-100';

interface MenuLinkProps {
  to: string;
  icon: ReactNode;
  children: ReactNode;
  onSelect: () => void;
}

function MenuLink({ to, icon, children, onSelect }: MenuLinkProps) {
  return (
    <Link role="menuitem" to={to} className={itemClass} onClick={onSelect}>
      {icon}
      {children}
    </Link>
  );
}

interface ProfileMenuProps {
  onNewCompany: () => void;
  onSignOut: () => void;
}

/** Avatar button in the top bar; opens the account menu. */
export function ProfileMenu({ onNewCompany, onSignOut }: ProfileMenuProps) {
  const { data: session } = useSession();
  const { tenant, can } = useCurrentTenant();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const items = () =>
      Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    items()[0]?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      list[next]?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!session) return null;
  const { user } = session;
  const base = `/t/${tenant.id}`;
  const icon = (Icon: typeof UserRound) => <Icon className="size-4 text-slate-500" aria-hidden />;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${user.name}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'rounded-full outline-none focus-visible:ring-3 focus-visible:ring-blue-200',
          open && 'ring-3 ring-blue-100',
        )}
      >
        <Avatar name={user.name} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute top-full right-0 z-40 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-white p-1.5 shadow-xl"
        >
          <div className="flex items-center gap-3 px-3 pt-2.5 pb-3">
            <Avatar name={user.name} className="size-10 text-sm" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-ink">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
              <p className="mt-0.5 truncate text-[11px] text-subtle">
                {ROLE_LABELS[tenant.myRole]} · {tenant.name}
              </p>
            </div>
          </div>
          <div className="my-1 border-t border-line" />
          <MenuLink onSelect={close} to={`${base}/profile`} icon={icon(UserRound)}>
            My profile
          </MenuLink>
          <MenuLink onSelect={close} to={`${base}/profile#password`} icon={icon(KeyRound)}>
            Change password
          </MenuLink>
          {can('tenant.read') && (
            <MenuLink onSelect={close} to={`${base}/billing`} icon={icon(CreditCard)}>
              Billing &amp; plan
            </MenuLink>
          )}
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onNewCompany();
            }}
          >
            {icon(Plus)}
            Create another company
          </button>
          {user.isPlatformAdmin && (
            <MenuLink onSelect={close} to="/platform" icon={icon(ShieldCheck)}>
              Super Admin
            </MenuLink>
          )}
          <div className="my-1 border-t border-line" />
          <button
            type="button"
            role="menuitem"
            className={cn(itemClass, 'text-red-700 hover:bg-red-50 hover:text-red-800')}
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
