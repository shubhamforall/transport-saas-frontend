import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

/** Label/value list for detail pages. Empty values show a dash. */
export function DetailList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-[minmax(120px,auto)_1fr]">
      {items.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="font-medium break-words whitespace-pre-line max-sm:-mt-2">
            {value === null || value === undefined || value === '' ? '—' : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink"
    >
      <ArrowLeft className="size-3.5" aria-hidden /> {label}
    </Link>
  );
}

/** Stat tile for dashboards. */
export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <p className="text-[11px] font-semibold text-muted">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-subtle">{hint}</p>}
    </div>
  );
}
