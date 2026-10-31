import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, FilterSelect, Pagination, SearchInput } from '@/components/ui/DataTable';
import { BackLink, DetailList } from '@/components/ui/Detail';
import { SelectField, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, Td, Th } from '@/components/ui/Table';
import { useToast } from '@/components/ui/toast-context';
import { ApiError, api } from '@/lib/api';
import { formatDate, formatPaise } from '@/lib/format';
import { useDebouncedValue, useListParams } from '@/lib/hooks';
import { paiseToInput, parseRupees } from '@/lib/money';
import { ROLE_LABELS } from '@/lib/roles';
import type { Paged, Plan, Role } from '@/types/api';

const errText = (e: unknown) =>
  e instanceof ApiError
    ? (Object.values(e.fieldErrors ?? {})[0]?.[0] ?? e.message)
    : 'Something went wrong.';
const when = (iso: string | null | undefined) => (iso ? formatDate(iso) : '—');

function usePlatformList<T>(key: string, path: string, query: string) {
  return useQuery({
    queryKey: ['platform', key, query],
    queryFn: ({ signal }) => api<Paged<T>>(`/platform/${path}?${query}`, { signal }),
    placeholderData: keepPreviousData,
  });
}

// ---- Companies ----------------------------------------------------------------------------

interface TenantRow {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  city: string | null;
  createdAt: string;
  memberCount: number;
  owners: { name: string; email: string }[];
  subscription: {
    status: string;
    plan: { name: string };
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    access: string;
  } | null;
}

export function PlatformTenantsPage() {
  const navigate = useNavigate();
  const list = useListParams({ status: 'ALL' });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending, error } = usePlatformList<TenantRow>(
    'tenants',
    'tenants',
    list.query({ q }),
  );
  return (
    <>
      <PageHeader
        title="Companies"
        description="Company accounts and subscription state. Business records (customers, invoices) are not visible here."
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Company, GSTIN or owner email…"
          />
          <FilterSelect
            label="Status"
            value={list.values.status}
            onChange={(v) => list.set({ status: v })}
            options={[
              { value: 'ALL', label: 'All' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]}
          />
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          error={error}
          rowKey={(t) => t.id}
          onRowClick={(t) => navigate(`/platform/tenants/${t.id}`)}
          columns={[
            {
              header: 'Company',
              cell: (t) => (
                <>
                  <b>{t.name}</b>
                  <span className="block text-[11px] text-subtle">
                    {t.owners.map((o) => o.email).join(', ')}
                  </span>
                </>
              ),
            },
            { header: 'Members', cell: (t) => t.memberCount, hideOnMobile: true },
            {
              header: 'Plan',
              cell: (t) =>
                t.subscription ? (
                  <>
                    <StatusBadge status={t.subscription.status} />{' '}
                    <span className="text-xs">{t.subscription.plan.name}</span>
                  </>
                ) : (
                  '—'
                ),
            },
            { header: 'Access', cell: (t) => t.subscription?.access ?? 'FULL', hideOnMobile: true },
            { header: 'Created', cell: (t) => formatDate(t.createdAt), hideOnMobile: true },
            { header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
          ]}
          empty={<p className="p-6 text-[13px] text-muted">No companies found.</p>}
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onChange={(p) => list.set({ page: String(p) })}
          />
        )}
      </Card>
    </>
  );
}

interface TenantDetail {
  id: string;
  name: string;
  legalName: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  statusReason: string | null;
  city: string | null;
  state: string | null;
  gstin: string | null;
  createdAt: string;
  memberships: { role: Role; createdAt: string; user: { name: string; email: string } }[];
  subscriptions: {
    id: string;
    status: string;
    provider: string;
    plan: { code: string; name: string };
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    createdAt: string;
  }[];
  _count: { customers: number; vehicles: number; jobs: number; invoices: number };
  access: { mode: string; reason: string | null };
}

