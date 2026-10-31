import { useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
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
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { ApiError } from '@/lib/api';
import { formatDate, formatPaise } from '@/lib/format';
import { applyServerErrors } from '@/lib/form-errors';
import { useUnsavedChangesWarning } from '@/lib/hooks';
import { INDIAN_STATES, stateName } from '@/lib/indian-states';
import { previewTotals } from '@/lib/invoice-calc';
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
import type { Invoice, TaxType } from '@/types/api';

const money = (required: boolean) =>
  z
    .string()
    .refine(
      (v) => (v.trim() === '' ? !required : parseRupees(v) !== null),
      'Enter an amount in rupees',
    );

const line = z.object({
  description: z.string().trim().min(1, 'Describe the item').max(500),
  sacCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4,8}$/.test(v), '4-8 digits'),
  quantity: z.string().refine((v) => (parseMilli(v) ?? 0) > 0, 'Quantity must be more than 0'),
  rate: money(true),
  discount: money(false),
  taxRateBps: z.string(),
});

const schema = z
  .object({
    invoiceDate: z.string().min(1, 'Enter the invoice date'),
    dueDate: z.string(),
    taxType: z.enum(['NONE', 'INTRA_STATE', 'INTER_STATE']),
    placeOfSupplyStateCode: z.string(),
    items: z.array(line).max(100),
    notes: z.string().max(2000),
    terms: z.string().max(2000),
  })
  .refine((v) => !v.dueDate || v.dueDate >= v.invoiceDate, {
    message: 'Due date cannot be before the invoice date',
    path: ['dueDate'],
  });
type Values = z.input<typeof schema>;

const blankLine = (taxRateBps: number, sac: string | null) => ({
  description: '',
  sacCode: sac ?? '',
  quantity: '1',
  rate: '',
  discount: '',
  taxRateBps: String(taxRateBps),
});

function toValues(inv: Invoice, defaultBps: number, sac: string | null): Values {
  return {
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate ?? '',
    taxType: inv.taxType,
    placeOfSupplyStateCode: inv.placeOfSupplyStateCode ?? '',
    items: inv.items.length
      ? inv.items.map((i) => ({
          description: i.description,
          sacCode: i.sacCode ?? '',
          quantity: milliToInput(i.quantityMilli),
          rate: paiseToInput(i.unitPriceMinor),
          discount: i.discountMinor ? paiseToInput(i.discountMinor) : '',
          taxRateBps: String(i.taxRateBps || defaultBps),
        }))
      : [blankLine(defaultBps, sac)],
    notes: inv.notes ?? '',
    terms: inv.terms ?? '',
  };
}

export function InvoiceEditorPage() {
  const { invoiceId = '' } = useParams();
  const { tenant } = useCurrentTenant();
  const { data, isPending } = useTenantQuery<Invoice>(
    ['invoices', invoiceId],
    `/invoices/${invoiceId}`,
  );
  if (isPending) return <Spinner label="Loading invoice" />;
  if (!data) return <Notice tone="error">Invoice not found.</Notice>;
  if (data.status !== 'DRAFT')
    return <Navigate to={`/t/${tenant.id}/invoices/${data.id}`} replace />;
  return <Editor invoice={data} />;
}

