import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'green' | 'blue' | 'amber' | 'red' | 'slate';

const tones: Record<BadgeTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-orange-50 text-orange-700 border-orange-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

export function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
