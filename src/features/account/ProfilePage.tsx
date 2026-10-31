import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation } from 'react-router';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/Card';
import { TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/components/ui/toast-context';
import { Avatar } from '@/components/layout/ProfileMenu';
import { applyServerErrors } from '@/lib/form-errors';
import { ROLE_LABELS } from '@/lib/roles';
import { authApi } from '@/features/auth/api';
import { useSession, useSetSession } from '@/features/auth/session';
import { useCurrentTenant } from '@/features/tenants/tenant-context';

const detailsSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
});
type DetailsValues = z.infer<typeof detailsSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .refine((p) => new TextEncoder().encode(p).length <= 72, 'Password is too long'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function DetailsCard() {
  const { data: session } = useSession();
  const { tenant } = useCurrentTenant();
  const setSession = useSetSession();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const user = session!.user;
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { name: user.name },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const me = await authApi.updateProfile(values);
      setSession(me);
      reset({ name: me.user.name });
      toast.success('Your details were saved.');
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['name']));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader title="Your details" description="Your name appears to your team." />
        <CardBody className="flex flex-col gap-5">
          <div className="flex items-center gap-3.5">
            <Avatar name={user.name} className="size-12 text-base" />
            <div className="min-w-0">
              <p className="truncate font-bold">{user.name}</p>
              <p className="truncate text-xs text-muted">
                {ROLE_LABELS[tenant.myRole]} at {tenant.name}
              </p>
            </div>
          </div>
          {formError && <Notice tone="error">{formError}</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Full name"
              autoComplete="name"
              required
              error={errors.name?.message}
              {...register('name')}
            />
            <TextField
              label="Email"
              type="email"
              value={user.email}
              readOnly
              disabled
              hint="You sign in with this email. It can't be changed yet."
            />
          </div>
        </CardBody>
        <CardFooter className="justify-end">
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      reset();
      toast.success('Password changed. Other devices have been signed out.');
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ['currentPassword', 'newPassword']));
    }
  });

  return (
    <form id="password" onSubmit={onSubmit} noValidate className="scroll-mt-24">
      <Card>
        <CardHeader
          title="Change password"
          description="You stay signed in here; every other device is signed out."
        />
        <CardBody className="flex flex-col gap-4">
          {formError && <Notice tone="error">{formError}</Notice>}
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            required
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="New password"
              type="password"
              autoComplete="new-password"
              required
              hint="At least 8 characters."
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <TextField
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              required
              error={errors.confirm?.message}
              {...register('confirm')}
            />
          </div>
        </CardBody>
        <CardFooter className="justify-end">
          <Button type="submit" variant="primary" loading={isSubmitting}>
            Change password
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

/** /t/:tenantId/profile: the signed-in person's own account (not company settings). */
export function ProfilePage() {
  const { hash } = useLocation();

  // "Change password" in the account menu links to #password.
  useEffect(() => {
    if (hash !== '#password') return;
    const el = document.getElementById('password');
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    el?.querySelector('input')?.focus({ preventScroll: true });
  }, [hash]);

  return (
    <>
      <PageHeader
        eyebrow="Account"
        title="My profile"
        description="Your personal sign-in details. These apply to every company you belong to."
      />
      <div className="flex max-w-225 flex-col gap-6">
        <DetailsCard />
        <PasswordCard />
      </div>
    </>
  );
}
