import { useNavigate } from 'react-router';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { useSession } from '@/features/auth/session';
import { CreateCompanyForm } from './CreateCompanyForm';

/** Full-page company setup for new users who don't belong to any company yet. */
export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const firstName = session?.user.name.split(' ')[0];

  return (
    <AuthLayout
      title={firstName ? `Welcome, ${firstName}. Set up your company` : 'Set up your company'}
      description="Your company is a private workspace. Customers, vehicles, jobs and invoices you add stay inside it."
    >
      <CreateCompanyForm
        onCreated={(tenant) => navigate(`/t/${tenant.id}/dashboard`, { replace: true })}
      />
    </AuthLayout>
  );
}
