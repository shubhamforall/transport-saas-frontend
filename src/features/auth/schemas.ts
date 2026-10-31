import { z } from 'zod';

// Mirrors the server rules for quick feedback. The server stays the source of truth.

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .pipe(z.email('Enter a valid email address'));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .refine((p) => new TextEncoder().encode(p).length <= 72, 'Password is too long'),
});

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
