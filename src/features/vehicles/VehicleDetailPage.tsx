import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Pencil, Power } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/button-class';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BackLink, DetailList } from '@/components/ui/Detail';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast-context';
import { ApiError } from '@/lib/api';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Vehicle } from '@/types/api';
import { capacityLabel, ownershipLabel, vehicleTypeLabel } from './labels';

export function VehicleDetailPage() {
  const { vehicleId = '' } = useParams();
  const { tenant, can } = useCurrentTenant();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const { data: v, isPending } = useTenantQuery<Vehicle>(
    ['vehicles', vehicleId],
    `/vehicles/${vehicleId}`,
  );
  const active = v?.status === 'ACTIVE';
  const toggle = useTenantMutation<void, Vehicle>(
    'POST',
    `/vehicles/${vehicleId}/${active ? 'deactivate' : 'activate'}`,
    ['vehicles'],
  );
  const base = `/t/${tenant.id}`;

  if (isPending) return <Spinner label="Loading vehicle" />;
  if (!v)
    return (
      <EmptyState
        title="Vehicle not found"
        action={
          <Link to={`${base}/vehicles`} className="text-sm font-semibold text-brand">
            All vehicles
          </Link>
        }
      />
    );

  return (
    <>
      <BackLink to={`${base}/vehicles`} label="All vehicles" />
      <PageHeader
        eyebrow={vehicleTypeLabel(v.vehicleType)}
        title={v.registrationNumberDisplay}
        description={<StatusBadge status={v.status} />}
        action={
          can('vehicles.write') && (
            <div className="flex gap-2">
              <Link to={`${base}/vehicles/${v.id}/edit`} className={buttonClass()}>
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
              <Button onClick={() => setConfirm(true)}>
                <Power className="size-4" /> {active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          )
        }
      />
      <Card className="max-w-225">
        <CardHeader title="Details" />
        <CardBody>
          <DetailList
            items={[
              ['Make / model', v.makeModel],
              ['Capacity', capacityLabel(v)],
              ['Ownership', ownershipLabel(v.ownershipType)],
              [
                'Transport jobs',
                <Link
                  key="jobs"
                  to={`${base}/jobs?vehicleId=${v.id}`}
                  className="text-brand hover:underline"
                >
                  {v.jobCount ?? 0} jobs
                </Link>,
              ],
              ['Notes', v.notes],
            ]}
          />
        </CardBody>
      </Card>
      <ConfirmDialog
        open={confirm}
        title={active ? 'Deactivate vehicle?' : 'Activate vehicle?'}
        message={
          active
            ? 'Inactive vehicles stay on past jobs but cannot be assigned to new ones.'
            : 'The vehicle can be assigned to jobs again.'
        }
        confirmLabel={active ? 'Deactivate' : 'Activate'}
        destructive={active}
        loading={toggle.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          try {
            await toggle.mutateAsync();
            toast.success(active ? 'Vehicle deactivated.' : 'Vehicle activated.');
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Something went wrong.');
          }
          setConfirm(false);
        }}
      />
    </>
  );
}
