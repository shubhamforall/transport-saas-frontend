import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/toast-context';
import { api } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';

const forgotSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address')),
});

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: v });
      setSent(true);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['email']));
    }
  });

  return (
    <AuthLayout
      title="Reset your password"
      description="Enter the email you sign in with. We'll send you a link to choose a new password."
      footer={
        <Link to="/sign-in" className="font-semibold text-brand hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Notice>
          If an account exists for that email, a reset link is on its way. It works once and expires
          in 1 hour.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError && <Notice tone="error">{formError}</Notice>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            required
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((p) => new TextEncoder().encode(p).length <= 72, 'Password is too long'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  });

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password: v.password } });
      toast.success('Password changed. Sign in with your new password.');
      navigate('/sign-in', { replace: true });
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['password']));
    }
  });

  return (
    <AuthLayout
      title="Choose a new password"
      description="You'll be signed out of other devices."
      footer={
        <Link to="/forgot-password" className="font-semibold text-brand hover:underline">
          Request a new link
        </Link>
      }
    >
      {!token ? (
        <Notice tone="error">
          This reset link is incomplete. Open the link from your email again.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError && <Notice tone="error">{formError}</Notice>}
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            hint="At least 8 characters."
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordField
            label="Confirm new password"
            autoComplete="new-password"
            required
            error={errors.confirm?.message}
            {...register('confirm')}
          />
          <Button type="submit" variant="primary" loading={isSubmitting} className="w-full">
            Set new password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
