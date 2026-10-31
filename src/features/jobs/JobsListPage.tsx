import { Link, useNavigate } from 'react-router';
import { Plus, Route } from 'lucide-react';
import { buttonClass } from '@/components/ui/button-class';
import { Card } from '@/components/ui/Card';
import { DataTable, FilterSelect, Pagination, SearchInput } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatPaise } from '@/lib/format';
import { useDebouncedValue, useListParams } from '@/lib/hooks';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Job, Paged } from '@/types/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'BOOKED,IN_TRANSIT', label: 'Active (booked / in transit)' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export function JobsListPage() {
  const { tenant, can } = useCurrentTenant();
  const navigate = useNavigate();
  const list = useListParams({
    status: '',
    invoiced: '',
    customerId: '',
    vehicleId: '',
    bookingFrom: '',
    bookingTo: '',
  });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending, error, refetch } = useTenantQuery<Paged<Job>>(
    ['jobs'],
    `/jobs?${list.query({ q, pageSize: 20, sort: 'bookingDate', order: 'desc' })}`,
    { keepPrevious: true },
  );
  const base = `/t/${tenant.id}/jobs`;
  const filtered = Object.entries(list.values).some(([k, v]) => k !== 'page' && v !== '');

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Transport jobs"
        description="Record each customer assignment, track it to delivery, then invoice it."
        action={
          can('jobs.write') && (
            <Link to={`${base}/new`} className={buttonClass('primary')}>
              <Plus className="size-4" aria-hidden /> Create job
            </Link>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Job no., city, customer, vehicle, LR…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Status"
              value={list.values.status}
              onChange={(v) => list.set({ status: v })}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label="Invoice"
              value={list.values.invoiced}
              onChange={(v) => list.set({ invoiced: v })}
              options={[
                { value: '', label: 'Any' },
                { value: 'no', label: 'Not invoiced' },
                { value: 'yes', label: 'Invoiced' },
              ]}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <span className="max-sm:sr-only">Booked from</span>
              <input
                type="date"
                value={list.values.bookingFrom}
                onChange={(e) => list.set({ bookingFrom: e.target.value })}
                className="rounded-lg border border-line px-2 py-1.5 text-[13px] text-ink"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <span className="max-sm:sr-only">to</span>
              <input
                type="date"
                value={list.values.bookingTo}
                onChange={(e) => list.set({ bookingTo: e.target.value })}
                className="rounded-lg border border-line px-2 py-1.5 text-[13px] text-ink"
              />
            </label>
          </div>
        </div>
        {(list.values.customerId || list.values.vehicleId) && (
          <div className="flex items-center gap-2 px-5 pb-3 text-xs text-muted">
            Filtered by {list.values.customerId ? 'customer' : 'vehicle'}.
            <button
              type="button"
              className="font-semibold text-brand"
              onClick={() => list.set({ customerId: '', vehicleId: '' })}
            >
              Clear
            </button>
          </div>
        )}
        <DataTable
          rows={data?.items}
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(j) => j.id}
          onRowClick={(j) => navigate(`${base}/${j.id}`)}
          columns={[
            {
              header: 'Job',
              cell: (j) => (
                <>
                  <b>{j.jobNumber}</b>
                  <p className="mt-0.5 text-[11px] text-subtle">{formatDate(j.bookingDate)}</p>
                </>
              ),
            },
            { header: 'Customer', cell: (j) => j.customer.name },
            {
              header: 'Route',
              cell: (j) => `${j.originCity} → ${j.destinationCity}`,
              hideOnMobile: true,
            },
            {
              header: 'Vehicle',
              cell: (j) => j.vehicle?.registrationNumberDisplay ?? '—',
              hideOnMobile: true,
            },
            {
              header: 'Amount',
              cell: (j) => formatPaise(j.totalMinor),
              className: 'text-right whitespace-nowrap',
              hideOnMobile: true,
            },
            {
              header: 'Status',
              cell: (j) => (
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={j.status} />
                  {j.status === 'DELIVERED' && <StatusBadge status={j.invoiceState} />}
                </div>
              ),
            },
          ]}
          empty={
            <EmptyState
              icon={<Route className="size-5" />}
              title={filtered ? 'No jobs match these filters' : 'No transport jobs yet'}
              description={
                filtered
                  ? 'Change or clear the filters.'
                  : 'Create a job for each customer assignment, e.g. Mumbai → Pune.'
              }
              action={
                !filtered &&
                can('jobs.write') && (
                  <Link
                    to={`${base}/new`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Create job
                  </Link>
                )
              }
            />
          }
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onChange={(p) => list.set({ page: String(p) })}
          />
        )}
      </Card>
    </>
  );
}
