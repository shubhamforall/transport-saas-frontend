import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type RequestOptions } from '@/lib/api';
import { useCurrentTenant } from './tenant-context';

/** API helpers scoped to the current company: paths are relative to /tenants/:tenantId. */
export function useTenantApi() {
  const { tenant } = useCurrentTenant();
  const prefix = `/tenants/${encodeURIComponent(tenant.id)}`;
  return {
    tenantId: tenant.id,
    get: <T>(path: string, signal?: AbortSignal) => api<T>(`${prefix}${path}`, { signal }),
    send: <T>(method: NonNullable<RequestOptions['method']>, path: string, body?: unknown) =>
      api<T>(`${prefix}${path}`, { method, body }),
    path: (p: string) => `${prefix}${p}`,
  };
}

/** GET a company resource. Key includes the company id so data never mixes between companies. */
export function useTenantQuery<T>(
  key: readonly unknown[],
  path: string,
  opts: { enabled?: boolean; keepPrevious?: boolean } = {},
) {
  const { tenantId, get } = useTenantApi();
  return useQuery({
    queryKey: [tenantId, ...key, path],
    queryFn: ({ signal }) => get<T>(path, signal),
    enabled: opts.enabled,
    placeholderData: opts.keepPrevious ? keepPreviousData : undefined,
  });
}

/** Mutation that refreshes the given query groups (e.g. ['customers']) when it succeeds. */
export function useTenantMutation<TBody, TResult>(
  method: NonNullable<RequestOptions['method']>,
  path: string | ((body: TBody) => string),
  invalidate: string[],
) {
  const { tenantId, send } = useTenantApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TBody) =>
      send<TResult>(method, typeof path === 'function' ? path(body) : path, body),
    onSuccess: async () => {
      await Promise.all(invalidate.map((k) => qc.invalidateQueries({ queryKey: [tenantId, k] })));
    },
  });
}
