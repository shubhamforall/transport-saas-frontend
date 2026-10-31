import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Tenant } from '@/types/api';

export interface TenantInput {
  name: string;
  legalName?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  gstin?: string | null;
  stateCode?: string | null;
  jobNumberPrefix?: string;
  invoicePrefix?: string;
  defaultPaymentTermsDays?: number;
  defaultTaxRateBps?: number;
  defaultSacCode?: string | null;
  invoiceTerms?: string | null;
  paymentInstructions?: string | null;
}

export const tenantsApi = {
  list: () => api<{ items: Tenant[] }>('/tenants'),
  get: (tenantId: string, signal?: AbortSignal) =>
    api<Tenant>(`/tenants/${encodeURIComponent(tenantId)}`, { signal }),
  create: (body: TenantInput) => api<Tenant>('/tenants', { method: 'POST', body }),
  update: (tenantId: string, body: Partial<TenantInput>) =>
    api<Tenant>(`/tenants/${encodeURIComponent(tenantId)}`, { method: 'PATCH', body }),
};

export const tenantKey = (tenantId: string) => ['tenant', tenantId] as const;

export function useTenantQuery(tenantId: string) {
  return useQuery({
    queryKey: tenantKey(tenantId),
    queryFn: ({ signal }) => tenantsApi.get(tenantId, signal),
  });
}
