import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { BackLink } from '@/components/ui/Detail';
import { FieldGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { applyServerErrors } from '@/lib/form-errors';
import { useUnsavedChangesWarning } from '@/lib/hooks';
import { milliToInput, parseMilli } from '@/lib/money';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Vehicle } from '@/types/api';
import { OWNERSHIP, UNITS, VEHICLE_TYPES } from './labels';

const schema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1, 'Enter the registration number')
    .refine((v) => {
      const n = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
      return /^[A-Z0-9]{4,12}$/.test(n) && /[A-Z]/.test(n) && /[0-9]/.test(n);
    }, 'Enter a valid registration number, e.g. MH 12 AB 1234'),
  vehicleType: z.string().min(1, 'Choose the vehicle type'),
  makeModel: z.string().trim().max(100),
  capacity: z
    .string()
    .refine((v) => v.trim() === '' || parseMilli(v) !== null, 'Enter a number, e.g. 10 or 10.5'),
  capacityUnit: z.string(),
  ownershipType: z.string(),
  notes: z.string().trim().max(2000),
});
type Values = z.input<typeof schema>;

export function VehicleFormPage() {
  const { vehicleId } = useParams();
  const editing = Boolean(vehicleId);
  const { data, isPending } = useTenantQuery<Vehicle>(
    ['vehicles', vehicleId],
    `/vehicles/${vehicleId}`,
    { enabled: editing },
  );
  if (editing && isPending) return <Spinner label="Loading vehicle" />;
  return <VehicleForm vehicle={editing ? data : undefined} />;
}

function VehicleForm({ vehicle }: { vehicle?: Vehicle }) {
  const { tenant } = useCurrentTenant();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const save = useTenantMutation<Record<string, unknown>, Vehicle>(
    vehicle ? 'PATCH' : 'POST',
    vehicle ? `/vehicles/${vehicle.id}` : '/vehicles',
    ['vehicles'],
  );
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      registrationNumber: vehicle?.registrationNumberDisplay ?? '',
      vehicleType: vehicle?.vehicleType ?? '',
      makeModel: vehicle?.makeModel ?? '',
      capacity: milliToInput(vehicle?.capacityMilli),
      capacityUnit: vehicle?.capacityUnit ?? 'TONNES',
      ownershipType: vehicle?.ownershipType ?? 'OWNED',
      notes: vehicle?.notes ?? '',
    },
  });
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const capacityMilli = v.capacity.trim() === '' ? null : parseMilli(v.capacity);
    try {
      const saved = await save.mutateAsync({
        registrationNumber: v.registrationNumber,
        vehicleType: v.vehicleType,
        makeModel: v.makeModel.trim() || null,
        capacityMilli,
        capacityUnit: capacityMilli === null ? null : v.capacityUnit,
        ownershipType: v.ownershipType || null,
        notes: v.notes.trim() || null,
      });
      reset(v);
      toast.success(vehicle ? 'Vehicle updated.' : 'Vehicle saved.');
      navigate(`/t/${tenant.id}/vehicles/${saved.id}`);
    } catch (err) {
      setFormError(
        applyServerErrors(
          err,
          setError,
          [
            'registrationNumber',
            'vehicleType',
            'makeModel',
            'capacity',
            'capacityUnit',
            'ownershipType',
            'notes',
          ],
          { capacityMilli: 'capacity' },
        ),
      );
    }
  });

  const back = vehicle ? `/t/${tenant.id}/vehicles/${vehicle.id}` : `/t/${tenant.id}/vehicles`;
  return (
    <>
      <BackLink to={back} label={vehicle ? 'Back to vehicle' : 'All vehicles'} />
      <PageHeader
        eyebrow="Fleet directory"
        title={vehicle ? `Edit ${vehicle.registrationNumberDisplay}` : 'Add vehicle'}
        description="Enter the vehicle details as recorded in your documents."
      />
      <form onSubmit={onSubmit} noValidate className="max-w-225">
        <Card>
          <CardHeader title="Vehicle information" description="Fields marked * are required." />
          <CardBody className="flex flex-col gap-5">
            {formError && <Notice tone="error">{formError}</Notice>}
            <FieldGrid>
              <TextField
                label="Registration number"
                required
                className="uppercase"
                placeholder="MH 12 AB 1234"
                hint="Unique within your company."
                error={errors.registrationNumber?.message}
                {...register('registrationNumber')}
              />
              <SelectField
                label="Vehicle type"
                required
                error={errors.vehicleType?.message}
                {...register('vehicleType')}
              >
                <option value="">Select vehicle type</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Make / model"
                placeholder="e.g. Tata Signa 3118"
                error={errors.makeModel?.message}
                {...register('makeModel')}
              />
              <SelectField label="Ownership" {...register('ownershipType')}>
                {OWNERSHIP.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Capacity"
                inputMode="decimal"
                placeholder="e.g. 10"
                error={errors.capacity?.message}
                {...register('capacity')}
              />
              <SelectField label="Capacity unit" {...register('capacityUnit')}>
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </SelectField>
              <TextAreaField
                label="Notes"
                full
                placeholder="Optional vehicle notes"
                error={errors.notes?.message}
                {...register('notes')}
              />
            </FieldGrid>
          </CardBody>
          <CardFooter>
            <span className="text-xs text-muted">Vehicle data stays within your company.</span>
            <div className="flex gap-2">
              <Button onClick={() => navigate(back)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting}>
                {vehicle ? 'Save changes' : 'Save vehicle'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
