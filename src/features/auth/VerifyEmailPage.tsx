import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { ApiError } from '@/lib/api';
import { authApi } from './api';
import { safeNextPath } from './safe-next';
import { homePathFor, useSetSession } from './session';

const RESEND_WAIT_SECONDS = 60;

/** Counts down once a second until zero. */
function useCountdown(initial: number) {
  const [left, setLeft] = useState(initial);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft] as const;
}

/** /verify-email?email=...&next=...: enter the 6-digit code sent after sign-up. */
export function VerifyEmailPage() {
  const [params] = useSearchParams();
  const email = params.get('email') ?? '';
  const next = params.get('next');
  const navigate = useNavigate();
  const setSession = useSetSession();
  const firstSendFailed = params.get('sent') === '0';

  const [code, setCode] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(
    firstSendFailed ? "We couldn't send the code. Press “Send a new code” to try again." : null,
  );
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useCountdown(firstSendFailed ? 0 : RESEND_WAIT_SECONDS);
  const lastTried = useRef('');

  const digits = code.replace(/\D/g, '');

  const verify = async (value: string) => {
    if (verifying) return;
    lastTried.current = value;
    setFieldError(undefined);
    setFormError(null);
    setInfo(null);
    setVerifying(true);
    try {
      const me = await authApi.verifyEmail({ email, code: value });
      setSession(me);
      navigate(safeNextPath(next) ?? homePathFor(me), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'ALREADY_VERIFIED') {
        navigate(`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ''}`, { replace: true });
        return;
      }
      if (err instanceof ApiError && err.code === 'CODE_INVALID') {
        setFieldError(err.fieldErrors?.code?.[0] ?? err.message);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Could not check the code.');
      }
      setVerifying(false);
    }
  };

  // Submit by itself once 6 digits are typed or pasted (not again for the same wrong code).
  useEffect(() => {
    if (digits.length === 6 && digits !== lastTried.current) void verify(digits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (digits.length !== 6) {
      setFieldError('Enter the 6-digit code from the email');
      return;
    }
    void verify(digits);
  };

  const resend = async () => {
    setFormError(null);
    setFieldError(undefined);
    setInfo(null);
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setInfo(`We sent a new code to ${email}. The previous code no longer works.`);
      setCode('');
      lastTried.current = '';
      setWait(RESEND_WAIT_SECONDS);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not send a new code.');
    } finally {
      setResending(false);
    }
  };

  if (!email) return <Navigate to="/sign-up" replace />;

  return (
    <AuthLayout
      title="Check your email"
      description="Enter the 6-digit code we sent to finish creating your account."
      footer={
        <>
          Wrong email?{' '}
          <Link to="/sign-up" className="font-semibold text-brand hover:underline">
            Sign up again
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <p className="text-[13px] text-slate-700">
          We sent a code to <b className="break-all">{email}</b>. It expires in 10 minutes. Check
          your spam folder if you don't see it.
        </p>
        {formError && <Notice tone="error">{formError}</Notice>}
        {info && <Notice>{info}</Notice>}
        <TextField
          label="Verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={7}
          placeholder="123456"
          className="text-center text-lg font-semibold tracking-[0.4em]"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^\d ]/g, ''));
            setFieldError(undefined);
          }}
          error={fieldError}
        />
        <Button type="submit" variant="primary" loading={verifying} className="w-full">
          Verify and continue
        </Button>
        <Button
          type="button"
          loading={resending}
          disabled={wait > 0}
          onClick={() => void resend()}
          className="w-full"
        >
          {wait > 0 ? `Send a new code in ${wait}s` : 'Send a new code'}
        </Button>
      </form>
    </AuthLayout>
  );
}
