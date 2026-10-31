import type { ReactNode } from 'react';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span>{label}…</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {icon && (
        <div className="mb-3 grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
          {icon}
        </div>
      )}
      <p className="text-sm font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

type NoticeTone = 'info' | 'error';

export function Notice({ tone = 'info', children }: { tone?: NoticeTone; children: ReactNode }) {
  const Icon = tone === 'error' ? AlertTriangle : Info;
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex gap-2.5 rounded-[9px] border px-3.5 py-3 text-xs leading-relaxed',
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-blue-200 bg-blue-50 text-blue-800',
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
