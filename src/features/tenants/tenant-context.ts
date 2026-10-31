import { createContext, useContext } from 'react';
import type { Permission, Tenant } from '@/types/api';

export interface TenantContextValue {
  tenant: Tenant;
  /** UI hint only. The API enforces permissions on every request. */
  can: (permission: Permission) => boolean;
}

export const TenantContext = createContext<TenantContextValue | null>(null);

export function useCurrentTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error('useCurrentTenant must be used inside a tenant route');
  return ctx;
}
