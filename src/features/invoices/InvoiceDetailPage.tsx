import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Ban, Download, Mail, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { BackLink } from '@/components/ui/Detail';
import { TextAreaField, TextField } from '@/components/ui/Field';
import { EmptyState, Notice, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, Td, Th } from '@/components/ui/Table';
import { useToast } from '@/components/ui/toast-context';
import { ApiError, apiBlob } from '@/lib/api';
import { formatDate, formatPaise } from '@/lib/format';
import { stateName } from '@/lib/indian-states';
import { bpsToPercent, milliToInput } from '@/lib/money';
import { RecordPaymentDialog } from '@/features/payments/RecordPaymentDialog';
import { METHODS } from '@/features/payments/methods';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantApi, useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { EmailLog, Invoice, Party } from '@/types/api';

function PartyBlock({ title, p }: { title: string; p: Party }) {
  const lines = [
    p.legalName && p.legalName !== p.name ? p.legalName : null,
    p.addressLine1,
    p.addressLine2,
    [p.city, stateName(p.stateCode) ?? p.state, p.postalCode].filter(Boolean).join(', ') || null,
    p.gstin ? `GSTIN: ${p.gstin}` : null,
    p.email,
  ].filter(Boolean);
  return (
    <div>
      <p className="text-[11px] font-bold text-muted uppercase">{title}</p>
      <p className="mt-1 font-bold">{p.name}</p>
      <p className="text-xs leading-relaxed whitespace-pre-line text-muted">{lines.join('\n')}</p>
    </div>
  );
}

