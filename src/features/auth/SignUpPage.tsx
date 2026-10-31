import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { applyServerErrors } from '@/lib/form-errors';
import { authApi, isPendingVerification } from './api';
import { signUpSchema, type SignUpValues } from './schemas';
import { useSetSession } from './session';
import { invitationTokenFrom, safeNextPath, verifyEmailPath } from './safe-next';

export function SignUpPage() {
  const navigate = useNavigate();
  const setSession = useSetSession();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: params.get('email') ?? '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const next = params.get('next');
      const res = await authApi.register({ ...values, invitationToken: invitationTokenFrom(next) });
      if (isPendingVerification(res)) {
        navigate(verifyEmailPath(res.email, next, res.emailSent));
        return;
      }
      // Signed up from an invitation: the email is already proven, go straight back to it.
      setSession(res);
      navigate(safeNextPath(next) ?? '/onboarding', { replace: true });
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['name', 'email', 'password']));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      description="Start by creating your login. We'll email you a code to confirm it's you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && <Notice tone="error">{formError}</Notice>}
        <TextField
          label="Full name"
          autoComplete="name"
          autoFocus
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Work email"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="new-password"
          required
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" variant="primary" loading={isSubmitting} className="mt-1 w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
