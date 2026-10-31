import { z } from 'zod';

// Mirrors the server rules for quick feedback. The server stays the source of truth.

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .max(254, 'Email is too long')
  .pipe(z.email('Enter a valid email address'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(200, 'Password is too long'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((p) => new TextEncoder().encode(p).length <= 72, 'Password is too long')
    .refine((p) => p.trim().length > 0, 'Password cannot be only spaces'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
