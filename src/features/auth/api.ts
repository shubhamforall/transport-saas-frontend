import { api } from '@/lib/api';
import type { MeResponse } from '@/types/api';

export const authApi = {
  me: (signal?: AbortSignal) => api<MeResponse>('/auth/me', { signal }),
  login: (body: { email: string; password: string }) =>
    api<MeResponse>('/auth/login', { method: 'POST', body }),
  register: (body: { name: string; email: string; password: string }) =>
    api<MeResponse>('/auth/register', { method: 'POST', body }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
};
