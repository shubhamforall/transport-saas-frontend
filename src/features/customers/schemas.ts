import { z } from 'zod';
import { stateName } from '@/lib/indian-states';
import { GSTIN_REGEX } from '@/features/tenants/schemas';
import type { Customer } from '@/types/api';

// Mirrors server validation; the API re-validates everything.
export const customerSchema = z
  .object({
    customerType: z.enum(['BUSINESS', 'INDIVIDUAL']),
    name: z.string().trim().min(2, 'Enter the customer name').max(200),
    contactPerson: z.string().trim().max(120),
    phone: z
      .string()
      .trim()
      .refine(
        (v) => v === '' || /^\+?\d{7,15}$/.test(v.replace(/[\s-]/g, '')),
        'Enter a valid phone number',
      ),
    email: z
      .string()
      .trim()
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address'),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || GSTIN_REGEX.test(v), 'Enter a valid 15-character GSTIN'),
    addressLine1: z.string().trim().max(200),
    addressLine2: z.string().trim().max(200),
    city: z.string().trim().max(100),
    stateCode: z.string(),
    postalCode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[1-9][0-9]{5}$/.test(v), 'Enter a valid 6-digit PIN code'),
    paymentTermsDays: z.string(),
    notes: z.string().trim().max(2000),
  })
  .refine((v) => !v.gstin || !v.stateCode || v.gstin.toUpperCase().startsWith(v.stateCode), {
    message: 'GSTIN does not match the selected state',
    path: ['gstin'],
  });

export type CustomerFormValues = z.input<typeof customerSchema>;
export const CUSTOMER_FIELDS = [
  'customerType',
  'name',
  'contactPerson',
  'phone',
  'email',
  'gstin',
  'addressLine1',
  'addressLine2',
  'city',
  'stateCode',
  'postalCode',
  'paymentTermsDays',
  'notes',
] as const;

export function toCustomerForm(c?: Customer): CustomerFormValues {
  return {
    customerType: c?.customerType ?? 'BUSINESS',
    name: c?.name ?? '',
    contactPerson: c?.contactPerson ?? '',
    phone: c?.phone ?? '',
    email: c?.email ?? '',
    gstin: c?.gstin ?? '',
    addressLine1: c?.addressLine1 ?? '',
    addressLine2: c?.addressLine2 ?? '',
    city: c?.city ?? '',
    stateCode: c?.stateCode ?? '',
    postalCode: c?.postalCode ?? '',
    paymentTermsDays:
      c?.paymentTermsDays === null || c?.paymentTermsDays === undefined
        ? ''
        : String(c.paymentTermsDays),
    notes: c?.notes ?? '',
  };
}

export function toCustomerInput(v: CustomerFormValues) {
  const n = (s: string) => (s.trim() === '' ? null : s.trim());
  return {
    customerType: v.customerType,
    name: v.name.trim(),
    contactPerson: n(v.contactPerson),
    phone: n(v.phone),
    email: n(v.email),
    gstin: n(v.gstin.toUpperCase()),
    addressLine1: n(v.addressLine1),
    addressLine2: n(v.addressLine2),
    city: n(v.city),
    stateCode: n(v.stateCode),
    state: stateName(v.stateCode),
    postalCode: n(v.postalCode),
    paymentTermsDays: v.paymentTermsDays === '' ? null : Number(v.paymentTermsDays),
    notes: n(v.notes),
  };
}
