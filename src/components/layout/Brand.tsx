import { cn } from '@/lib/cn';

/** Brand mark + name. Product name stays configurable in one place. */
export const BRAND_NAME = 'Vaharo';

export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5 text-[19px] font-extrabold', className)}>
      <div
        aria-hidden
        className="grid size-8.5 shrink-0 place-items-center rounded-[11px] bg-gradient-to-br from-brand to-accent font-black text-white"
      >
        V
      </div>
      <span className={cn(compact && 'sr-only')}>{BRAND_NAME}</span>
    </div>
  );
}