function Editor({ invoice }: { invoice: Invoice }) {
  const { tenant } = useCurrentTenant();
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<{ message: string; problems?: string[] } | null>(null);
  const [confirm, setConfirm] = useState<'issue' | 'delete' | null>(null);
  const save = useTenantMutation<Record<string, unknown>, Invoice>(
    'PATCH',
    `/invoices/${invoice.id}`,
    ['invoices'],
  );
  const issue = useTenantMutation<void, Invoice>('POST', `/invoices/${invoice.id}/issue`, [
    'invoices',
    'jobs',
    'dashboard',
  ]);
  const remove = useTenantMutation<void, void>('DELETE', `/invoices/${invoice.id}`, [
    'invoices',
    'jobs',
  ]);
  const base = `/t/${tenant.id}/invoices`;

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(invoice, tenant.defaultTaxRateBps, tenant.defaultSacCode),
  });
  const items = useFieldArray({ control, name: 'items' });
  const w = useWatch({ control });
  useUnsavedChangesWarning(isDirty && !isSubmitting);

  const taxType = (w.taxType ?? 'NONE') as TaxType;
  const preview = previewTotals(
    (w.items ?? []).map((i) => ({
      quantityMilli: parseMilli(i?.quantity ?? '') ?? 0,
      unitPriceMinor: parseRupees(i?.rate ?? '') ?? 0,
      discountMinor: parseRupees(i?.discount ?? '') ?? 0,
      taxRateBps: Number(i?.taxRateBps ?? 0),
    })),
    taxType,
  );
  const pos = w.placeOfSupplyStateCode;
  const suggested: TaxType | null =
    tenant.stateCode && pos ? (tenant.stateCode === pos ? 'INTRA_STATE' : 'INTER_STATE') : null;

  const body = (v: Values) => ({
    invoiceDate: v.invoiceDate,
    dueDate: v.dueDate || null,
    taxType: v.taxType,
    placeOfSupplyStateCode: v.placeOfSupplyStateCode || null,
    notes: v.notes.trim() || null,
    terms: v.terms.trim() || null,
    items: v.items.map((i) => ({
      description: i.description.trim(),
      sacCode: i.sacCode.trim() || null,
      quantityMilli: parseMilli(i.quantity),
      unitPriceMinor: parseRupees(i.rate),
      discountMinor: parseRupees(i.discount) ?? 0,
      taxRateBps: Number(i.taxRateBps),
    })),
  });

  const handleError = (err: unknown) => {
    if (err instanceof ApiError && err.code === 'INVOICE_INCOMPLETE') {
      setFormError({ message: err.message, problems: Object.values(err.fieldErrors ?? {}).flat() });
      return;
    }
    const msg = applyServerErrors(err, setError, [
      'invoiceDate',
      'dueDate',
      'taxType',
      'placeOfSupplyStateCode',
      'notes',
      'terms',
    ]);
    if (msg) setFormError({ message: msg });
  };

  const onSave = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(body(v));
      reset(toValues(saved, tenant.defaultTaxRateBps, tenant.defaultSacCode));
      toast.success('Draft saved.');
    } catch (err) {
      handleError(err);
    }
  });

  const onIssue = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await save.mutateAsync(body(v));
      reset(v);
      const issued = await issue.mutateAsync();
      toast.success(`Invoice ${issued.invoiceNumber} issued.`);
      navigate(`${base}/${issued.id}`);
    } catch (err) {
      handleError(err);
    } finally {
      setConfirm(null);
    }
  });

  return (
    <>
      <BackLink to={base} label="All invoices" />
      <PageHeader
        eyebrow="Billing & collections"
        title={`Draft invoice · ${invoice.customer.name}`}
        description="Review the lines, then issue. The invoice number is assigned when you issue it."
      />
      {invoice.jobs.length > 0 && (
        <p className="-mt-3 mb-4 text-xs text-muted">
          Billing {invoice.jobs.map((j) => j.jobNumber).join(', ')}. Deleting this draft makes the
          job{invoice.jobs.length > 1 ? 's' : ''} billable again.
        </p>
      )}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <form onSubmit={onSave} noValidate>
          <Card>
            <CardHeader title="Invoice details" description="Draft → review → issue and email" />
            <CardBody className="flex flex-col gap-6">
              {formError && (
                <Notice tone="error">
                  {formError.message}
                  {formError.problems && (
                    <ul className="mt-1 list-disc pl-4">
                      {formError.problems.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  )}
                  {formError.problems?.some(
                    (p) => p.includes('Company settings') || p.includes('GSTIN'),
                  ) && (
                    <Link
                      to={`/t/${tenant.id}/settings`}
                      className="mt-1 inline-block font-semibold underline"
                    >
                      Open Company settings
                    </Link>
                  )}
                </Notice>
              )}
              <FieldGrid>
                <TextField
                  label="Invoice date"
                  type="date"
                  required
                  error={errors.invoiceDate?.message}
                  {...register('invoiceDate')}
                />
                <TextField
                  label="Payment due date"
                  type="date"
                  error={errors.dueDate?.message}
                  {...register('dueDate')}
                />
                <SelectField
                  label="Place of supply"
                  hint="Customer's state, used to choose CGST+SGST or IGST."
                  error={errors.placeOfSupplyStateCode?.message}
                  {...register('placeOfSupplyStateCode')}
                >
                  <option value="">Not set</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Tax"
                  hint={
                    suggested && suggested !== taxType && taxType !== 'NONE'
                      ? `Suggested: ${suggested === 'INTRA_STATE' ? 'CGST + SGST (same state)' : 'IGST (other state)'}`
                      : 'Confirm GST treatment with your tax adviser.'
                  }
                  error={errors.taxType?.message}
                  {...register('taxType')}
                >
                  <option value="NONE">No GST on this invoice</option>
                  <option value="INTRA_STATE">CGST + SGST (same state)</option>
                  <option value="INTER_STATE">IGST (other state)</option>
                </SelectField>
              </FieldGrid>

              <div>
                <SectionTitle>Invoice items</SectionTitle>
                <div className="flex flex-col gap-4">
                  {items.fields.map((f, i) => (
                    <div key={f.id} className="rounded-lg border border-line p-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_110px]">
                        <TextField
                          label={`Line ${i + 1} description`}
                          error={errors.items?.[i]?.description?.message}
                          {...register(`items.${i}.description`)}
                        />
                        <TextField
                          label="SAC"
                          inputMode="numeric"
                          error={errors.items?.[i]?.sacCode?.message}
                          {...register(`items.${i}.sacCode`)}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[90px_1fr_1fr_100px_auto]">
                        <TextField
                          label="Qty"
                          inputMode="decimal"
                          error={errors.items?.[i]?.quantity?.message}
                          {...register(`items.${i}.quantity`)}
                        />
                        <TextField
                          label="Rate (₹)"
                          inputMode="decimal"
                          error={errors.items?.[i]?.rate?.message}
                          {...register(`items.${i}.rate`)}
                        />
                        <TextField
                          label="Discount (₹)"
                          inputMode="decimal"
                          error={errors.items?.[i]?.discount?.message}
                          {...register(`items.${i}.discount`)}
                        />
                        <SelectField
                          label="GST"
                          disabled={taxType === 'NONE'}
                          {...register(`items.${i}.taxRateBps`)}
                        >
                          {GST_RATES.map((r) => (
                            <option key={r} value={r}>
                              {bpsToPercent(r)}%
                            </option>
                          ))}
                        </SelectField>
                        <div className="flex items-end justify-between gap-2 sm:flex-col sm:items-end">
                          <span className="text-xs whitespace-nowrap text-muted">
                            {formatPaise(preview.lineTotals[i] ?? 0)}
                          </span>
                          <button
                            type="button"
                            onClick={() => items.remove(i)}
                            disabled={items.fields.length === 1}
                            aria-label={`Remove line ${i + 1}`}
                            className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        items.append(blankLine(tenant.defaultTaxRateBps, tenant.defaultSacCode))
                      }
                    >
                      <Plus className="size-4" /> Add line item
                    </Button>
                  </div>
                </div>
              </div>
              <TextAreaField
                label="Notes"
                placeholder="Shown on the invoice"
                {...register('notes')}
              />
              <TextAreaField
                label="Terms"
                placeholder="Payment terms shown on the invoice"
                {...register('terms')}
              />
            </CardBody>
            <CardFooter>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => setConfirm('delete')}
              >
                Delete draft
              </Button>
              <div className="flex gap-2">
                <Button type="submit" loading={save.isPending && !confirm}>
                  Save draft
                </Button>
                <Button variant="primary" onClick={() => setConfirm('issue')}>
                  Issue invoice →
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>

        <Card className="p-5 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-wide text-slate-700 uppercase">
              Live preview
            </span>
            <span className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-bold text-orange-700">
              DRAFT
            </span>
          </div>
          <div className="mt-4 flex justify-between gap-3 border-b border-line pb-4">
            <div>
              <h3 className="text-[15px] font-bold">{invoice.from.name}</h3>
              <p className="text-[11px] leading-relaxed text-muted">
                {[invoice.from.city, stateName(invoice.from.stateCode)].filter(Boolean).join(', ')}
                {invoice.from.gstin && (
                  <>
                    <br />
                    GSTIN: {invoice.from.gstin}
                  </>
                )}
              </p>
            </div>
            <div className="text-right text-[15px] font-black">
              {taxType === 'NONE' ? 'INVOICE' : 'TAX INVOICE'}
              <p className="text-[11px] font-normal text-muted">Draft</p>
            </div>
          </div>
          <div className="mt-4 text-[11px]">
            <b className="block text-xs">Bill to</b>
            <p className="leading-relaxed text-muted">
              <b className="text-ink">{invoice.billTo.name}</b>
              {invoice.billTo.city && (
                <>
                  <br />
                  {invoice.billTo.city}
                </>
              )}
              {invoice.billTo.gstin && (
                <>
                  <br />
                  GSTIN: {invoice.billTo.gstin}
                </>
              )}
            </p>
            <p className="mt-2 text-muted">
              Date: <b className="text-ink">{w.invoiceDate ? formatDate(w.invoiceDate) : '—'}</b> ·
              Due: <b className="text-ink">{w.dueDate ? formatDate(w.dueDate) : '—'}</b>
            </p>
          </div>
          <table className="mt-4 w-full text-[11px]">
            <tbody>
              {(w.items ?? []).map((it, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-2 pr-2">{it?.description || 'Item'}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {formatPaise(preview.lineTotals[i] ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 grid gap-2 text-xs text-slate-600">
            <PreviewRow label="Subtotal" value={preview.subtotalMinor} />
            {preview.discountMinor > 0 && (
              <PreviewRow label="Discount" value={-preview.discountMinor} />
            )}
            {taxType === 'INTRA_STATE' && (
              <>
                <PreviewRow label="CGST" value={preview.cgstMinor} />
                <PreviewRow label="SGST" value={preview.sgstMinor} />
              </>
            )}
            {taxType === 'INTER_STATE' && <PreviewRow label="IGST" value={preview.igstMinor} />}
            <div className="mt-1 flex justify-between border-t border-line pt-3 text-base font-extrabold text-ink">
              <dt>Total due</dt>
              <dd>{formatPaise(preview.grandTotalMinor)}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-muted">
            Preview only. The server recalculates every total when you save and issue. GST rules
            should be confirmed with a tax professional.
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirm === 'issue'}
        title="Issue this invoice?"
        message="An invoice number will be assigned and the invoice can no longer be edited. If something is wrong later, you can cancel it with a reason and create a new one."
        confirmLabel="Issue invoice"
        loading={save.isPending || issue.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void onIssue()}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        title="Delete this draft?"
        message="The draft will be deleted. Any linked jobs become available for invoicing again."
        confirmLabel="Delete draft"
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          try {
            await remove.mutateAsync();
            toast.success('Draft deleted.');
            navigate(base);
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Could not delete the draft.');
            setConfirm(null);
          }
        }}
      />
    </>
  );
}

function PreviewRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd>{value < 0 ? `- ${formatPaise(-value)}` : formatPaise(value)}</dd>
    </div>
  );
}
