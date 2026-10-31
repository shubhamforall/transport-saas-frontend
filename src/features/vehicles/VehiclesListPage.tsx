import { Link, useNavigate } from 'react-router';
import { Plus, Truck } from 'lucide-react';
import { buttonClass } from '@/components/ui/button-class';
import { Card } from '@/components/ui/Card';
import { DataTable, FilterSelect, Pagination, SearchInput } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useDebouncedValue, useListParams } from '@/lib/hooks';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Paged, Vehicle } from '@/types/api';
import { capacityLabel, ownershipLabel, VEHICLE_TYPES, vehicleTypeLabel } from './labels';

export function VehiclesListPage() {
  const { tenant, can } = useCurrentTenant();
  const navigate = useNavigate();
  const list = useListParams({ status: 'ACTIVE', vehicleType: '' });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending, error, refetch } = useTenantQuery<Paged<Vehicle>>(
    ['vehicles'],
    `/vehicles?${list.query({ q, pageSize: 20, sort: 'registration', order: 'asc' })}`,
    { keepPrevious: true },
  );
  const base = `/t/${tenant.id}/vehicles`;

  return (
    <>
      <PageHeader
        eyebrow="Fleet directory"
        title="Vehicles"
        description="Your fleet records, ready to assign to transport jobs."
        action={
          can('vehicles.write') && (
            <Link to={`${base}/new`} className={buttonClass('primary')}>
              <Plus className="size-4" aria-hidden /> Add vehicle
            </Link>
          )
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Search registration or model…"
          />
          <div className="flex flex-wrap gap-3">
            <FilterSelect
              label="Type"
              value={list.values.vehicleType}
              onChange={(v) => list.set({ vehicleType: v })}
              options={[{ value: '', label: 'All types' }, ...VEHICLE_TYPES]}
            />
            <FilterSelect
              label="Status"
              value={list.values.status}
              onChange={(v) => list.set({ status: v })}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'ALL', label: 'All' },
              ]}
            />
          </div>
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(v) => v.id}
          onRowClick={(v) => navigate(`${base}/${v.id}`)}
          columns={[
            { header: 'Registration', cell: (v) => <b>{v.registrationNumberDisplay}</b> },
            { header: 'Type', cell: (v) => vehicleTypeLabel(v.vehicleType) },
            { header: 'Capacity', cell: (v) => capacityLabel(v), hideOnMobile: true },
            {
              header: 'Ownership',
              cell: (v) => ownershipLabel(v.ownershipType),
              hideOnMobile: true,
            },
            { header: 'Status', cell: (v) => <StatusBadge status={v.status} /> },
          ]}
          empty={
            <EmptyState
              icon={<Truck className="size-5" />}
              title={list.values.q ? 'No vehicles match your search' : 'No vehicles yet'}
              description={
                list.values.q
                  ? 'Try another registration number.'
                  : 'Add your first vehicle to assign it to jobs.'
              }
              action={
                !list.values.q &&
                can('vehicles.write') && (
                  <Link
                    to={`${base}/new`}
                    className="text-sm font-semibold text-brand hover:underline"
                  >
                    Add vehicle
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