export function InvoiceDetailPage() {
  const { invoiceId = '' } = useParams();
  const { tenant, can } = useCurrentTenant();
  const toast = useToast();
  const { path } = useTenantApi();
  const [dialog, setDialog] = useState<'email' | 'payment' | 'cancel' | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const { data: inv, isPending } = useTenantQuery<Invoice>(
    ['invoices', invoiceId],
    `/invoices/${invoiceId}`,
  );
  const logs = useTenantQuery<{ items: EmailLog[] }>(
    ['invoices', invoiceId, 'email-logs'],
    `/invoices/${invoiceId}/email-logs`,
    { enabled: Boolean(inv && inv.status !== 'DRAFT') },
  );
  const base = `/t/${tenant.id}`;

  if (isPending) return <Spinner label="Loading invoice" />;
  if (!inv)
    return (
      <EmptyState
        title="Invoice not found"
        action={
          <Link to={`${base}/invoices`} className="text-sm font-semibold text-brand">
            All invoices
          </Link>
        }
      />
    );
  if (inv.status === 'DRAFT') return <Navigate to={`${base}/invoices/${inv.id}/edit`} replace />;

  const open = inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID';

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await apiBlob(path(`/invoices/${inv.id}/pdf`));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(inv.invoiceNumber ?? 'invoice').replace(/[^A-Za-z0-9-]/g, '-')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not download the PDF.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <BackLink to={`${base}/invoices`} label="All invoices" />
      <PageHeader
        eyebrow={`${inv.taxType === 'NONE' ? 'Invoice' : 'Tax invoice'} · ${formatDate(inv.invoiceDate)}`}
        title={`${inv.invoiceNumber} · ${inv.customer.name}`}
        description={<StatusBadge status={inv.displayStatus} />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void download()} loading={downloading}>
              <Download className="size-4" /> PDF
            </Button>
            {can('invoices.write') && inv.status !== 'CANCELLED' && (
              <Button onClick={() => setDialog('email')}>
                <Mail className="size-4" /> Email
              </Button>
            )}
            {can('payments.write') && open && (
              <Button variant="primary" onClick={() => setDialog('payment')}>
                <Wallet className="size-4" /> Record payment
              </Button>
            )}
            {can('invoices.write') && inv.status === 'ISSUED' && (
              <Button onClick={() => setDialog('cancel')}>
                <Ban className="size-4" /> Cancel
              </Button>
            )}
          </div>
        }
      />
      {inv.status === 'CANCELLED' && (
        <div className="mb-5">
          <Notice tone="error">
            Cancelled on{' '}
            {inv.cancelledAt ? new Date(inv.cancelledAt).toLocaleDateString('en-IN') : '—'}:{' '}
            {inv.cancellationReason}
          </Notice>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <Card>
          <CardBody className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <PartyBlock title="From" p={inv.from} />
              <PartyBlock title="Bill to" p={inv.billTo} />
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
              <span>
                Due: <b className="text-ink">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</b>
              </span>
              {inv.placeOfSupplyStateCode && (
                <span>
                  Place of supply:{' '}
                  <b className="text-ink">{stateName(inv.placeOfSupplyStateCode)}</b>
                </span>
              )}
              {inv.lastEmailedAt && (
                <span>
                  Last emailed:{' '}
                  <b className="text-ink">{new Date(inv.lastEmailedAt).toLocaleString('en-IN')}</b>
                </span>
              )}
            </div>
            {inv.jobs.length > 0 && (
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                {inv.jobs.map((j) => (
                  <p key={j.id}>
                    <Link
                      to={`${base}/jobs/${j.id}`}
                      className="font-bold text-brand hover:underline"
                    >
                      {j.jobNumber}
                    </Link>{' '}
                    · {j.originCity} → {j.destinationCity}
                    {j.vehicleRegistration && ` · ${j.vehicleRegistration}`}
                    {j.lrNumber && ` · LR ${j.lrNumber}`}
                  </p>
                ))}
              </div>
            )}
            <Table>
              <thead>
                <tr>
                  <Th>Description</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Rate</Th>
                  <Th className="text-right max-md:hidden">Taxable</Th>
                  {inv.taxType !== 'NONE' && <Th className="text-right max-md:hidden">GST</Th>}
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {inv.items.map((it, i) => (
                  <tr key={it.id ?? i}>
                    <Td>
                      {it.description}
                      {it.sacCode && (
                        <span className="block text-[11px] text-subtle">SAC {it.sacCode}</span>
                      )}
                    </Td>
                    <Td className="text-right">{milliToInput(it.quantityMilli)}</Td>
                    <Td className="text-right whitespace-nowrap">
                      {formatPaise(it.unitPriceMinor)}
                    </Td>
                    <Td className="text-right whitespace-nowrap max-md:hidden">
                      {formatPaise(it.taxableAmountMinor ?? 0)}
                    </Td>
                    {inv.taxType !== 'NONE' && (
                      <Td className="text-right max-md:hidden">{bpsToPercent(it.taxRateBps)}%</Td>
                    )}
                    <Td className="text-right whitespace-nowrap">
                      {formatPaise(it.lineTotalMinor ?? 0)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ml-auto grid w-full max-w-72 gap-2 text-[13px]">
              <Line label="Subtotal" v={inv.subtotalMinor} />
              {inv.discountMinor > 0 && <Line label="Discount" v={-inv.discountMinor} />}
              {inv.taxType === 'INTRA_STATE' && (
                <>
                  <Line label="CGST" v={inv.cgstMinor} />
                  <Line label="SGST" v={inv.sgstMinor} />
                </>
              )}
              {inv.taxType === 'INTER_STATE' && <Line label="IGST" v={inv.igstMinor} />}
              <div className="flex justify-between border-t border-line pt-2 text-base font-extrabold">
                <dt>Total</dt>
                <dd>{formatPaise(inv.grandTotalMinor)}</dd>
              </div>
              {inv.amountPaidMinor > 0 && <Line label="Paid" v={inv.amountPaidMinor} />}
              {inv.status !== 'CANCELLED' && (
                <div className="flex justify-between font-bold">
                  <dt>Balance due</dt>
                  <dd>{formatPaise(inv.balanceMinor)}</dd>
                </div>
              )}
            </dl>
            {(inv.notes || inv.terms) && (
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                {inv.notes && (
                  <p className="whitespace-pre-line">
                    <b className="block text-muted">Notes</b>
                    {inv.notes}
                  </p>
                )}
                {inv.terms && (
                  <p className="whitespace-pre-line">
                    <b className="block text-muted">Terms</b>
                    {inv.terms}
                  </p>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader title="Payments" />
            <CardBody className="text-[13px]">
              {inv.payments.length === 0 ? (
                <p className="text-muted">No payments recorded yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {inv.payments.map((p) => (
                    <li key={p.paymentId} className="flex items-start justify-between gap-3 py-2.5">
                      <span>
                        <b>{formatPaise(p.allocatedAmountMinor)}</b>
                        <span className="block text-xs text-muted">
                          {formatDate(p.paymentDate)} ·{' '}
                          {METHODS.find((m) => m.value === p.method)?.label ?? p.method}
                          {p.reference ? ` · ${p.reference}` : ''}
                        </span>
                      </span>
                      {can('payments.write') && (
                        <button
                          type="button"
                          onClick={() => setVoiding(p.paymentId)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Void
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Email history" />
            <CardBody className="text-[13px]">
              {!logs.data?.items.length ? (
                <p className="text-muted">Not emailed yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {logs.data.items.map((l) => (
                    <li key={l.id} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="min-w-0">
                        <span className="block truncate">{l.recipient}</span>
                        <span className="text-xs text-muted">
                          {new Date(l.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        {l.lastErrorSafe && (
                          <span className="block text-xs text-red-600">{l.lastErrorSafe}</span>
                        )}
                      </span>
                      <StatusBadge status={l.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <EmailDialog open={dialog === 'email'} invoice={inv} onClose={() => setDialog(null)} />
      <RecordPaymentDialog
        open={dialog === 'payment'}
        invoice={inv}
        onClose={() => setDialog(null)}
      />
      <ReasonDialog
        open={dialog === 'cancel'}
        title="Cancel this invoice?"
        message="The invoice stays in your records marked as cancelled; its number is never reused. Linked jobs become available to invoice again."
        confirmLabel="Cancel invoice"
        path={`/invoices/${inv.id}/cancel`}
        invalidate={['invoices', 'jobs', 'dashboard']}
        onClose={() => setDialog(null)}
        success="Invoice cancelled."
      />
      <ReasonDialog
        open={voiding !== null}
        title="Void this payment?"
        message="The amount is added back to the invoice balance. Use this for bounced cheques or mistakes."
        confirmLabel="Void payment"
        path={`/payments/${voiding}/void`}
        invalidate={['invoices', 'payments', 'dashboard']}
        onClose={() => setVoiding(null)}
        success="Payment voided."
      />
    </>
  );
}

function Line({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd>{v < 0 ? `- ${formatPaise(-v)}` : formatPaise(v)}</dd>
    </div>
  );
}

function EmailDialog({
  open,
  invoice,
  onClose,
}: {
  open: boolean;
  invoice: Invoice;
  onClose: () => void;
}) {
  if (!open) return null;
  return <EmailForm invoice={invoice} onClose={onClose} />;
}

function EmailForm({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const toast = useToast();
  const [to, setTo] = useState(invoice.customer.email ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const send = useTenantMutation<Record<string, unknown>, EmailLog>(
    'POST',
    `/invoices/${invoice.id}/email`,
    ['invoices'],
  );
  return (
    <Modal
      open
      onClose={onClose}
      title={`Email ${invoice.invoiceNumber}`}
      description="The PDF is attached. Sending again does not create a new invoice."
      footer={
        <>
          <Button onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={send.isPending}
            onClick={async () => {
              setError(null);
              try {
                await send.mutateAsync({
                  to: to.trim() || undefined,
                  message: message.trim() || undefined,
                });
                toast.success(`Invoice emailed to ${to}.`);
                onClose();
              } catch (err) {
                setError(
                  err instanceof ApiError
                    ? (Object.values(err.fieldErrors ?? {})[0]?.[0] ?? err.message)
                    : 'Could not send the email.',
                );
              }
            }}
          >
            Send email
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextField
          label="To"
          type="email"
          required
          value={to}
          onChange={(e) => setTo(e.target.value)}
          hint="Defaults to the customer's billing email."
        />
        <TextAreaField
          label="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Added to the standard email text"
        />
      </div>
    </Modal>
  );
}

interface ReasonDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  path: string;
  invalidate: string[];
  success: string;
  onClose: () => void;
}

function ReasonDialog(props: ReasonDialogProps) {
  if (!props.open) return null;
  return <ReasonForm {...props} />;
}

function ReasonForm({
  title,
  message,
  confirmLabel,
  path,
  invalidate,
  success,
  onClose,
}: ReasonDialogProps) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const run = useTenantMutation<{ reason: string }, unknown>('POST', path, invalidate);
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={message}
      footer={
        <>
          <Button onClick={onClose} disabled={run.isPending}>
            Back
          </Button>
          <Button
            variant="danger"
            loading={run.isPending}
            disabled={reason.trim().length < 3}
            onClick={async () => {
              setError(null);
              try {
                await run.mutateAsync({ reason: reason.trim() });
                toast.success(success);
                onClose();
              } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Something went wrong.');
              }
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <TextAreaField
          label="Reason"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Recorded in the audit log"
        />
      </div>
    </Modal>
  );
}
