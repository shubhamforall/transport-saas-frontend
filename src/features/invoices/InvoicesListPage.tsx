import { Link, useNavigate } from 'react-router';
import { FileText, Plus } from 'lucide-react';
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
import type { InvoiceListItem, Paged } from '@/types/api';

export function InvoicesListPage() {
  const { tenant, can } = useCurrentTenant();
  const navigate = useNavigate();
  const list = useListParams({ status: '', customerId: '', from: '', to: '' });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending, error, refetch } = useTenantQuery<Paged<InvoiceListItem>>(
    ['invoices'],
    `/invoices?${list.query({ q, pageSize: 20, sort: 'createdAt', order: 'desc' })}`,
    { keepPrevious: true },
  );
  const base = `/t/${tenant.id}/invoices`;
  const filtered = Object.entries(list.values).some(([k, v]) => k !== 'page' && v !== '');

  return (
    <>
      <PageHeader
        eyebrow="Billing & collections"
        title="Invoices"
        description="Create invoices from delivered jobs or manually, then download, email and track payment."
        action={
          can('invoices.write') && (
            <Link to={`${base}/new`} className={buttonClass('primary')}>
              <Plus className="size-4" aria-hidden /> Create invoice
            </Link>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Invoice number or customer…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Status"
              value={list.values.status}
              onChange={(v) => list.set({ status: v })}
              options={[
                { value: '', label: 'All' },
                { value: 'DRAFT', label: 'Draft' },
                { value: 'ISSUED,PARTIALLY_PAID', label: 'Unpaid' },
                { value: 'OVERDUE', label: 'Overdue' },
                { value: 'PAID', label: 'Paid' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <span className="max-sm:sr-only">From</span>
              <input
                type="date"
                value={list.values.from}
                onChange={(e) => list.set({ from: e.target.value })}
                className="rounded-lg border border-line px-2 py-1.5 text-[13px] text-ink"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs text-muted">
              <span className="max-sm:sr-only">To</span>
              <input
                type="date"
                value={list.values.to}
                onChange={(e) => list.set({ to: e.target.value })}
                className="rounded-lg border border-line px-2 py-1.5 text-[13px] text-ink"
              />
            </label>
          </div>
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(i) => i.id}
          onRowClick={(i) =>
            navigate(i.status === 'DRAFT' ? `${base}/${i.id}/edit` : `${base}/${i.id}`)
          }
          columns={[
            { header: 'Invoice', cell: (i) => <b>{i.invoiceNumber ?? 'Draft'}</b> },
            { header: 'Customer', cell: (i) => i.customer.name },
            { header: 'Date', cell: (i) => formatDate(i.invoiceDate), hideOnMobile: true },
            {
              header: 'Due',
              cell: (i) => (i.dueDate ? formatDate(i.dueDate) : '—'),
              hideOnMobile: true,
            },
            {
              header: 'Total',
              cell: (i) => formatPaise(i.grandTotalMinor),
              className: 'text-right whitespace-nowrap',
            },
            {
              header: 'Balance',
              cell: (i) => formatPaise(i.balanceMinor),
              className: 'text-right whitespace-nowrap',
              hideOnMobile: true,
            },
            { header: 'Status', cell: (i) => <StatusBadge status={i.displayStatus} /> },
          ]}
          empty={
            <EmptyState
              icon={<FileText className="size-5" />}
              title={filtered ? 'No invoices match these filters' : 'No invoices yet'}
              description={
                filtered
                  ? 'Change or clear the filters.'
                  : 'Invoice a delivered job, or create a manual invoice.'
              }
              action={
                !filtered &&
                can('invoices.write') && (
                  <Link
                    to={`${base}/new`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Create invoice
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
