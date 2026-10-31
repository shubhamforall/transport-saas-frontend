import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { ApiError } from '@/lib/api';
import type { MeResponse } from '@/types/api';
import { authApi } from './api';

export const sessionKey = ['session'] as const;

/**
 * The signed-in user, or null when signed out. Backed by GET /auth/me, so it always reflects
 * the server's view (cookies are HttpOnly and not readable here).
 */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }): Promise<MeResponse | null> => {
      try {
        return await authApi.me(signal);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
  });
}

/** Stores a fresh /auth/me response (after login, register or company creation). */
export function useSetSession() {
  const qc = useQueryClient();
  return useCallback((me: MeResponse | null) => qc.setQueryData(sessionKey, me), [qc]);
}

const LAST_TENANT_KEY = 'vaharo.lastTenantId';

/** Remembers the last company used. Only a UI hint; the server checks access on every request. */
export const lastTenant = {
  get: () => localStorage.getItem(LAST_TENANT_KEY),
  set: (id: string) => localStorage.setItem(LAST_TENANT_KEY, id),
  clear: () => localStorage.removeItem(LAST_TENANT_KEY),
};

/** Where to send a signed-in user who has no specific page in mind. */
export function homePathFor(me: MeResponse): string {
  if (me.memberships.length === 0) return '/onboarding';
  const last = lastTenant.get();
  const target = me.memberships.find((m) => m.tenantId === last) ?? me.memberships[0]!;
  return `/t/${target.tenantId}/dashboard`;
}
