import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DetailList } from '@/components/ui/Detail';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { ConfirmDialog } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/toast-context';
import { ApiError, api } from '@/lib/api';
import { cn } from '@/lib/cn';
import { formatDate, formatPaise } from '@/lib/format';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { CheckoutResponse, Plan, SubscriptionSummary } from '@/types/api';
import { openRazorpayCheckout } from './razorpay';

const limitText = (n: number | undefined, what: string) =>
  n === undefined ? `Unlimited ${what}` : `Up to ${n} ${what}`;

export function BillingPage() {
  const { can } = useCurrentTenant();
  const toast = useToast();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const summary = useTenantQuery<SubscriptionSummary>(['subscription'], '/subscription');
  const plans = useQuery({ queryKey: ['plans'], queryFn: () => api<{ items: Plan[] }>('/plans') });
  const checkout = useTenantMutation<{ planCode: string }, CheckoutResponse>(
    'POST',
    '/subscription/checkout',
    ['subscription'],
  );
  const cancel = useTenantMutation<void, SubscriptionSummary>('POST', '/subscription/cancel', [
    'subscription',
  ]);

  if (summary.isPending || !summary.data) return <Spinner label="Loading billing" />;
  const s = summary.data;
  const sub = s.subscription;
  const manage = can('billing.manage');

  const choose = async (plan: Plan) => {
    try {
      const c = await checkout.mutateAsync({ planCode: plan.code });
      await openRazorpayCheckout(c, (paid) => {
        if (!paid) return;
        setWaiting(true);
        toast.success('Payment submitted. Your plan activates as soon as Razorpay confirms it.');
        // Poll a few times for the webhook to arrive.
        let tries = 0;
        const t = setInterval(() => {
          tries += 1;
          void summary.refetch();
          if (tries >= 10) {
            clearInterval(t);
            setWaiting(false);
          }
        }, 3000);
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not start checkout.');
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Billing & plan"
        description="Your Vaharo subscription. Plan prices shown are configurable and may change."
      />
      {s.access.mode === 'READ_ONLY' && (
        <div className="mb-5">
          <Notice tone="error">
            {s.access.reason} Your data is safe and you can still view and export it. Choose a plan
            to make changes again.
          </Notice>
        </div>
      )}
      {waiting && (
        <div className="mb-5">
          <Notice>Waiting for payment confirmation from Razorpay…</Notice>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Current plan" aside={sub && <StatusBadge status={sub.status} />} />
          <CardBody>
            {sub ? (
              <DetailList
                items={[
                  [
                    'Plan',
                    `${sub.plan.name} · ${formatPaise(sub.plan.priceMinor)} / ${sub.plan.billingInterval === 'MONTHLY' ? 'month' : 'year'}`,
                  ],
                  ...(sub.status === 'TRIAL' && sub.trialEndsAt
                    ? ([['Trial ends', formatDate(sub.trialEndsAt)]] as [string, string][])
                    : []),
                  ...(sub.currentPeriodEnd
                    ? ([
                        [
                          sub.cancelAtPeriodEnd || sub.status === 'CANCELLED'
                            ? 'Access until'
                            : 'Renews on',
                          formatDate(sub.currentPeriodEnd),
                        ],
                      ] as [string, string][])
                    : []),
                  ['Vehicles', `${s.usage.vehicles} of ${s.limits.maxVehicles ?? 'unlimited'}`],
                  [
                    'Users (incl. pending invites)',
                    `${s.usage.users} of ${s.limits.maxUsers ?? 'unlimited'}`,
                  ],
                  [
                    'Payment',
                    sub.provider === 'RAZORPAY'
                      ? 'Razorpay'
                      : sub.provider === 'MANUAL'
                        ? 'Arranged with Vaharo'
                        : 'Not set up',
                  ],
                ]}
              />
            ) : (
              <p className="text-[13px] text-muted">
                No subscription is needed on this installation yet.
              </p>
            )}
            {s.pendingCheckout && (
              <p className="mt-3 text-xs text-muted">
                A checkout for the {s.pendingCheckout.planCode} plan is waiting for payment
                confirmation.
              </p>
            )}
            {manage &&
              sub &&
              !['CANCELLED', 'EXPIRED'].includes(sub.status) &&
              !sub.cancelAtPeriodEnd && (
                <Button className="mt-5" onClick={() => setCancelOpen(true)}>
                  Cancel subscription
                </Button>
              )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="How billing works" />
          <CardBody className="text-[13px] leading-relaxed text-muted">
            <p>
              Payments are handled securely by Razorpay. Your plan changes only after Razorpay
              confirms the payment to us directly.
            </p>
            <p className="mt-2">
              If a subscription lapses, your company becomes read-only: nothing is deleted and you
              can still view and export everything.
            </p>
            {!s.onlinePaymentsAvailable && (
              <p className="mt-2 font-semibold text-ink">
                Online payment is not switched on yet. Contact support to upgrade.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <h2 className="mt-8 mb-3 text-sm font-bold">Plans</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.data?.items.map((p) => {
          const current = sub?.plan.code === p.code && ['ACTIVE', 'TRIAL'].includes(sub.status);
          return (
            <Card
              key={p.id}
              className={cn('flex flex-col p-5', current && 'border-brand ring-3 ring-blue-100')}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold">{p.name}</h3>
                {current && <Badge tone="blue">Current</Badge>}
              </div>
              <p className="mt-2 text-2xl font-extrabold">
                {formatPaise(p.priceMinor)}
                <span className="text-xs font-medium text-muted">
                  {' '}
                  / {p.billingInterval === 'MONTHLY' ? 'month' : 'year'}
                </span>
              </p>
              {p.description && <p className="mt-1 text-xs text-muted">{p.description}</p>}
              <ul className="mt-4 flex flex-1 flex-col gap-1.5 text-[13px]">
                {[
                  limitText(p.limits.maxUsers, 'users'),
                  limitText(p.limits.maxVehicles, 'vehicles'),
                  ...p.features,
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> {f}
                  </li>
                ))}
              </ul>
              {manage && (
                <Button
                  className="mt-5 w-full"
                  variant={current && sub?.status === 'ACTIVE' ? 'secondary' : 'primary'}
                  disabled={
                    (current && sub?.status === 'ACTIVE') ||
                    !s.onlinePaymentsAvailable ||
                    !p.onlineCheckout
                  }
                  loading={checkout.isPending && checkout.variables?.planCode === p.code}
                  onClick={() => void choose(p)}
                >
                  {current && sub?.status === 'ACTIVE'
                    ? 'Your plan'
                    : !s.onlinePaymentsAvailable || !p.onlineCheckout
                      ? 'Contact support'
                      : current
                        ? 'Subscribe'
                        : 'Choose plan'}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel subscription?"
        message="You keep full access until the end of the current paid period (or trial). After that the company becomes read-only. Your data is not deleted."
        confirmLabel="Cancel subscription"
        destructive
        loading={cancel.isPending}
        onCancel={() => setCancelOpen(false)}
        onConfirm={async () => {
          try {
            await cancel.mutateAsync();
            toast.success('Subscription cancelled.');
          } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Could not cancel.');
          }
          setCancelOpen(false);
        }}
      />
    </>
  );
}
