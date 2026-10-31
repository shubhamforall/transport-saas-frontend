import { api } from '@/lib/api';
import type { MeResponse } from '@/types/api';

/** Sign-up answer when the email still has to be confirmed with a code. */
export interface PendingVerification {
  verificationRequired: true;
  email: string;
  emailSent: boolean;
}

export function isPendingVerification(
  res: MeResponse | PendingVerification,
): res is PendingVerification {
  return 'verificationRequired' in res;
}

export const authApi = {
  me: (signal?: AbortSignal) => api<MeResponse>('/auth/me', { signal }),
  login: (body: { email: string; password: string }) =>
    api<MeResponse>('/auth/login', { method: 'POST', body }),
  register: (body: { name: string; email: string; password: string; invitationToken?: string }) =>
    api<MeResponse | PendingVerification>('/auth/register', { method: 'POST', body }),
  verifyEmail: (body: { email: string; code: string }) =>
    api<MeResponse>('/auth/verify-email', { method: 'POST', body }),
  resendVerification: (email: string) =>
    api<{ message: string }>('/auth/resend-verification', { method: 'POST', body: { email } }),
  updateProfile: (body: { name: string }) => api<MeResponse>('/auth/me', { method: 'PATCH', body }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api<void>('/auth/change-password', { method: 'POST', body }),
  logout: () => api<void>('/auth/logout', { method: 'POST' }),
};
