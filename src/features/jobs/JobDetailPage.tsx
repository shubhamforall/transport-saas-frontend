import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { FileText, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/button-class';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BackLink, DetailList } from '@/components/ui/Detail';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { statusLabel } from '@/components/ui/status-label';
import { useToast } from '@/components/ui/toast-context';
import { ApiError } from '@/lib/api';
import { formatDate, formatPaise } from '@/lib/format';
import { bpsToPercent, milliToInput } from '@/lib/money';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Invoice, Job, JobStatus } from '@/types/api';

const ACTION_LABEL: Record<JobStatus, string> = {
  DRAFT: 'Move back to draft',
  BOOKED: 'Mark booked',
  IN_TRANSIT: 'Start trip (in transit)',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel job',
};

export function JobDetailPage() {
  const { jobId = '' } = useParams();
  const { tenant, can } = useCurrentTenant();
  const navigate = useNavigate();
  const toast = useToast();
  const [target, setTarget] = useState<JobStatus | null>(null);
  const { data: job, isPending } = useTenantQuery<Job>(['jobs', jobId], `/jobs/${jobId}`);
  const change = useTenantMutation<{ status: JobStatus; note?: string; date?: string }, Job>(
    'POST',
    `/jobs/${jobId}/status`,
    ['jobs', 'dashboard'],
  );
  const invoice = useTenantMutation<{ jobIds: string[] }, Invoice>('POST', '/invoices', [
    'invoices',
    'jobs',
  ]);
  const base = `/t/${tenant.id}`;

  if (isPending) return <Spinner label="Loading job" />;
  if (!job)
    return (
      <EmptyState
        title="Job not found"
        action={
          <Link to={`${base}/jobs`} className="text-sm font-semibold text-brand">
            All jobs
          </Link>
        }
      />
    );

  const canEdit =
    can('jobs.write') && job.invoiceState === 'NOT_INVOICED' && job.status !== 'CANCELLED';
  const canInvoice =
    can('invoices.write') && job.status === 'DELIVERED' && job.invoiceState === 'NOT_INVOICED';

  const createInvoice = async () => {
    try {
      const inv = await invoice.mutateAsync({ jobIds: [job.id] });
      toast.success('Draft invoice created from this job.');
      navigate(`${base}/invoices/${inv.id}/edit`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create the invoice.');
    }
  };

  return (
    <>
      <BackLink to={`${base}/jobs`} label="All jobs" />
      <PageHeader
        eyebrow={`Booked ${formatDate(job.bookingDate)}`}
        title={`${job.jobNumber} · ${job.originCity} → ${job.destinationCity}`}
        description={
          <span className="flex flex-wrap gap-2">
            <StatusBadge status={job.status} />
            {job.status === 'DELIVERED' && <StatusBadge status={job.invoiceState} />}
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {canInvoice && (
              <Button
                variant="primary"
                onClick={() => void createInvoice()}
                loading={invoice.isPending}
              >
                <FileText className="size-4" /> Create invoice
              </Button>
            )}
            {job.invoice && (
              <Link to={`${base}/invoices/${job.invoice.id}`} className={buttonClass()}>
                <FileText className="size-4" aria-hidden />{' '}
                {job.invoice.invoiceNumber ?? 'Draft invoice'}
              </Link>
            )}
            {canEdit && (
              <Link to={`${base}/jobs/${job.id}/edit`} className={buttonClass()}>
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
            )}
          </div>
        }
      />

      {can('jobs.write') && job.allowedTransitions.length > 0 && (
        <Card className="mb-5">
          <CardBody className="flex flex-wrap items-center gap-2 py-4">
            <span className="mr-2 text-xs font-bold text-muted uppercase">Update status</span>
            {job.allowedTransitions.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={
                  s === 'CANCELLED'
                    ? 'secondary'
                    : s === 'DELIVERED' || s === 'IN_TRANSIT' || s === 'BOOKED'
                      ? 'primary'
                      : 'secondary'
                }
                onClick={() => setTarget(s)}
              >
                {ACTION_LABEL[s]}
              </Button>
            ))}
          </CardBody>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Assignment" />
            <CardBody>
              <DetailList
                items={[
                  [
                    'Customer',
                    <Link
                      key="c"
                      to={`${base}/customers/${job.customer.id}`}
                      className="text-brand hover:underline"
                    >
                      {job.customer.name}
                    </Link>,
                  ],
                  ['Vehicle', job.vehicle?.registrationNumberDisplay],
                  ['Driver', [job.driverName, job.driverPhone].filter(Boolean).join(' · ')],
                  ['Pickup', [job.originCity, job.originAddress].filter(Boolean).join('\n')],
                  [
                    'Delivery',
                    [job.destinationCity, job.destinationAddress].filter(Boolean).join('\n'),
                  ],
                  [
                    'Planned',
                    [
                      job.plannedPickupDate && `Pickup ${formatDate(job.plannedPickupDate)}`,
                      job.plannedDeliveryDate && `Delivery ${formatDate(job.plannedDeliveryDate)}`,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                  [
                    'Actual',
                    [
                      job.actualPickupDate && `Picked up ${formatDate(job.actualPickupDate)}`,
                      job.actualDeliveryDate && `Delivered ${formatDate(job.actualDeliveryDate)}`,
                    ]
                      .filter(Boolean)
                      .join(' · '),
                  ],
                  ['Goods', job.goodsDescription],
                  [
                    'Quantity',
                    job.quantityMilli !== null
                      ? `${milliToInput(job.quantityMilli)} ${job.quantityUnit ?? ''}`
                      : null,
                  ],
                  ['LR number', job.lrNumber],
                  ['Internal notes', job.internalNotes],
                ]}
              />
            </CardBody>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Charges" />
            <CardBody className="flex flex-col gap-2 text-[13px]">
              <Row label="Freight" value={formatPaise(job.freightAmountMinor)} />
              {job.charges.map((c) => (
                <Row key={c.id} label={c.description} value={formatPaise(c.amountMinor)} />
              ))}
              {job.discountAmountMinor > 0 && (
                <Row label="Discount" value={`- ${formatPaise(job.discountAmountMinor)}`} />
              )}
              <div className="mt-1 border-t border-line pt-2">
                <Row label={<b>Total before GST</b>} value={<b>{formatPaise(job.totalMinor)}</b>} />
              </div>
              {job.taxRateBps !== null && (
                <p className="text-xs text-muted">Suggested GST: {bpsToPercent(job.taxRateBps)}%</p>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="History" />
            <CardBody>
              <ol className="flex flex-col gap-3 border-l border-line pl-4 text-[13px]">
                {job.statusHistory?.map((e) => (
                  <li key={e.id} className="relative">
                    <span
                      className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-brand"
                      aria-hidden
                    />
                    <b>{statusLabel(e.toStatus)}</b>
                    <span className="text-muted">
                      {' '}
                      ·{' '}
                      {new Date(e.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    {e.note && <p className="text-xs text-muted">{e.note}</p>}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>

      <StatusDialog
        key={target ?? 'closed'}
        target={target}
        loading={change.isPending}
        onClose={() => setTarget(null)}
        onConfirm={async (note, date) => {
          if (!target) return;
          try {
            await change.mutateAsync({
              status: target,
              note: note || undefined,
              date: date || undefined,
            });
            toast.success(`Job marked ${statusLabel(target).toLowerCase()}.`);
            setTarget(null);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Could not update the status.');
          }
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="whitespace-nowrap">{value}</span>
    </div>
  );
}

function StatusDialog({
  target,
  loading,
  onClose,
  onConfirm,
}: {
  target: JobStatus | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (note: string, date: string) => void;
}) {
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const needsDate = target === 'IN_TRANSIT' || target === 'DELIVERED';
  return (
    <Modal
      open={target !== null}
      onClose={onClose}
      title={target ? ACTION_LABEL[target] : ''}
      description={
        target === 'CANCELLED' ? 'Cancelled jobs cannot be reopened or invoiced.' : undefined
      }
      footer={
        <>
          <Button onClick={onClose} disabled={loading}>
            Back
          </Button>
          <Button
            variant={target === 'CANCELLED' ? 'danger' : 'primary'}
            loading={loading}
            onClick={() => onConfirm(note, date)}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {needsDate && (
          <TextField
            label={target === 'DELIVERED' ? 'Delivery date' : 'Pickup date'}
            type="date"
            hint="Leave empty to use today."
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
        <TextAreaField
          label="Note (optional)"
          placeholder="e.g. POD received"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Modal>
  );
}
