import type { BadgeTone } from './Badge';

export const STATUS_MAP: Record<string, [string, BadgeTone]> = {
  // customers / vehicles / members
  ACTIVE: ['Active', 'green'],
  ARCHIVED: ['Archived', 'slate'],
  INACTIVE: ['Inactive', 'slate'],
  // jobs
  DRAFT: ['Draft', 'slate'],
  BOOKED: ['Booked', 'blue'],
  IN_TRANSIT: ['In transit', 'amber'],
  DELIVERED: ['Delivered', 'green'],
  CANCELLED: ['Cancelled', 'red'],
  NOT_INVOICED: ['Not invoiced', 'slate'],
  IN_DRAFT: ['On draft invoice', 'blue'],
  INVOICED: ['Invoiced', 'green'],
  // invoices
  ISSUED: ['Issued', 'blue'],
  PARTIALLY_PAID: ['Partly paid', 'amber'],
  PAID: ['Paid', 'green'],
  OVERDUE: ['Overdue', 'red'],
  // payments / email
  RECORDED: ['Recorded', 'green'],
  VOIDED: ['Voided', 'red'],
  SENDING: ['Sending', 'amber'],
  SENT: ['Sent', 'green'],
  FAILED: ['Failed', 'red'],
  // subscriptions / tenants
  TRIAL: ['Trial', 'blue'],
  PENDING: ['Pending payment', 'amber'],
  PAST_DUE: ['Past due', 'amber'],
  EXPIRED: ['Expired', 'red'],
  SUSPENDED: ['Suspended', 'red'],
  PROCESSED: ['Processed', 'green'],
  IGNORED: ['Ignored', 'slate'],
  RECEIVED: ['Received', 'blue'],
};

export function statusLabel(status: string) {
  return STATUS_MAP[status]?.[0] ?? status;
}
