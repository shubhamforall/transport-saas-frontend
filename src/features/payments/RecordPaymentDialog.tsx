import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { METHODS } from './methods';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { MoneyField } from '@/components/ui/MoneyField';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/toast-context';
import { formatPaise } from '@/lib/format';
import { applyServerErrors } from '@/lib/form-errors';
import { paiseToInput, parseRupees } from '@/lib/money';
import { rupeesField } from '@/lib/money-field';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { InvoiceListItem, Paged, Payment } from '@/types/api';

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

const schema = z.object({
  invoiceId: z.string().min(1, 'Choose an invoice'),
  paymentDate: z.string().min(1, 'Enter the payment date'),
  amount: rupeesField({
    required: true,
    positive: true,
    requiredMessage: 'Enter the amount received',
  }),
  method: z.string(),
  reference: z.string().trim().max(100),
  notes: z.string().trim().max(1000),
});
type Values = z.input<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Preselected invoice (from the invoice page). Without it, the user picks an open invoice. */
  invoice?: { id: string; invoiceNumber: string | null; balanceMinor: number };
}

export function RecordPaymentDialog({ open, onClose, invoice }: Props) {
  return open ? <Dialog onClose={onClose} invoice={invoice} /> : null;
}

function Dialog({ onClose, invoice }: Omit<Props, 'open'>) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const open = useTenantQuery<Paged<InvoiceListItem>>(
    ['invoices', 'open'],
    '/invoices?status=ISSUED,PARTIALLY_PAID&pageSize=100&sort=invoiceDate&order=asc',
    { enabled: !invoice },
  );
  const record = useTenantMutation<Record<string, unknown>, Payment>('POST', '/payments', [
    'payments',
    'invoices',
    'dashboard',
  ]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      invoiceId: invoice?.id ?? '',
      paymentDate: today(),
      amount: invoice ? paiseToInput(invoice.balanceMinor) : '',
      method: 'UPI',
      reference: '',
      notes: '',
    },
  });
  const selectedId = useWatch({ control, name: 'invoiceId' });
  const balance =
    invoice?.balanceMinor ?? open.data?.items.find((i) => i.id === selectedId)?.balanceMinor;

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await record.mutateAsync({
        invoiceId: v.invoiceId,
        paymentDate: v.paymentDate,
        amountMinor: parseRupees(v.amount),
        method: v.method,
        reference: v.reference || null,
        notes: v.notes || null,
      });
      toast.success('Payment recorded.');
      onClose();
    } catch (err) {
      setFormError(
        applyServerErrors(
          err,
          setError,
          ['invoiceId', 'paymentDate', 'method', 'reference', 'notes', 'amount'],
          { amountMinor: 'amount' },
        ),
      );
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Record payment"
      description={
        invoice
          ? `Against ${invoice.invoiceNumber}`
          : 'Money received from a customer against an invoice.'
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Notice tone="error">{formError}</Notice>}
        {!invoice && (
          <SelectField
            label="Invoice"
            required
            error={errors.invoiceId?.message}
            {...register('invoiceId')}
          >
            <option value="">
              {open.isPending
                ? 'Loading…'
                : open.data?.items.length
                  ? 'Select an unpaid invoice'
                  : 'No unpaid invoices'}
            </option>
            {open.data?.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.invoiceNumber} · {i.customer.name} · due {formatPaise(i.balanceMinor)}
              </option>
            ))}
          </SelectField>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <MoneyField
            label="Amount received (₹)"
            required
            hint={balance !== undefined ? `Balance due: ${formatPaise(balance)}` : undefined}
            error={errors.amount?.message}
            {...register('amount')}
          />
          <TextField
            label="Payment date"
            type="date"
            required
            error={errors.paymentDate?.message}
            {...register('paymentDate')}
          />
          <SelectField label="Method" {...register('method')}>
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Reference / UTR / cheque no."
            error={errors.reference?.message}
            {...register('reference')}
          />
        </div>
        <TextAreaField label="Notes" {...register('notes')} />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Record payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
