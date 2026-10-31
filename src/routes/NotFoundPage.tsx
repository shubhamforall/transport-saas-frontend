import { Link } from 'react-router';
import { EmptyState } from '@/components/ui/Feedback';

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <EmptyState
        title="Page not found"
        description="The page you're looking for doesn't exist."
        action={
          <Link to="/" className="text-sm font-semibold text-brand hover:underline">
            Go to my workspace
          </Link>
        }
      />
    </div>
  );
}
