import type { Role } from '@/types/api';

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  OPERATIONS: 'Operations',
  ACCOUNTS: 'Accounts',
  VIEWER: 'Viewer',
};
