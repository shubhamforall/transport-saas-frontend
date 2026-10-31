import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { Notice } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { applyServerErrors } from '@/lib/form-errors';
import { sessionKey } from '@/features/auth/session';
import { tenantKey, tenantsApi } from '@/features/tenants/api';
import { CompanyFields } from '@/features/tenants/CompanyFields';
import {
  COMPANY_FIELDS,
  companySchema,
  toTenantInput,
  type CompanyFormValues,
} from '@/features/tenants/schemas';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import type { Tenant } from '@/types/api';
import { InvoiceSettingsCard } from './InvoiceSettingsCard';

function toFormValues(t: Tenant): CompanyFormValues {
  return {
    name: t.name,
    legalName: t.legalName ?? '',
    phone: t.phone ?? '',
    email: t.email ?? '',
    addressLine1: t.addressLine1 ?? '',
    addressLine2: t.addressLine2 ?? '',
    city: t.city ?? '',
    stateCode: t.stateCode ?? '',
    postalCode: t.postalCode ?? '',
    gstin: t.gstin ?? '',
  };
}

export function CompanySettingsPage() {
  const { tenant, can } = useCurrentTenant();
  const canEdit = can('tenant.update');
  const qc = useQueryClient();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: toFormValues(tenant),
  });

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const updated = await tenantsApi.update(tenant.id, toTenantInput(values));
      qc.setQueryData(tenantKey(tenant.id), updated);
      void qc.invalidateQueries({ queryKey: sessionKey }); // company name appears in the switcher
      reset(toFormValues(updated));
      toast.success('Company details saved.');
    } catch (err) {
      setFormError(applyServerErrors(err, setError, COMPANY_FIELDS));
    }
  });

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Company settings"
        description="These details appear on your invoices. Invoice numbering and defaults are below; your plan is under Billing."
      />
      <form onSubmit={onSubmit} noValidate className="max-w-225">
        <Card>
          <CardHeader
            title="Company profile"
            description={
              canEdit
                ? 'Fields marked * are required.'
                : 'Only an Owner or Admin can change these details.'
            }
          />
          <CardBody className="flex flex-col gap-5">
            {formError && <Notice tone="error">{formError}</Notice>}
            <CompanyFields
              register={register}
              errors={errors}
              disabled={!canEdit || isSubmitting}
            />
          </CardBody>
          <CardFooter>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Lock className="size-3.5" aria-hidden /> Visible only to members of this company.
            </span>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  onClick={() => reset(toFormValues(tenant))}
                  disabled={!isDirty || isSubmitting}
                >
                  Discard changes
                </Button>
                <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
                  Save changes
                </Button>
              </div>
            )}
          </CardFooter>
        </Card>
      </form>
      <InvoiceSettingsCard />
    </>
  );
}
