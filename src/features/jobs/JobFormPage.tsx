import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { BackLink } from '@/components/ui/Detail';
import {
  FieldGrid,
  SectionTitle,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/Field';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { MoneyField } from '@/components/ui/MoneyField';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { formatPaise } from '@/lib/format';
import { applyServerErrors } from '@/lib/form-errors';
import { useUnsavedChangesWarning } from '@/lib/hooks';
import {
  GST_RATES,
  bpsToPercent,
  milliToInput,
  paiseToInput,
  parseMilli,
  parseRupees,
} from '@/lib/money';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Customer, Job, Paged, Vehicle } from '@/types/api';

const rupees = (required: boolean) =>
  z
    .string()
    .refine(
      (v) => (v.trim() === '' ? !required : parseRupees(v) !== null),
      required ? 'Enter an amount in rupees' : 'Enter a valid amount',
    );

const schema = z
  .object({
    customerId: z.string().min(1, 'Choose a customer'),
    vehicleId: z.string(),
    status: z.enum(['DRAFT', 'BOOKED']),
    bookingDate: z.string().min(1, 'Enter the booking date'),
    originAddress: z.string().trim().max(300),
    originCity: z.string().trim().min(1, 'Enter the pickup city').max(100),
    destinationAddress: z.string().trim().max(300),
    destinationCity: z.string().trim().min(1, 'Enter the delivery city').max(100),
    plannedPickupDate: z.string(),
    plannedDeliveryDate: z.string(),
    driverName: z.string().trim().max(120),
    driverPhone: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^\+?\d{7,15}$/.test(v.replace(/[\s-]/g, '')),
        'Enter a valid phone number',
      ),
    goodsDescription: z.string().trim().min(1, 'Describe the goods').max(500),
    quantity: z.string().refine((v) => v.trim() === '' || parseMilli(v) !== null, 'Enter a number'),
    quantityUnit: z.string().trim().max(20),
    lrNumber: z.string().trim().max(50),
    freight: rupees(true),
    discount: rupees(false),
    taxRateBps: z.string(),
    internalNotes: z.string().trim().max(2000),
    charges: z
      .array(
        z.object({
          description: z.string().trim().min(1, 'Describe the charge').max(200),
          amount: rupees(true),
        }),
      )
      .max(20),
  })
  .refine(
    (v) =>
      !v.plannedPickupDate ||
      !v.plannedDeliveryDate ||
      v.plannedPickupDate <= v.plannedDeliveryDate,
    {
      message: 'Delivery cannot be before pickup',
      path: ['plannedDeliveryDate'],
    },
  );
type Values = z.input<typeof schema>;

const FIELDS = [
  'customerId',
  'vehicleId',
  'bookingDate',
  'originAddress',
  'originCity',
  'destinationAddress',
  'destinationCity',
  'plannedPickupDate',
  'plannedDeliveryDate',
  'driverName',
  'driverPhone',
  'goodsDescription',
  'quantity',
  'quantityUnit',
  'lrNumber',
  'freight',
  'discount',
  'taxRateBps',
  'internalNotes',
] as const;

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

function toValues(job: Job | undefined, customerId: string): Values {
  return {
    customerId: job?.customerId ?? customerId,
    vehicleId: job?.vehicleId ?? '',
    status: job?.status === 'DRAFT' ? 'DRAFT' : 'BOOKED',
    bookingDate: job?.bookingDate ?? today(),
    originAddress: job?.originAddress ?? '',
    originCity: job?.originCity ?? '',
    destinationAddress: job?.destinationAddress ?? '',
    destinationCity: job?.destinationCity ?? '',
    plannedPickupDate: job?.plannedPickupDate ?? '',
    plannedDeliveryDate: job?.plannedDeliveryDate ?? '',
    driverName: job?.driverName ?? '',
    driverPhone: job?.driverPhone ?? '',
    goodsDescription: job?.goodsDescription ?? '',
    quantity: milliToInput(job?.quantityMilli),
    quantityUnit: job?.quantityUnit ?? '',
    lrNumber: job?.lrNumber ?? '',
    freight: job ? paiseToInput(job.freightAmountMinor) : '',
    discount: job?.discountAmountMinor ? paiseToInput(job.discountAmountMinor) : '',
    taxRateBps:
      job?.taxRateBps === null || job?.taxRateBps === undefined ? '' : String(job.taxRateBps),
    internalNotes: job?.internalNotes ?? '',
    charges:
      job?.charges.map((c) => ({
        description: c.description,
        amount: paiseToInput(c.amountMinor),
      })) ?? [],
  };
}

export function JobFormPage() {
  const { jobId } = useParams();
  const editing = Boolean(jobId);
  const { data, isPending } = useTenantQuery<Job>(['jobs', jobId], `/jobs/${jobId}`, {
    enabled: editing,
  });
  if (editing && isPending) return <Spinner label="Loading job" />;
  return <JobForm job={editing ? data : undefined} />;
}

