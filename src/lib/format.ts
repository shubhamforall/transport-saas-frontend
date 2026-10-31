const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
});

/** Formats integer paise as rupees, e.g. 1200000 -> "₹12,000.00". */
export function formatPaise(paise: number): string {
  if (!Number.isInteger(paise)) throw new Error('Money must be integer paise');
  return inr.format(paise / 100);
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/** Formats an ISO date string for Indian users, e.g. "28 Oct 2026". */
export function formatDate(iso: string | Date, timeZone = 'Asia/Kolkata'): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return timeZone === 'Asia/Kolkata'
    ? dateFmt.format(d)
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone,
      }).format(d);
}

/** Two-letter initials for avatars. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}
