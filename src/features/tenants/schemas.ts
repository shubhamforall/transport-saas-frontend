import { z } from 'zod';
import { stateName } from '@/lib/indian-states';
import type { TenantInput } from './api';

// Mirrors server validation for quick feedback; the API re-validates everything.

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const optional = (max: number, message = `Must be ${max} characters or fewer`) =>
  z.string().trim().max(max, message);

export const companySchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your company name').max(120),
    legalName: optional(200),
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
      .max(254, 'Email is too long')
      .refine((v) => v === '' || z.email().safeParse(v).success, 'Enter a valid email address'),
    addressLine1: optional(200),
    addressLine2: optional(200),
    city: optional(100),
    stateCode: z.string(),
    postalCode: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[1-9][0-9]{5}$/.test(v), 'Enter a valid 6-digit PIN code'),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .refine((v) => v === '' || GSTIN_REGEX.test(v), 'Enter a valid 15-character GSTIN'),
  })
  .refine((v) => !v.gstin || !v.stateCode || v.gstin.startsWith(v.stateCode), {
    message: 'GSTIN does not match the selected state',
    path: ['gstin'],
  });

export type CompanyFormValues = z.input<typeof companySchema>;

export const emptyCompany: CompanyFormValues = {
  name: '',
  legalName: '',
  phone: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateCode: '',
  postalCode: '',
  gstin: '',
};

export const COMPANY_FIELDS = Object.keys(emptyCompany) as (keyof CompanyFormValues)[];

/** Converts form values to the API shape: empty strings become null. */
export function toTenantInput(values: CompanyFormValues): TenantInput {
  const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    name: values.name.trim(),
    legalName: blankToNull(values.legalName),
    phone: blankToNull(values.phone),
    email: blankToNull(values.email),
    addressLine1: blankToNull(values.addressLine1),
    addressLine2: blankToNull(values.addressLine2),
    city: blankToNull(values.city),
    postalCode: blankToNull(values.postalCode),
    gstin: blankToNull(values.gstin.toUpperCase()),
    stateCode: blankToNull(values.stateCode),
    state: stateName(values.stateCode),
  };
}