export function PlatformTenantDetailPage() {
  const { tenantId = '' } = useParams();
  const [dialog, setDialog] = useState<'status' | 'subscription' | null>(null);
  const { data: t, isPending } = useQuery({
    queryKey: ['platform', 'tenant', tenantId],
    queryFn: () => api<TenantDetail>(`/platform/tenants/${tenantId}`),
  });
  if (isPending || !t) return <Spinner />;
  return (
    <>
      <BackLink to="/platform/tenants" label="All companies" />
      <PageHeader
        title={t.name}
        description={
          <span className="flex gap-2">
            <StatusBadge status={t.status} />{' '}
            <span className="text-xs">Access: {t.access.mode}</span>
          </span>
        }
        action={
          <div className="flex gap-2">
            <Button onClick={() => setDialog('subscription')}>Set subscription</Button>
            <Button
              variant={t.status === 'ACTIVE' ? 'danger' : 'primary'}
              onClick={() => setDialog('status')}
            >
              {t.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
            </Button>
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Company" />
          <CardBody>
            <DetailList
              items={[
                ['Legal name', t.legalName],
                ['Location', [t.city, t.state].filter(Boolean).join(', ')],
                ['GSTIN', t.gstin],
                ['Created', formatDate(t.createdAt)],
                ['Status note', t.statusReason],
                [
                  'Records',
                  `${t._count.customers} customers · ${t._count.vehicles} vehicles · ${t._count.jobs} jobs · ${t._count.invoices} invoices`,
                ],
              ]}
            />
          </CardBody>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Members" />
          <Table>
            <tbody>
              {t.memberships.map((m) => (
                <tr key={m.user.email}>
                  <Td>
                    <b>{m.user.name}</b>
                    <span className="block text-[11px] text-subtle">{m.user.email}</span>
                  </Td>
                  <Td>{ROLE_LABELS[m.role]}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card className="overflow-hidden lg:col-span-2">
          <CardHeader title="Subscription history" />
          <Table>
            <thead>
              <tr>
                <Th>Created</Th>
                <Th>Plan</Th>
                <Th>Status</Th>
                <Th>Provider</Th>
                <Th>Trial / period end</Th>
              </tr>
            </thead>
            <tbody>
              {t.subscriptions.map((s) => (
                <tr key={s.id}>
                  <Td>{formatDate(s.createdAt)}</Td>
                  <Td>{s.plan.name}</Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>{s.provider}</Td>
                  <Td>{when(s.currentPeriodEnd ?? s.trialEndsAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          {t.subscriptions.length === 0 && (
            <CardBody className="text-[13px] text-muted">No subscriptions.</CardBody>
          )}
        </Card>
      </div>
      {dialog === 'status' && <StatusDialog tenant={t} onClose={() => setDialog(null)} />}
      {dialog === 'subscription' && (
        <ManualSubscriptionDialog tenantId={t.id} onClose={() => setDialog(null)} />
      )}
    </>
  );
}

function StatusDialog({ tenant, onClose }: { tenant: TenantDetail; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const next = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
  const run = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${tenant.id}/status`, {
        method: 'POST',
        body: { status: next, reason },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={next === 'SUSPENDED' ? `Suspend ${tenant.name}?` : `Reactivate ${tenant.name}?`}
      description={
        next === 'SUSPENDED'
          ? 'Members lose access immediately. No data is deleted.'
          : 'Members regain access.'
      }
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant={next === 'SUSPENDED' ? 'danger' : 'primary'}
            disabled={reason.trim().length < 3}
            loading={run.isPending}
            onClick={async () => {
              try {
                await run.mutateAsync();
                toast.success(next === 'SUSPENDED' ? 'Company suspended.' : 'Company reactivated.');
                onClose();
              } catch (e) {
                toast.error(errText(e));
              }
            }}
          >
            {next === 'SUSPENDED' ? 'Suspend' : 'Reactivate'}
          </Button>
        </>
      }
    >
      <TextAreaField
        label="Reason (audited)"
        required
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
    </Modal>
  );
}

function ManualSubscriptionDialog({
  tenantId,
  onClose,
}: {
  tenantId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const plans = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: () => api<{ items: Plan[] }>('/platform/plans'),
  });
  const [form, setForm] = useState({ planId: '', status: 'ACTIVE', until: '', reason: '' });
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${tenantId}/subscription`, {
        method: 'POST',
        body: { ...form, until: form.until || undefined },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform'] }),
  });
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Set subscription manually"
      description="For pilots or offline payments. This becomes the company's current subscription and is audited."
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={run.isPending}
            disabled={!form.planId || form.reason.trim().length < 3}
            onClick={async () => {
              setError(null);
              try {
                await run.mutateAsync();
                toast.success('Subscription updated.');
                onClose();
              } catch (e) {
                setError(errText(e));
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <SelectField
          label="Plan"
          value={form.planId}
          onChange={(e) => setForm({ ...form, planId: e.target.value })}
        >
          <option value="">Select plan</option>
          {plans.data?.items.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.isActive ? '' : ' (inactive)'}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          {['TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <TextField
          label={form.status === 'TRIAL' ? 'Trial ends' : 'Paid until'}
          type="date"
          value={form.until}
          onChange={(e) => setForm({ ...form, until: e.target.value })}
        />
        <TextField
          label="Reason (audited)"
          required
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </div>
    </Modal>
  );
}

// ---- Plans --------------------------------------------------------------------------------

export function PlatformPlansPage() {
  const [editing, setEditing] = useState<Plan | 'new' | null>(null);
  const { data, isPending } = useQuery({
    queryKey: ['platform', 'plans'],
    queryFn: () => api<{ items: Plan[] }>('/platform/plans'),
  });
  return (
    <>
      <PageHeader
        title="Plans"
        description="Prices, limits and features are configuration, not code. Changes apply to new checkouts."
        action={
          <Button variant="primary" onClick={() => setEditing('new')}>
            New plan
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <DataTable
          rows={data?.items}
          loading={isPending}
          rowKey={(p) => p.id}
          onRowClick={(p) => setEditing(p)}
          columns={[
            {
              header: 'Plan',
              cell: (p) => (
                <>
                  <b>{p.name}</b>
                  <span className="block text-[11px] text-subtle">{p.code}</span>
                </>
              ),
            },
            {
              header: 'Price',
              cell: (p) =>
                `${formatPaise(p.priceMinor)} / ${p.billingInterval === 'MONTHLY' ? 'mo' : 'yr'}`,
            },
            {
              header: 'Limits',
              cell: (p) =>
                `${p.limits.maxUsers ?? '∞'} users · ${p.limits.maxVehicles ?? '∞'} vehicles`,
              hideOnMobile: true,
            },
            {
              header: 'Online checkout',
              cell: (p) => (p.onlineCheckout ? 'Yes' : 'No'),
              hideOnMobile: true,
            },
            {
              header: 'Status',
              cell: (p) => <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />,
            },
          ]}
          empty={
            <p className="p-6 text-[13px] text-muted">
              No plans yet. Companies get no trial until a plan exists.
            </p>
          }
        />
      </Card>
      {editing && (
        <PlanDialog plan={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function PlanDialog({ plan, onClose }: { plan: Plan | null; onClose: () => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({
    code: plan?.code ?? '',
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    price: plan ? paiseToInput(plan.priceMinor) : '',
    billingInterval: plan?.billingInterval ?? 'MONTHLY',
    maxUsers: plan?.limits.maxUsers?.toString() ?? '',
    maxVehicles: plan?.limits.maxVehicles?.toString() ?? '',
    features: plan?.features.join('\n') ?? '',
    razorpayPlanId: '',
    isActive: plan?.isActive ?? true,
    sortOrder: String(plan?.sortOrder ?? 0),
  });
  const run = useMutation({
    mutationFn: () => {
      const limits: Record<string, number> = {};
      if (f.maxUsers) limits.maxUsers = Number(f.maxUsers);
      if (f.maxVehicles) limits.maxVehicles = Number(f.maxVehicles);
      const body: Record<string, unknown> = {
        name: f.name,
        description: f.description || null,
        priceMinor: parseRupees(f.price),
        billingInterval: f.billingInterval,
        limits,
        features: f.features
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        isActive: f.isActive,
        sortOrder: Number(f.sortOrder) || 0,
        ...(f.razorpayPlanId ? { razorpayPlanId: f.razorpayPlanId } : {}),
      };
      return plan
        ? api(`/platform/plans/${plan.id}`, { method: 'PATCH', body })
        : api('/platform/plans', { method: 'POST', body: { ...body, code: f.code } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['platform', 'plans'] }),
  });
  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : 'New plan'}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={run.isPending}
            onClick={async () => {
              setError(null);
              try {
                await run.mutateAsync();
                toast.success('Plan saved.');
                onClose();
              } catch (e) {
                setError(errText(e));
              }
            }}
          >
            Save plan
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {error && (
          <div className="sm:col-span-2">
            <Notice tone="error">{error}</Notice>
          </div>
        )}
        <TextField
          label="Code"
          required
          disabled={Boolean(plan)}
          value={f.code}
          onChange={set('code')}
          hint="Lowercase, used in URLs and checkout."
        />
        <TextField label="Name" required value={f.name} onChange={set('name')} />
        <TextField
          label="Price (₹)"
          required
          inputMode="decimal"
          value={f.price}
          onChange={set('price')}
        />
        <SelectField
          label="Billing interval"
          value={f.billingInterval}
          onChange={set('billingInterval')}
        >
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </SelectField>
        <TextField
          label="Max users"
          inputMode="numeric"
          value={f.maxUsers}
          onChange={set('maxUsers')}
          hint="Empty = unlimited"
        />
        <TextField
          label="Max vehicles"
          inputMode="numeric"
          value={f.maxVehicles}
          onChange={set('maxVehicles')}
          hint="Empty = unlimited"
        />
        <TextField
          label="Razorpay plan id"
          value={f.razorpayPlanId}
          onChange={set('razorpayPlanId')}
          hint={
            plan?.onlineCheckout
              ? 'Set. Leave empty to keep.'
              : 'plan_… from the Razorpay dashboard'
          }
        />
        <TextField
          label="Sort order"
          inputMode="numeric"
          value={f.sortOrder}
          onChange={set('sortOrder')}
        />
        <TextField label="Description" full value={f.description} onChange={set('description')} />
        <TextAreaField
          label="Features (one per line)"
          full
          value={f.features}
          onChange={set('features')}
        />
        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input
            type="checkbox"
            checked={f.isActive}
            onChange={(e) => setF({ ...f, isActive: e.target.checked })}
          />{' '}
          Available to customers
        </label>
      </div>
    </Modal>
  );
}

// ---- Subscriptions, webhooks, audit ---------------------------------------------------------

interface SubRow {
  id: string;
  status: string;
  provider: string;
  createdAt: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  tenant: { id: string; name: string };
  plan: { name: string };
}

export function PlatformSubscriptionsPage() {
  const list = useListParams({ status: '' });
  const q = useDebouncedValue(list.values.q);
  const { data, isPending } = usePlatformList<SubRow>(
    'subscriptions',
    'subscriptions',
    list.query({ q }),
  );
  return (
    <>
      <PageHeader title="Subscriptions" />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <SearchInput
            value={list.values.q}
            onChange={(v) => list.set({ q: v })}
            placeholder="Company name…"
          />
          <FilterSelect
            label="Status"
            value={list.values.status}
            onChange={(v) => list.set({ status: v })}
            options={[
              { value: '', label: 'All' },
              ...['TRIAL', 'PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          rowKey={(s) => s.id}
          columns={[
            {
              header: 'Company',
              cell: (s) => (
                <Link to={`/platform/tenants/${s.tenant.id}`} className="font-semibold text-brand">
                  {s.tenant.name}
                </Link>
              ),
            },
            { header: 'Plan', cell: (s) => s.plan.name },
            { header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
            { header: 'Provider', cell: (s) => s.provider, hideOnMobile: true },
            {
              header: 'Ends',
              cell: (s) => when(s.currentPeriodEnd ?? s.trialEndsAt),
              hideOnMobile: true,
            },
            { header: 'Created', cell: (s) => formatDate(s.createdAt), hideOnMobile: true },
          ]}
          empty={<p className="p-6 text-[13px] text-muted">No subscriptions.</p>}
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onChange={(p) => list.set({ page: String(p) })}
          />
        )}
      </Card>
    </>
  );
}

interface WebhookRow {
  id: string;
  provider: string;
  providerEventId: string;
  eventType: string;
  status: string;
  receivedAt: string;
  safeError: string | null;
}

export function PlatformWebhooksPage() {
  const list = useListParams({ status: '' });
  const { data, isPending } = usePlatformList<WebhookRow>(
    'webhooks',
    'webhook-events',
    list.query(),
  );
  return (
    <>
      <PageHeader
        title="Webhook events"
        description="Payment provider events. Duplicates are ignored automatically."
      />
      <Card className="overflow-hidden">
        <div className="flex justify-end px-5 py-4">
          <FilterSelect
            label="Status"
            value={list.values.status}
            onChange={(v) => list.set({ status: v })}
            options={[
              { value: '', label: 'All' },
              ...['RECEIVED', 'PROCESSED', 'IGNORED', 'FAILED'].map((s) => ({
                value: s,
                label: s,
              })),
            ]}
          />
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          rowKey={(w) => w.id}
          columns={[
            { header: 'Received', cell: (w) => new Date(w.receivedAt).toLocaleString('en-IN') },
            {
              header: 'Event',
              cell: (w) => (
                <>
                  <b>{w.eventType}</b>
                  <span className="block text-[11px] text-subtle">{w.providerEventId}</span>
                </>
              ),
            },
            { header: 'Status', cell: (w) => <StatusBadge status={w.status} /> },
            { header: 'Note', cell: (w) => w.safeError ?? '—', hideOnMobile: true },
          ]}
          empty={<p className="p-6 text-[13px] text-muted">No webhook events received yet.</p>}
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onChange={(p) => list.set({ page: String(p) })}
          />
        )}
      </Card>
    </>
  );
}

interface AuditRow {
  id: string;
  tenantName: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  createdAt: string;
}

export function PlatformAuditPage() {
  const list = useListParams({ action: '' });
  const action = useDebouncedValue(list.values.action);
  const { data, isPending } = usePlatformList<AuditRow>(
    'audit',
    'audit-logs',
    list.query({ action, q: undefined }),
  );
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Important actions across all companies. Details are shown only for platform and subscription actions."
      />
      <Card className="overflow-hidden">
        <div className="px-5 py-4">
          <SearchInput
            value={list.values.action}
            onChange={(v) => list.set({ action: v })}
            placeholder="Action starts with… e.g. invoice. or platform."
          />
        </div>
        <DataTable
          rows={data?.items}
          loading={isPending}
          rowKey={(a) => a.id}
          columns={[
            { header: 'When', cell: (a) => new Date(a.createdAt).toLocaleString('en-IN') },
            { header: 'Company', cell: (a) => a.tenantName ?? 'Platform', hideOnMobile: true },
            { header: 'Action', cell: (a) => <code className="text-xs">{a.action}</code> },
            {
              header: 'Record',
              cell: (a) => `${a.entityType} ${a.entityId.slice(0, 8)}…`,
              hideOnMobile: true,
            },
            {
              header: 'Details',
              cell: (a) =>
                a.metadata ? (
                  <code className="text-[11px] break-all">{JSON.stringify(a.metadata)}</code>
                ) : (
                  '—'
                ),
              hideOnMobile: true,
            },
          ]}
          empty={<p className="p-6 text-[13px] text-muted">No entries.</p>}
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onChange={(p) => list.set({ page: String(p) })}
          />
        )}
      </Card>
    </>
  );
}
