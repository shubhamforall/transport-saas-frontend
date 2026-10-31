import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Archive, ArchiveRestore, Pencil, Route } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BackLink, DetailList } from '@/components/ui/Detail';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast-context';
import { ApiError } from '@/lib/api';
import { stateName } from '@/lib/indian-states';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Customer } from '@/types/api';

export function CustomerDetailPage() {
  const { customerId = '' } = useParams();
  const { tenant, can } = useCurrentTenant();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const {
    data: c,
    isPending,
    error,
  } = useTenantQuery<Customer>(['customers', customerId], `/customers/${customerId}`);
  const archived = c?.status === 'ARCHIVED';
  const toggle = useTenantMutation<void, Customer>(
    'POST',
    `/customers/${customerId}/${archived ? 'restore' : 'archive'}`,
    ['customers'],
  );
  const base = `/t/${tenant.id}`;

  if (isPending) return <Spinner label="Loading customer" />;
  if (!c) {
    return (
      <EmptyState
        title={
          error instanceof ApiError && error.status === 404
            ? 'Customer not found'
            : 'Could not load customer'
        }
        action={
          <Link to={`${base}/customers`} className="text-sm font-semibold text-brand">
            All customers
          </Link>
        }
      />
    );
  }

  const address = [
    c.addressLine1,
    c.addressLine2,
    [c.city, stateName(c.stateCode) ?? c.state, c.postalCode].filter(Boolean).join(', '),
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <>
      <BackLink to={`${base}/customers`} label="All customers" />
      <PageHeader
        eyebrow={c.customerType === 'BUSINESS' ? 'Business customer' : 'Individual customer'}
        title={c.name}
        description={<StatusBadge status={c.status} />}
        action={
          can('customers.write') && (
            <div className="flex flex-wrap gap-2">
              {!archived && can('jobs.write') && (
                <Link
                  to={`${base}/jobs/new?customerId=${c.id}`}
                  className="inline-flex items-center gap-2 rounded-[9px] border border-line bg-white px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-50"
                >
                  <Route className="size-4" aria-hidden /> New job
                </Link>
              )}
              <Link
                to={`${base}/customers/${c.id}/edit`}
                className="inline-flex items-center gap-2 rounded-[9px] border border-line bg-white px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-50"
              >
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
              <Button onClick={() => setConfirm(true)}>
                {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                {archived ? 'Restore' : 'Archive'}
              </Button>
            </div>
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
        <Card>
          <CardHeader title="Details" />
          <CardBody>
            <DetailList
              items={[
                ['Contact person', c.contactPerson],
                ['Phone', c.phone],
                ['Billing email', c.email],
                ['GSTIN', c.gstin],
                ['Billing address', address],
                [
                  'Payment terms',
                  c.paymentTermsDays === null
                    ? `Company default (${tenant.defaultPaymentTermsDays} days)`
                    : `${c.paymentTermsDays} days`,
                ],
                ['Notes', c.notes],
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Activity" />
          <CardBody className="flex flex-col gap-3 text-[13px]">
            <Link
              to={`${base}/jobs?customerId=${c.id}`}
              className="flex justify-between hover:text-brand"
            >
              <span>Transport jobs</span> <b>{c.jobCount ?? 0}</b>
            </Link>
            <Link
              to={`${base}/invoices?customerId=${c.id}`}
              className="flex justify-between hover:text-brand"
            >
              <span>Invoices</span> <b>{c.invoiceCount ?? 0}</b>
            </Link>
            {archived && (
              <p className="text-xs text-muted">
                Archived customers are kept for history but can't be used on new jobs or invoices.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
      <ConfirmDialog
        open={confirm}
        title={archived ? 'Restore customer?' : 'Archive customer?'}
        message={
          archived
            ? 'The customer can be used for new jobs and invoices again.'
            : 'Archived customers stay in your records and on past invoices, but cannot be used for new jobs or invoices. You can restore them any time.'
        }
        confirmLabel={archived ? 'Restore' : 'Archive'}
        destructive={!archived}
        loading={toggle.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await toggle.mutateAsync();
            toast.success(archived ? 'Customer restored.' : 'Customer archived.');
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Something went wrong.');
          }
          setConfirm(false);
        }}
      />
    </>
  );
}
