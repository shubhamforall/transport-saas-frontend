import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { daysField } from '@/lib/money-field';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { FieldGrid, SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/toast-context';
import { applyServerErrors } from '@/lib/form-errors';
import { GST_RATES, bpsToPercent } from '@/lib/money';
import { tenantKey, tenantsApi } from '@/features/tenants/api';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import type { Tenant } from '@/types/api';

const schema = z.object({
  jobNumberPrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9/-]{1,10}$/, '1-10 letters, digits, "-" or "/"'),
  invoicePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,5}$/, '1-5 letters or digits'),
  defaultPaymentTermsDays: daysField(true),
  defaultTaxRateBps: z.string(),
  defaultSacCode: z
    .string()
    .trim()
    .refine((v) => v === '' || /^\d{4,8}$/.test(v), '4 to 8 digits'),
  invoiceTerms: z.string().max(2000),
  paymentInstructions: z.string().max(2000),
});
type Values = z.input<typeof schema>;
const FIELDS = Object.keys(schema.shape) as (keyof Values)[];

const toValues = (t: Tenant): Values => ({
  jobNumberPrefix: t.jobNumberPrefix,
  invoicePrefix: t.invoicePrefix,
  defaultPaymentTermsDays: String(t.defaultPaymentTermsDays),
  defaultTaxRateBps: String(t.defaultTaxRateBps),
  defaultSacCode: t.defaultSacCode ?? '',
  invoiceTerms: t.invoiceTerms ?? '',
  paymentInstructions: t.paymentInstructions ?? '',
});

export function InvoiceSettingsCard() {
  const { tenant, can } = useCurrentTenant();
  const canEdit = can('tenant.update');
  const qc = useQueryClient();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: toValues(tenant),
  });
  const prefixes = useWatch({ control, name: ['jobNumberPrefix', 'invoicePrefix'] });
  const fy = (() => {
    const d = new Date();
    const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${String(y % 100).padStart(2, '0')}-${String((y + 1) % 100).padStart(2, '0')}`;
  })();

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const updated = await tenantsApi.update(tenant.id, {
        jobNumberPrefix: v.jobNumberPrefix,
        invoicePrefix: v.invoicePrefix,
        defaultPaymentTermsDays: Number(v.defaultPaymentTermsDays),
        defaultTaxRateBps: Number(v.defaultTaxRateBps),
        defaultSacCode: v.defaultSacCode.trim() || null,
        invoiceTerms: v.invoiceTerms.trim() || null,
        paymentInstructions: v.paymentInstructions.trim() || null,
      });
      qc.setQueryData(tenantKey(tenant.id), updated);
      reset(toValues(updated));
      toast.success('Invoice settings saved.');
    } catch (err) {
      setFormError(applyServerErrors(err, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="mt-5 max-w-225">
      <Card>
        <CardHeader
          title="Invoices & jobs"
          description="Numbering, defaults and what is printed on invoices."
        />
        <CardBody className="flex flex-col gap-5">
          {formError && <Notice tone="error">{formError}</Notice>}
          <fieldset disabled={!canEdit || isSubmitting}>
            <FieldGrid>
              <TextField
                label="Job number prefix"
                hint={`Next jobs look like ${prefixes[0] || 'JOB-'}0001.`}
                error={errors.jobNumberPrefix?.message}
                {...register('jobNumberPrefix')}
              />
              <TextField
                label="Invoice prefix"
                hint={`Invoices look like ${prefixes[1] || 'INV'}/${fy}/0001 (restarts each April).`}
                error={errors.invoicePrefix?.message}
                {...register('invoicePrefix')}
              />
              <TextField
                label="Default payment terms (days)"
                inputMode="numeric"
                error={errors.defaultPaymentTermsDays?.message}
                {...register('defaultPaymentTermsDays')}
              />
              <SelectField
                label="Default GST rate"
                hint="Not a tax recommendation. Confirm rates with your tax adviser."
                {...register('defaultTaxRateBps')}
              >
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r === 0 ? 'No GST by default' : `${bpsToPercent(r)}%`}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Default SAC code"
                placeholder="e.g. 996511"
                error={errors.defaultSacCode?.message}
                {...register('defaultSacCode')}
              />
              <TextAreaField
                label="Payment instructions"
                full
                placeholder="Bank name, account no., IFSC, UPI ID"
                hint="Printed on every invoice and included in invoice emails."
                {...register('paymentInstructions')}
              />
              <TextAreaField
                label="Default invoice terms"
                full
                placeholder="e.g. Payment within 30 days."
                {...register('invoiceTerms')}
              />
            </FieldGrid>
          </fieldset>
        </CardBody>
        {canEdit && (
          <CardFooter>
            <span className="text-xs text-muted">Changes apply to new jobs and invoices only.</span>
            <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
              Save settings
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
