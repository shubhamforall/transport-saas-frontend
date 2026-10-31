import { z } from 'zod';
import { parseRupees } from './money';

/** Largest single amount the API accepts: ₹1 crore (in paise). Mirrors the server. */
export const MAX_AMOUNT_MINOR = 1_000_000_000;

/**
 * A rupee amount typed as text ("12,000.50"). Blank is allowed unless `required`.
 * `positive` also rejects zero (e.g. a payment).
 */
export function rupeesField({
  required = false,
  positive = false,
  requiredMessage = 'Enter an amount in rupees',
}: { required?: boolean; positive?: boolean; requiredMessage?: string } = {}) {
  return z.string().superRefine((v, ctx) => {
    if (v.trim() === '') {
      if (required) ctx.addIssue({ code: 'custom', message: requiredMessage });
      return;
    }
    const paise = parseRupees(v);
    if (paise === null) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid amount, e.g. 12000 or 12000.50' });
    } else if (paise > MAX_AMOUNT_MINOR) {
      ctx.addIssue({ code: 'custom', message: 'Amount cannot be more than ₹1,00,00,000' });
    } else if (positive && paise === 0) {
      ctx.addIssue({ code: 'custom', message: 'Amount must be more than zero' });
    }
  });
}

/** Whole days from 0 to 365, or blank when not `required`. */
export function daysField(required = false) {
  return z
    .string()
    .trim()
    .refine(
      (v) => (v === '' ? !required : /^\d{1,3}$/.test(v) && Number(v) <= 365),
      'Enter whole days from 0 to 365',
    );
}
