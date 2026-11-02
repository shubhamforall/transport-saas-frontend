import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, ChevronDown } from 'lucide-react';
import { buttonClass } from '@/components/ui/button-class';
import { Skeleton } from '@/components/ui/Feedback';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatPaise } from '@/lib/format';
import type { Plan } from '@/types/api';

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto max-w-6xl px-4 sm:px-6', className)}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-bold tracking-[0.14em] text-brand uppercase">{children}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  center = true,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={cn('max-w-2xl', center && 'mx-auto text-center')}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-3 text-[15px] leading-relaxed text-pretty text-muted">{description}</p>
      )}
    </div>
  );
}

/** Top of an inner page (Features, Pricing, About, ...). */
export function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <section className="border-b border-line bg-gradient-to-b from-brand-soft/70 to-white">
      <Container className="py-14 text-center sm:py-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-balance sm:text-[42px] sm:leading-[1.1]">
          {title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-pretty text-muted">
          {description}
        </p>
      </Container>
    </section>
  );
}

function limitText(n: number | undefined, noun: string) {
  return n === undefined ? `Unlimited ${noun}` : `Up to ${n} ${noun}`;
}

/** Live plan list from the API, so prices edited by the Super Admin show here too. */
export function PlanCards() {
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api<{ items: Plan[] }>('/plans') });

  if (plans.isPending) {
    return (
      <div className="grid gap-5 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-96 rounded-card" />
        ))}
      </div>
    );
  }
  const items = plans.data?.items ?? [];
  if (plans.isError || items.length === 0) {
    return (
      <div className="rounded-card border border-line bg-white p-8 text-center">
        <p className="font-bold">Plans are being updated</p>
        <p className="mt-1 text-sm text-muted">
          <Link to="/contact" className="font-semibold text-brand hover:underline">
            Contact us
          </Link>{' '}
          for current prices, or start a free trial now.
        </p>
      </div>
    );
  }

  // Highlight the middle plan when there are three or more.
  const featured = items.length >= 3 ? items[1]!.code : null;

  return (
    <div
      className={cn(
        'grid gap-5',
        items.length === 1
          ? 'mx-auto max-w-sm'
          : items.length === 2
            ? 'md:grid-cols-2'
            : 'md:grid-cols-3',
      )}
    >
      {items.map((p) => {
        const isFeatured = p.code === featured;
        return (
          <article
            key={p.id}
            className={cn(
              'relative flex flex-col rounded-card border bg-white p-6',
              isFeatured
                ? 'border-brand shadow-lg ring-3 shadow-blue-100 ring-blue-50'
                : 'border-line',
            )}
          >
            {isFeatured && (
              <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-bold">{p.name}</h3>
            {p.description && (
              <p className="mt-1 min-h-10 text-[13px] text-muted">{p.description}</p>
            )}
            <p className="mt-4 text-3xl font-extrabold tracking-tight">
              {formatPaise(p.priceMinor)}
              <span className="text-sm font-medium text-muted">
                {' '}
                / {p.billingInterval === 'MONTHLY' ? 'month' : 'year'}
              </span>
            </p>
            <p className="mt-1 text-xs text-subtle">Plus GST, if applicable</p>
            <ul className="mt-5 flex flex-1 flex-col gap-2.5 text-[13px]">
              {[
                limitText(p.limits.maxUsers, 'team members'),
                limitText(p.limits.maxVehicles, 'vehicles'),
                ...p.features,
              ].map((f) => (
                <li key={f} className="flex gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              to="/sign-up"
              className={buttonClass(isFeatured ? 'primary' : 'secondary', 'md', 'mt-6 w-full')}
            >
              Start free trial
            </Link>
          </article>
        );
      })}
    </div>
  );
}

export interface FaqItem {
  q: string;
  a: ReactNode;
}

export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-line rounded-card border border-line bg-white">
      {items.map((item) => (
        <details key={item.q} className="group px-5 py-4 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-2.5 text-sm leading-relaxed text-muted">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/** Closing call to action used at the bottom of most pages. */
export function CtaBand({
  title = 'Run your transport business from one screen',
  description = 'Set up your company in a few minutes. No card needed for the free trial.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="py-16 sm:py-20">
      <Container>
        <div className="relative overflow-hidden rounded-[22px] bg-navy px-6 py-12 text-center text-white sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand/40 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-10 size-72 rounded-full bg-accent/25 blur-3xl"
          />
          <h2 className="relative text-2xl font-extrabold tracking-tight text-balance sm:text-3xl">
            {title}
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-[15px] text-white/75">{description}</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/sign-up" className={buttonClass('primary', 'md', 'px-6 py-3 text-sm')}>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-[9px] border border-white/25 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
