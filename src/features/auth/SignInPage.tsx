import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api';
import { applyServerErrors } from '@/lib/form-errors';
import { authApi } from './api';
import { safeNextPath, verifyEmailPath } from './safe-next';
import { signInSchema, type SignInValues } from './schemas';
import { homePathFor, useSetSession } from './session';

export function SignInPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useSetSession();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await authApi.login(values);
      setSession(me);
      navigate(safeNextPath(params.get('next')) ?? homePathFor(me), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        navigate(verifyEmailPath(values.email.trim().toLowerCase(), params.get('next')));
        return;
      }
      setFormError(applyServerErrors(err, setError, ['email', 'password']));
    }
  });

  return (
    <AuthLayout
      title="Sign in"
      description="Welcome back. Sign in to manage your transport business."
      footer={
        <>
          New to Vaharo?{' '}
          <Link to="/sign-up" className="font-semibold text-brand hover:underline">
            Create an account
          </Link>
        </>
      }
    >
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
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" variant="primary" loading={isSubmitting} className="mt-1 w-full">
          Sign in
        </Button>
        <Link
          to="/forgot-password"
          className="text-center text-xs font-semibold text-brand hover:underline"
        >
          Forgot your password?
        </Link>
      </form>
    </AuthLayout>
  );
}
