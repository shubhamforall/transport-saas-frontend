import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { applyServerErrors } from '@/lib/form-errors';
import { lastTenant, sessionKey } from '@/features/auth/session';
import type { Tenant } from '@/types/api';
import { tenantKey, tenantsApi } from './api';
import { CompanyFields } from './CompanyFields';
import {
  COMPANY_FIELDS,
  companySchema,
  emptyCompany,
  toTenantInput,
  type CompanyFormValues,
} from './schemas';

interface Props {
  onCreated: (tenant: Tenant) => void;
  /** Shown next to the submit button (popup only). */
  onCancel?: () => void;
}

/** Creates a company; used by the onboarding page and the "New company" popup. */
export function CreateCompanyForm({ onCreated, onCancel }: Props) {
  const qc = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: emptyCompany,
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const tenant = await tenantsApi.create(toTenantInput(values));
      qc.setQueryData(tenantKey(tenant.id), tenant);
      await qc.invalidateQueries({ queryKey: sessionKey });
      lastTenant.set(tenant.id);
      onCreated(tenant);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, COMPANY_FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {formError && <Notice tone="error">{formError}</Notice>}
      <CompanyFields register={register} errors={errors} variant="onboarding" />
      <p className="text-[11px] text-subtle">
        You'll be the Owner of this company. You can add the address and contact details later in
        Company Settings.
      </p>
      {onCancel ? (
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Create company
          </Button>
        </div>
      ) : (
        <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
          Create company workspace
        </Button>
      )}
    </form>
  );
}
