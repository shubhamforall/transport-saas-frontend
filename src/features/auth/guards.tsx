import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { homePathFor, useSession } from './session';

function FullPage({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-screen place-items-center p-6">{children}</div>;
}

function SessionError({ retry }: { retry: () => void }) {
  return (
    <FullPage>
      <EmptyState
        title="Cannot reach Vaharo"
        description="We could not check your session. Make sure the API is running, then try again."
        action={
          <Button variant="primary" onClick={retry}>
            Try again
          </Button>
        }
      />
    </FullPage>
  );
}

/** Only signed-in users may pass; others go to sign-in and come back afterwards. */
export function RequireAuth() {
  const { data, isPending, isError, refetch } = useSession();
  const location = useLocation();
  if (isPending)
    return (
      <FullPage>
        <Spinner label="Loading your workspace" />
      </FullPage>
    );
  if (isError) return <SessionError retry={() => void refetch()} />;
  if (!data) {
    const next = location.pathname + location.search;
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />;
  }
  return <Outlet />;
}

/** Sign-in/up pages: signed-in users are sent to their workspace instead. */
export function RedirectIfSignedIn() {
  const { data, isPending, isError, refetch } = useSession();
  if (isPending)
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );
  if (isError) return <SessionError retry={() => void refetch()} />;
  if (data) return <Navigate to={homePathFor(data)} replace />;
  return <Outlet />;
}

/** "/" sends people to the right place. */
export function HomeRedirect() {
  const { data, isPending } = useSession();
  if (isPending)
    return (
      <FullPage>
        <Spinner />
      </FullPage>
    );
  return <Navigate to={data ? homePathFor(data) : '/sign-in'} replace />;
}
