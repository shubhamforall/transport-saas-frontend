import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { buttonClass } from '@/components/ui/button-class';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { ApiError, api } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/roles';
import { lastTenant, sessionKey, useSession } from '@/features/auth/session';
import type { Role } from '@/types/api';

interface Lookup {
  companyName: string;
  email: string;
  role: Role;
  expired: boolean;
  accepted: boolean;
}

/** /invitations/accept?token=... (works signed in or out). */
export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const lookup = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => api<Lookup>(`/invitations/lookup?token=${encodeURIComponent(token)}`),
    enabled: Boolean(token),
    retry: false,
  });

  const here = `/invitations/accept?token=${encodeURIComponent(token)}`;
  const inv = lookup.data;

  const accept = async () => {
    setError(null);
    setAccepting(true);
    try {
      const res = await api<{ tenantId: string }>('/invitations/accept', {
        method: 'POST',
        body: { token },
      });
      await qc.invalidateQueries({ queryKey: sessionKey });
      lastTenant.set(res.tenantId);
      navigate(`/t/${res.tenantId}/dashboard`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not accept the invitation.');
    } finally {
      setAccepting(false);
    }
  };

  let body: React.ReactNode;
  if (!token) body = <Notice tone="error">This invitation link is incomplete.</Notice>;
  else if (lookup.isPending || sessionPending) body = <Spinner label="Checking invitation" />;
  else if (lookup.isError || !inv)
    body = <Notice tone="error">This invitation is not valid. Ask for a new one.</Notice>;
  else if (inv.accepted)
    body = (
      <Notice>
        This invitation was already accepted.{' '}
        <Link to="/app" className="font-semibold underline">
          Go to my workspace
        </Link>
      </Notice>
    );
  else if (inv.expired)
    body = (
      <Notice tone="error">
        This invitation has expired. Ask {inv.companyName} to send a new one.
      </Notice>
    );
  else if (!session) {
    body = (
      <div className="flex flex-col gap-3">
        <p className="text-[13px]">
          Sign in or create an account with <b>{inv.email}</b> to accept.
        </p>
        <Link to={`/sign-in?next=${encodeURIComponent(here)}`} className={buttonClass('primary')}>
          Sign in
        </Link>
        <Link
          to={`/sign-up?next=${encodeURIComponent(here)}&email=${encodeURIComponent(inv.email)}`}
          className={buttonClass()}
        >
          Create an account
        </Link>
      </div>
    );
  } else if (session.user.email !== inv.email) {
    body = (
      <Notice tone="error">
        You're signed in as {session.user.email}, but this invitation is for {inv.email}. Sign out
        and sign in with that email.
      </Notice>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {error && <Notice tone="error">{error}</Notice>}
        <Button variant="primary" loading={accepting} onClick={() => void accept()}>
          Join {inv.companyName}
        </Button>
      </div>
    );
  }

  return (
    <AuthLayout
      title={inv ? `Join ${inv.companyName}` : 'Team invitation'}
      description={
        inv ? `You've been invited as ${ROLE_LABELS[inv.role]}.` : 'Checking your invitation.'
      }
    >
      {body}
    </AuthLayout>
  );
}
