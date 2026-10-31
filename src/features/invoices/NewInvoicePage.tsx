import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FilePlus2, Route } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BackLink } from '@/components/ui/Detail';
import { SelectField } from '@/components/ui/Field';
import { EmptyState, Notice, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatPaise } from '@/lib/format';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Customer, Invoice, Job, Paged } from '@/types/api';

/** Step 1 of invoicing: bill delivered jobs, or start a manual invoice. Creates a draft. */
export function NewInvoicePage() {
  const { tenant } = useCurrentTenant();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'job' | 'manual'>('job');
  const [selected, setSelected] = useState<string[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const eligible = useTenantQuery<{ items: Job[] }>(
    ['jobs', 'eligible'],
    '/jobs/eligible-for-invoice',
  );
  const customers = useTenantQuery<Paged<Customer>>(
    ['customers'],
    '/customers?status=ACTIVE&pageSize=100&sort=name&order=asc',
    { enabled: mode === 'manual' },
  );
  const create = useTenantMutation<Record<string, unknown>, Invoice>('POST', '/invoices', [
    'invoices',
    'jobs',
  ]);
  const base = `/t/${tenant.id}`;

  const jobs = eligible.data?.items ?? [];
  const selectedCustomer = jobs.find((j) => j.id === selected[0])?.customerId;

  const toggle = (job: Job) => {
    setError(null);
    setSelected((cur) => {
      if (cur.includes(job.id)) return cur.filter((id) => id !== job.id);
      // One invoice = one customer; picking another customer's job starts a new selection.
      const sameCustomer =
        cur.length && jobs.find((j) => j.id === cur[0])?.customerId === job.customerId;
      return sameCustomer ? [...cur, job.id] : [job.id];
    });
  };

  const submit = async () => {
    setError(null);
    try {
      const inv = await create.mutateAsync(
        mode === 'job' ? { jobIds: selected } : { customerId, items: [] },
      );
      navigate(`${base}/invoices/${inv.id}/edit`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (Object.values(err.fieldErrors ?? {})[0]?.[0] ?? err.message)
          : 'Could not create the invoice.',
      );
    }
  };

  return (
    <>
      <BackLink to={`${base}/invoices`} label="All invoices" />
      <PageHeader
        eyebrow="Billing & collections"
        title="Create invoice"
        description="Choose how to start. You'll review every line before issuing."
      />
      <div className="mb-5 grid max-w-225 gap-3 sm:grid-cols-2">
        {[
          {
            key: 'job' as const,
            icon: Route,
            title: 'From transport job',
            text: 'Prefill customer, route, vehicle and charges from delivered jobs.',
          },
          {
            key: 'manual' as const,
            icon: FilePlus2,
            title: 'Manual invoice',
            text: 'For work that is not recorded as a transport job.',
          },
        ].map(({ key, icon: Icon, title, text }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            aria-pressed={mode === key}
            className={cn(
              'rounded-card border bg-white p-4 text-left transition-colors',
              mode === key
                ? 'border-brand ring-3 ring-blue-100'
                : 'border-line hover:border-slate-300',
            )}
          >
            <Icon className="mb-2 size-5 text-brand" aria-hidden />
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-1 text-xs text-muted">{text}</p>
          </button>
        ))}
      </div>

      <Card className="max-w-225">
        {mode === 'job' ? (
          <>
            <CardHeader
              title="Delivered jobs not yet invoiced"
              description="Select one job, or several for the same customer."
            />
            <CardBody className="flex flex-col gap-2">
              {eligible.isPending ? (
                <Skeleton className="h-16 w-full" />
              ) : jobs.length === 0 ? (
                <EmptyState
                  title="No delivered jobs waiting for an invoice"
                  description="Mark a job as delivered first, or create a manual invoice."
                  action={
                    <Link
                      to={`${base}/jobs?status=BOOKED,IN_TRANSIT`}
                      className="text-sm font-semibold text-brand"
                    >
                      See active jobs
                    </Link>
                  }
                />
              ) : (
                jobs.map((j) => {
                  const checked = selected.includes(j.id);
                  const otherCustomer = selectedCustomer && selectedCustomer !== j.customerId;
                  return (
                    <label
                      key={j.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-[13px]',
                        checked ? 'border-brand bg-brand-soft' : 'border-line',
                        otherCustomer && 'opacity-60',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(j)}
                        className="mt-1"
                      />
                      <span className="flex-1">
                        <b>{j.jobNumber}</b> · {j.originCity} → {j.destinationCity}
                        <span className="block text-xs text-muted">
                          {j.customer.name} · Delivered{' '}
                          {j.actualDeliveryDate ? formatDate(j.actualDeliveryDate) : '—'}
                          {j.vehicle ? ` · ${j.vehicle.registrationNumberDisplay}` : ''}
                        </span>
                      </span>
                      <b className="whitespace-nowrap">{formatPaise(j.totalMinor)}</b>
                    </label>
                  );
                })
              )}
            </CardBody>
          </>
        ) : (
          <>
            <CardHeader
              title="Manual invoice"
              description="Pick the customer. You'll add the lines next."
            />
            <CardBody>
              <SelectField
                label="Customer"
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">{customers.isPending ? 'Loading…' : 'Select customer'}</option>
                {customers.data?.items.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </SelectField>
            </CardBody>
          </>
        )}
        <div className="flex flex-col gap-3 border-t border-line px-6 py-4">
          {error && <Notice tone="error">{error}</Notice>}
          <div className="flex justify-end">
            <Button
              variant="primary"
              loading={create.isPending}
              disabled={mode === 'job' ? selected.length === 0 : !customerId}
              onClick={() => void submit()}
            >
              Continue to draft →
            </Button>
          </div>
        </div>
      </Card>
    </>
  );
}