function JobForm({ job }: { job?: Job }) {
  const { tenant } = useCurrentTenant();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const customers = useTenantQuery<Paged<Customer>>(
    ['customers'],
    '/customers?status=ACTIVE&pageSize=100&sort=name&order=asc',
  );
  const vehicles = useTenantQuery<Paged<Vehicle>>(
    ['vehicles'],
    '/vehicles?status=ACTIVE&pageSize=100&sort=registration&order=asc',
  );
  const save = useTenantMutation<Record<string, unknown>, Job>(
    job ? 'PATCH' : 'POST',
    job ? `/jobs/${job.id}` : '/jobs',
    ['jobs'],
  );

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(job, params.get('customerId') ?? ''),
  });
  const charges = useFieldArray({ control, name: 'charges' });
  const watched = useWatch({ control });
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const freight = parseRupees(watched.freight ?? '') ?? 0;
  const extra = (watched.charges ?? []).reduce(
    (s, c) => s + (parseRupees(c?.amount ?? '') ?? 0),
    0,
  );
  const discount = parseRupees(watched.discount ?? '') ?? 0;
  const total = freight + extra - discount;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const n = (s: string) => (s.trim() === '' ? null : s.trim());
    const body: Record<string, unknown> = {
      customerId: v.customerId,
      vehicleId: v.vehicleId || null,
      bookingDate: v.bookingDate,
      originAddress: n(v.originAddress),
      originCity: v.originCity.trim(),
      destinationAddress: n(v.destinationAddress),
      destinationCity: v.destinationCity.trim(),
      plannedPickupDate: v.plannedPickupDate || null,
      plannedDeliveryDate: v.plannedDeliveryDate || null,
      driverName: n(v.driverName),
      driverPhone: n(v.driverPhone),
      goodsDescription: v.goodsDescription.trim(),
      quantityMilli: v.quantity.trim() === '' ? null : parseMilli(v.quantity),
      quantityUnit: n(v.quantityUnit),
      lrNumber: n(v.lrNumber),
      freightAmountMinor: parseRupees(v.freight),
      discountAmountMinor: parseRupees(v.discount) ?? 0,
      taxRateBps: v.taxRateBps === '' ? null : Number(v.taxRateBps),
      internalNotes: n(v.internalNotes),
      charges: v.charges.map((c) => ({
        description: c.description.trim(),
        amountMinor: parseRupees(c.amount),
      })),
    };
    if (!job) body.status = v.status;
    try {
      const saved = await save.mutateAsync(body);
      reset(v);
      toast.success(job ? 'Job updated.' : `Job ${saved.jobNumber} created.`);
      navigate(`/t/${tenant.id}/jobs/${saved.id}`);
    } catch (err) {
      setFormError(
        applyServerErrors(err, setError, FIELDS, {
          freightAmountMinor: 'freight',
          discountAmountMinor: 'discount',
          quantityMilli: 'quantity',
        }),
      );
    }
  });

  const back = job ? `/t/${tenant.id}/jobs/${job.id}` : `/t/${tenant.id}/jobs`;
  const noCustomers = customers.data?.total === 0;

  return (
    <>
      <BackLink to={back} label={job ? `Back to ${job.jobNumber}` : 'All jobs'} />
      <PageHeader
        eyebrow="Operations"
        title={job ? `Edit ${job.jobNumber}` : 'Create transport job'}
        description="One job per customer assignment. Once delivered, you can invoice it in a few clicks."
      />
      {noCustomers && (
        <div className="mb-5 max-w-225">
          <Notice>
            You need a customer first.{' '}
            <Link to={`/t/${tenant.id}/customers/new`} className="font-semibold underline">
              Create a customer
            </Link>
          </Notice>
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="max-w-225">
        <Card>
          <CardHeader title="Job details" description="Fields marked * are required." />
          <CardBody className="flex flex-col gap-6">
            {formError && <Notice tone="error">{formError}</Notice>}
            <div>
              <SectionTitle>Customer & vehicle</SectionTitle>
              <FieldGrid>
                <SelectField
                  label="Customer"
                  required
                  error={errors.customerId?.message}
                  {...register('customerId')}
                >
                  <option value="">{customers.isPending ? 'Loading…' : 'Select customer'}</option>
                  {customers.data?.items.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  {job && !customers.data?.items.some((c) => c.id === job.customerId) && (
                    <option value={job.customerId}>{job.customer.name}</option>
                  )}
                </SelectField>
                <SelectField
                  label="Vehicle"
                  hint="Optional at booking."
                  error={errors.vehicleId?.message}
                  {...register('vehicleId')}
                >
                  <option value="">Not assigned yet</option>
                  {vehicles.data?.items.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumberDisplay}
                    </option>
                  ))}
                  {job?.vehicle && !vehicles.data?.items.some((v) => v.id === job.vehicleId) && (
                    <option value={job.vehicle.id}>{job.vehicle.registrationNumberDisplay}</option>
                  )}
                </SelectField>
                <TextField
                  label="Booking date"
                  type="date"
                  required
                  error={errors.bookingDate?.message}
                  {...register('bookingDate')}
                />
                {!job && (
                  <SelectField label="Save as" {...register('status')}>
                    <option value="BOOKED">Booked</option>
                    <option value="DRAFT">Draft (not confirmed yet)</option>
                  </SelectField>
                )}
                <TextField
                  label="Driver name"
                  error={errors.driverName?.message}
                  {...register('driverName')}
                />
                <TextField
                  label="Driver phone"
                  type="tel"
                  error={errors.driverPhone?.message}
                  {...register('driverPhone')}
                />
              </FieldGrid>
            </div>
            <hr className="border-line" />
            <div>
              <SectionTitle>Route</SectionTitle>
              <FieldGrid>
                <TextField
                  label="Pickup city"
                  required
                  placeholder="Mumbai"
                  error={errors.originCity?.message}
                  {...register('originCity')}
                />
                <TextField
                  label="Delivery city"
                  required
                  placeholder="Pune"
                  error={errors.destinationCity?.message}
                  {...register('destinationCity')}
                />
                <TextField
                  label="Pickup address"
                  error={errors.originAddress?.message}
                  {...register('originAddress')}
                />
                <TextField
                  label="Delivery address"
                  error={errors.destinationAddress?.message}
                  {...register('destinationAddress')}
                />
                <TextField
                  label="Planned pickup"
                  type="date"
                  error={errors.plannedPickupDate?.message}
                  {...register('plannedPickupDate')}
                />
                <TextField
                  label="Planned delivery"
                  type="date"
                  error={errors.plannedDeliveryDate?.message}
                  {...register('plannedDeliveryDate')}
                />
              </FieldGrid>
            </div>
            <hr className="border-line" />
            <div>
              <SectionTitle>Goods</SectionTitle>
              <FieldGrid>
                <TextField
                  label="Goods / cargo description"
                  required
                  full
                  placeholder="e.g. Machine parts, 40 boxes"
                  error={errors.goodsDescription?.message}
                  {...register('goodsDescription')}
                />
                <TextField
                  label="Quantity"
                  inputMode="decimal"
                  error={errors.quantity?.message}
                  {...register('quantity')}
                />
                <TextField
                  label="Unit"
                  placeholder="boxes, tonnes, kg…"
                  error={errors.quantityUnit?.message}
                  {...register('quantityUnit')}
                />
                <TextField
                  label="LR / consignment note no."
                  error={errors.lrNumber?.message}
                  {...register('lrNumber')}
                />
              </FieldGrid>
            </div>
            <hr className="border-line" />
            <div>
              <SectionTitle>Charges</SectionTitle>
              <FieldGrid>
                <MoneyField
                  label="Freight (₹)"
                  required
                  error={errors.freight?.message}
                  {...register('freight')}
                />
                <SelectField
                  label="GST rate for invoicing"
                  hint="Suggested on the invoice; you can change it there."
                  {...register('taxRateBps')}
                >
                  <option value="">
                    Company default ({bpsToPercent(tenant.defaultTaxRateBps)}%)
                  </option>
                  {GST_RATES.map((r) => (
                    <option key={r} value={r}>
                      {bpsToPercent(r)}%
                    </option>
                  ))}
                </SelectField>
              </FieldGrid>
              <div className="mt-4 flex flex-col gap-3">
                {charges.fields.map((f, i) => (
                  <div
                    key={f.id}
                    className="grid grid-cols-[1fr_140px_auto] items-start gap-3 max-sm:grid-cols-[1fr_110px_auto]"
                  >
                    <TextField
                      label={`Extra charge ${i + 1}`}
                      placeholder="Loading, unloading, toll…"
                      error={errors.charges?.[i]?.description?.message}
                      {...register(`charges.${i}.description`)}
                    />
                    <MoneyField
                      label="Amount (₹)"
                      error={errors.charges?.[i]?.amount?.message}
                      {...register(`charges.${i}.amount`)}
                    />
                    <button
                      type="button"
                      onClick={() => charges.remove(i)}
                      aria-label={`Remove charge ${i + 1}`}
                      className="mt-7 rounded-md p-2 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => charges.append({ description: '', amount: '' })}
                    disabled={charges.fields.length >= 20}
                  >
                    <Plus className="size-4" /> Add extra charge
                  </Button>
                </div>
                <div className="grid max-w-70 grid-cols-1">
                  <MoneyField
                    label="Discount (₹)"
                    error={errors.discount?.message}
                    {...register('discount')}
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end rounded-lg border border-line bg-slate-50 px-4 py-3 text-[13px]">
                <span className="text-muted">Job total (before GST):&nbsp;</span>
                <b className={total < 0 ? 'text-red-600' : ''}>{formatPaise(total)}</b>
              </div>
            </div>
            <TextAreaField
              label="Internal notes"
              placeholder="Visible to your team only"
              error={errors.internalNotes?.message}
              {...register('internalNotes')}
            />
          </CardBody>
          <CardFooter>
            <span className="text-xs text-muted">
              {job ? job.jobNumber : 'Job number is assigned automatically.'}
            </span>
            <div className="flex gap-2">
              <Button onClick={() => navigate(back)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isSubmitting} disabled={noCustomers}>
                {job ? 'Save changes' : 'Create job'}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
