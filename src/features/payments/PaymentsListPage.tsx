import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, FilterSelect, Pagination, SearchInput } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDate, formatPaise } from '@/lib/format';
import { useDebouncedValue, useListParams } from '@/lib/hooks';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Paged, Payment } from '@/types/api';
import { METHODS } from './methods';
import { RecordPaymentDialog } from './RecordPaymentDialog';

export function PaymentsListPage() {
  const { tenant, can } = useCurrentTenant();
  const [recording, setRecording] = useState(false);
  const list = useListParams({ status: 'RECORDED', method: '', from: '', to: '' });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending, error, refetch } = useTenantQuery<Paged<Payment>>(
    ['payments'],
    `/payments?${list.query({ q, pageSize: 20, sort: 'paymentDate', order: 'desc' })}`,
    { keepPrevious: true },
  );

  return (
    <>
      <PageHeader
        eyebrow="Billing & collections"
        title="Payments"
        description="Money received from customers against invoices. Partial payments are supported."
        action={
          can('payments.write') && (
            <Button variant="primary" onClick={() => setRecording(true)}>
              <Plus className="size-4" /> Record payment
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Reference, customer or invoice no.…"
          />
          <div className="flex flex-wrap items-center gap-3">
            <FilterSelect
              label="Method"
              value={list.values.method}
              onChange={(v) => list.set({ method: v })}
              options={[{ value: '', label: 'All methods' }, ...METHODS]}
            />
            <FilterSelect
              label="Status"
              value={list.values.status}
              onChange={(v) => list.set({ status: v })}
              options={[
                { value: 'RECORDED', label: 'Recorded' },
                { value: 'VOIDED', label: 'Voided' },
                { value: 'ALL', label: 'All' },
              ]}
            />
            <input
              type="date"
              aria-label="From date"
              value={list.values.from}
              onChange={(e) => list.set({ from: e.target.value })}
              className="rounded-lg border border-line px-2 py-1.5 text-[13px]"
            />
            <input
              type="date"
              aria-label="To date"
              value={list.values.to}
              onChange={(e) => list.set({ to: e.target.value })}
              className="rounded-lg border border-line px-2 py-1.5 text-[13px]"
            />
          </div>
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(p) => p.id}
          columns={[
            { header: 'Date', cell: (p) => formatDate(p.paymentDate) },
            { header: 'Customer', cell: (p) => p.customer.name },
            {
              header: 'Invoice',
              cell: (p) =>
                p.allocations.map((a) => (
                  <Link
                    key={a.invoiceId}
                    to={`/t/${tenant.id}/invoices/${a.invoiceId}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {a.invoiceNumber}
                  </Link>
                )),
            },
            {
              header: 'Method',
              cell: (p) => METHODS.find((m) => m.value === p.method)?.label ?? p.method,
              hideOnMobile: true,
            },
            { header: 'Reference', cell: (p) => p.reference ?? '—', hideOnMobile: true },
            {
              header: 'Amount',
              cell: (p) => <b>{formatPaise(p.amountMinor)}</b>,
              className: 'text-right whitespace-nowrap',
            },
            {
              header: 'Status',
              cell: (p) => <StatusBadge status={p.status} />,
              hideOnMobile: true,
            },
          ]}
          empty={
            <EmptyState
              icon={<Wallet className="size-5" />}
              title="No payments here"
              description="Record a payment when a customer pays an invoice, fully or partly."
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
      <RecordPaymentDialog open={recording} onClose={() => setRecording(false)} />
    </>
  );
}
