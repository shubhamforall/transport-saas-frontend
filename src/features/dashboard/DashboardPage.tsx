import { Link } from 'react-router';
import { CheckCircle2, Circle, FileText, Plus, Route, Truck, Users } from 'lucide-react';
import { buttonClass } from '@/components/ui/button-class';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Detail';
import { Notice, Skeleton } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, Td } from '@/components/ui/Table';
import { formatDate, formatPaise } from '@/lib/format';
import { useSession } from '@/features/auth/session';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Dashboard } from '@/types/api';

function greeting(date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(date),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage() {
  const { tenant, can } = useCurrentTenant();
  const { data: session } = useSession();
  const { data: d, isPending, error } = useTenantQuery<Dashboard>(['dashboard'], '/dashboard');
  const firstName = session?.user.name.split(' ')[0] ?? '';
  const base = `/t/${tenant.id}`;

  const checklist = d
    ? [
        { label: 'Create your company workspace', done: true },
        {
          label: 'Complete company details (address, GSTIN)',
          done: Boolean(tenant.addressLine1 && tenant.city && tenant.stateCode),
          to: `${base}/settings`,
        },
        {
          label: 'Add your first customer',
          done: d.counts.activeCustomers > 0,
          to: `${base}/customers/new`,
        },
        {
          label: 'Add your first vehicle',
          done: d.counts.activeVehicles > 0,
          to: `${base}/vehicles/new`,
        },
        {
          label: 'Create your first transport job',
          done: d.recentJobs.length > 0,
          to: `${base}/jobs/new`,
        },
        {
          label: 'Issue your first invoice',
          done: d.recentInvoices.length > 0,
          to: `${base}/invoices/new`,
        },
      ]
    : [];
  const showChecklist = checklist.some((c) => !c.done);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title={`${greeting()}, ${firstName}`}
        description={`Here's what's happening at ${tenant.name}.`}
      />
      {error && <Notice tone="error">Could not load the dashboard. Refresh to try again.</Notice>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isPending || !d ? (
          Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-22 rounded-card" />)
        ) : (
          <>
            <Stat label="Active jobs" value={d.jobs.active} hint="Booked or in transit" />
            <Stat label="In transit" value={d.jobs.inTransit} hint="Awaiting delivery" />
            <Stat
              label="Delivered, not invoiced"
              value={d.jobs.deliveredAwaitingInvoice}
              hint={
                d.jobs.deliveredAwaitingInvoice ? (
                  <Link to={`${base}/invoices/new`} className="text-brand">
                    Invoice them →
                  </Link>
                ) : (
                  'All billed'
                )
              }
            />
            <Stat
              label="Invoiced this month"
              value={formatPaise(d.invoicesThisMonth.totalMinor)}
              hint={`${d.invoicesThisMonth.count} invoice${d.invoicesThisMonth.count === 1 ? '' : 's'}`}
            />
            <Stat
              label="Outstanding"
              value={formatPaise(d.outstanding.amountMinor)}
              hint={`${d.outstanding.count} unpaid invoice${d.outstanding.count === 1 ? '' : 's'}`}
            />
            <Stat
              label="Overdue"
              value={
                <span className={d.overdue.amountMinor ? 'text-red-600' : ''}>
                  {formatPaise(d.overdue.amountMinor)}
                </span>
              }
              hint={`${d.overdue.count} invoice${d.overdue.count === 1 ? '' : 's'}`}
            />
            <Stat label="Received this month" value={formatPaise(d.receivedThisMonthMinor)} />
            <Stat
              label="Customers · vehicles"
              value={`${d.counts.activeCustomers} · ${d.counts.activeVehicles}`}
              hint="Active"
            />
          </>
        )}
      </div>

      <Card className="mt-5">
        <CardBody className="flex flex-wrap items-center gap-2 py-4">
          <span className="mr-2 text-xs font-bold text-muted uppercase">Quick actions</span>
          {can('customers.write') && (
            <Link to={`${base}/customers/new`} className={buttonClass('secondary', 'sm')}>
              <Users className="size-4" aria-hidden /> Add customer
            </Link>
          )}
          {can('vehicles.write') && (
            <Link to={`${base}/vehicles/new`} className={buttonClass('secondary', 'sm')}>
              <Truck className="size-4" aria-hidden /> Add vehicle
            </Link>
          )}
          {can('jobs.write') && (
            <Link to={`${base}/jobs/new`} className={buttonClass('primary', 'sm')}>
              <Plus className="size-4" aria-hidden /> Create transport job
            </Link>
          )}
          {can('invoices.write') && (
            <Link to={`${base}/invoices/new`} className={buttonClass('secondary', 'sm')}>
              <FileText className="size-4" aria-hidden /> Create invoice
            </Link>
          )}
        </CardBody>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent jobs"
            aside={
              <Link to={`${base}/jobs`} className="text-xs font-semibold text-brand">
                View all
              </Link>
            }
          />
          {d && d.recentJobs.length === 0 ? (
            <CardBody className="text-[13px] text-muted">No jobs yet.</CardBody>
          ) : (
            <Table>
              <tbody>
                {d?.recentJobs.map((j) => (
                  <tr key={j.id}>
                    <Td>
                      <Link to={`${base}/jobs/${j.id}`} className="font-semibold hover:text-brand">
                        {j.jobNumber}
                      </Link>
                      <span className="block text-[11px] text-subtle">{j.customer.name}</span>
                    </Td>
                    <Td className="max-sm:hidden">
                      <Route className="mr-1 inline size-3.5 text-subtle" aria-hidden />
                      {j.originCity} → {j.destinationCity}
                    </Td>
                    <Td>
                      <StatusBadge status={j.status} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="overflow-hidden">
          <CardHeader
            title="Recent invoices"
            aside={
              <Link to={`${base}/invoices`} className="text-xs font-semibold text-brand">
                View all
              </Link>
            }
          />
          {d && d.recentInvoices.length === 0 ? (
            <CardBody className="text-[13px] text-muted">No issued invoices yet.</CardBody>
          ) : (
            <Table>
              <tbody>
                {d?.recentInvoices.map((i) => (
                  <tr key={i.id}>
                    <Td>
                      <Link
                        to={`${base}/invoices/${i.id}`}
                        className="font-semibold hover:text-brand"
                      >
                        {i.invoiceNumber}
                      </Link>
                      <span className="block text-[11px] text-subtle">
                        {i.customer.name} · {formatDate(i.invoiceDate)}
                      </span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      {formatPaise(i.grandTotalMinor)}
                    </Td>
                    <Td>
                      <StatusBadge status={i.displayStatus} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {showChecklist && (
        <Card className="mt-5">
          <CardHeader title="Getting started" description="Set up Vaharo for your business." />
          <CardBody className="pt-3">
            <ul className="divide-y divide-line">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 py-3">
                  <span className="flex items-center gap-3 text-[13px]">
                    {item.done ? (
                      <CheckCircle2 className="size-5 text-emerald-600" aria-label="Done" />
                    ) : (
                      <Circle className="size-5 text-slate-300" aria-label="Not done" />
                    )}
                    <span className={item.done ? 'text-muted line-through' : ''}>{item.label}</span>
                  </span>
                  {!item.done && item.to && (
                    <Link to={item.to} className="text-xs font-bold text-brand hover:underline">
                      Start
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </>
  );
}
