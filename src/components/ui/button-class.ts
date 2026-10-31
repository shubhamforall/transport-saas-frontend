import { cn } from '@/lib/cn';

export type Variant = 'primary' | 'secondary' | 'dark' | 'danger' | 'ghost';
export type Size = 'sm' | 'md';

export const variants: Record<Variant, string> = {
  primary: 'bg-brand border-brand text-white shadow-primary hover:bg-brand-dark',
  secondary: 'bg-white border-line text-slate-700 hover:bg-slate-50',
  dark: 'bg-navy border-navy text-white hover:bg-ink',
  danger: 'bg-red-600 border-red-600 text-white hover:bg-red-700',
  ghost: 'bg-transparent border-transparent text-brand hover:bg-brand-soft',
};

export const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs',
  md: 'px-4 py-2.5 text-[13px]',
};

/** Same look as Button, for links (navigation should be a link, not a button). */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-[9px] border font-semibold transition-colors',
    'focus-visible:ring-3 focus-visible:ring-blue-200 focus-visible:outline-none',
    variants[variant],
    sizes[size],
    className,
  );
}
