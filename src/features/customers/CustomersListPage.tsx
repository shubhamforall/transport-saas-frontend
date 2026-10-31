import { Link, useNavigate } from 'react-router';
import { Plus, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { DataTable, FilterSelect, Pagination, SearchInput } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebouncedValue, useListParams } from '@/lib/hooks';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Customer, Paged } from '@/types/api';

export function CustomersListPage() {
  const { tenant, can } = useCurrentTenant();
  const navigate = useNavigate();
  const list = useListParams({ status: 'ACTIVE' });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending, error, refetch } = useTenantQuery<Paged<Customer>>(
    ['customers'],
    `/customers?${list.query({ q, pageSize: 20, sort: 'name', order: 'asc' })}`,
    { keepPrevious: true },
  );
  const base = `/t/${tenant.id}/customers`;

  return (
    <>
      <PageHeader
        eyebrow="Customer directory"
        title="Customers"
        description="Billing contacts you select when creating transport jobs and invoices."
        action={
          can('customers.write') && (
            <Link
              to={`${base}/new`}
              className="inline-flex items-center gap-2 rounded-[9px] bg-brand px-4 py-2.5 text-[13px] font-semibold text-white shadow-primary hover:bg-brand-dark"
            >
              <Plus className="size-4" aria-hidden /> Create customer
            </Link>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Search name, phone, email, GSTIN…"
          />
          <FilterSelect
            label="Status"
            value={list.values.status}
            onChange={(v) => list.set({ status: v })}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ARCHIVED', label: 'Archived' },
              { value: 'ALL', label: 'All' },
            ]}
          />
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(c) => c.id}
          onRowClick={(c) => navigate(`${base}/${c.id}`)}
          columns={[
            {
              header: 'Name',
              cell: (c) => (
                <>
                  <Link
                    to={`${base}/${c.id}`}
                    className="font-semibold hover:text-brand"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.name}
                  </Link>
                  {c.contactPerson && (
                    <p className="mt-0.5 text-[11px] text-subtle">{c.contactPerson}</p>
                  )}
                </>
              ),
            },
            { header: 'Phone', cell: (c) => c.phone ?? '—', hideOnMobile: true },
            { header: 'Email', cell: (c) => c.email ?? '—', hideOnMobile: true },
            { header: 'City', cell: (c) => c.city ?? '—', hideOnMobile: true },
            { header: 'GSTIN', cell: (c) => c.gstin ?? '—', hideOnMobile: true },
            { header: 'Status', cell: (c) => <StatusBadge status={c.status} /> },
          ]}
          empty={
            <EmptyState
              icon={<Users className="size-5" />}
              title={list.values.q ? 'No customers match your search' : 'No customers yet'}
              description={
                list.values.q
                  ? 'Try a different name, phone or GSTIN.'
                  : 'Add your first customer to start booking transport jobs.'
              }
              action={
                !list.values.q &&
                can('customers.write') && (
                  <Link
                    to={`${base}/new`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Create customer
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
