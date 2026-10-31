import { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { Building2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api';
import { lastTenant } from '@/features/auth/session';
import { useTenantQuery } from './api';
import { TenantContext, type TenantContextValue } from './tenant-context';

/** Loads the company in the URL. The server decides whether the user may see it. */
export function TenantLayout() {
  const { tenantId = '' } = useParams();
  const { data: tenant, error, isPending, refetch } = useTenantQuery(tenantId);

  useEffect(() => {
    if (tenant) lastTenant.set(tenant.id);
  }, [tenant]);

  const value = useMemo<TenantContextValue | null>(
    () => (tenant ? { tenant, can: (p) => tenant.myPermissions.includes(p) } : null),
    [tenant],
  );

  if (isPending) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner label="Opening company" />
      </div>
    );
  }

  if (!value) {
    const notFound = error instanceof ApiError && error.status === 404;
    const suspended = error instanceof ApiError && error.code === 'TENANT_SUSPENDED';
    if (notFound && lastTenant.get() === tenantId) lastTenant.clear();
    return (
      <div className="grid min-h-screen place-items-center p-6">
        <EmptyState
          icon={<Building2 className="size-5" />}
          title={
            notFound
              ? 'Company not found'
              : suspended
                ? 'Company suspended'
                : 'Could not open company'
          }
          description={
            notFound
              ? "This company doesn't exist or you don't have access to it."
              : (error?.message ?? 'Please try again.')
          }
          action={
            notFound || suspended ? (
              <Link to="/" className="text-sm font-semibold text-brand hover:underline">
                Go to my workspace
              </Link>
            ) : (
              <Button variant="primary" onClick={() => void refetch()}>
                Try again
              </Button>
            )
          }
        />
      </div>
    );
  }

  return (
    // key: switching company remounts the pages so no state leaks between companies.
    <TenantContext.Provider key={value.tenant.id} value={value}>
      <AppShell />
    </TenantContext.Provider>
  );
}
