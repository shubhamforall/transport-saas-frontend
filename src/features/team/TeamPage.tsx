import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { SelectField, TextField } from '@/components/ui/Field';
import { Notice, Spinner } from '@/components/ui/Feedback';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, Td, Th } from '@/components/ui/Table';
import { useToast } from '@/components/ui/toast-context';
import { ApiError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/roles';
import { useSession } from '@/features/auth/session';
import { useCurrentTenant } from '@/features/tenants/tenant-context';
import { useTenantMutation, useTenantQuery } from '@/features/tenants/use-tenant-api';
import type { Member, PendingInvitation, Role } from '@/types/api';

/** Mirrors the server rule: you can only manage people ranked below you. */
const RANK: Record<Role, number> = { OWNER: 3, ADMIN: 2, OPERATIONS: 1, ACCOUNTS: 1, VIEWER: 1 };
const ROLE_HELP: Record<Role, string> = {
  OWNER: 'Everything, including billing and ownership.',
  ADMIN: 'Runs operations, invoices, reports and the team (not billing).',
  OPERATIONS: 'Customers, vehicles and jobs. Can view invoices.',
  ACCOUNTS: 'Invoices and payments. Can view customers and jobs.',
  VIEWER: 'Read-only access.',
};
const assignable = (actor: Role) =>
  (['ADMIN', 'OPERATIONS', 'ACCOUNTS', 'VIEWER'] as Role[]).filter((r) => RANK[r] < RANK[actor]);

const errorText = (err: unknown) =>
  err instanceof ApiError
    ? (Object.values(err.fieldErrors ?? {})[0]?.[0] ?? err.message)
    : 'Something went wrong.';

export function TeamPage() {
  const { tenant, can } = useCurrentTenant();
  const { data: session } = useSession();
  const toast = useToast();
  const manage = can('members.manage');
  const me = tenant.myRole;
  const [inviteOpen, setInviteOpen] = useState(false);
  const [removing, setRemoving] = useState<Member | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const { data, isPending } = useTenantQuery<{
    members: Member[];
    invitations: PendingInvitation[];
  }>(['team'], '/members');
  const changeRole = useTenantMutation<{ id: string; role: Role }, void>(
    'PATCH',
    (b) => `/members/${b.id}/role`,
    ['team'],
  );
  const remove = useTenantMutation<{ id: string }, void>('DELETE', (b) => `/members/${b.id}`, [
    'team',
  ]);
  const revoke = useTenantMutation<{ id: string }, void>(
    'POST',
    (b) => `/invitations/${b.id}/revoke`,
    ['team'],
  );

  if (isPending || !data) return <Spinner label="Loading team" />;

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Team"
        description="Invite people and choose what each role can do. Access is checked by the server on every action."
        action={
          manage && (
            <Button variant="primary" onClick={() => setInviteOpen(true)}>
              <UserPlus className="size-4" /> Invite member
            </Button>
          )
        }
      />
      <Card className="overflow-hidden">
        <CardHeader title="Members" description={`${data.members.length} active`} />
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th className="max-md:hidden">Email</Th>
              <Th>Role</Th>
              <Th className="max-md:hidden">Joined</Th>
              {manage && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => {
              const isMe = m.user.id === session?.user.id;
              const editable = manage && !isMe && RANK[m.role] < RANK[me];
              return (
                <tr key={m.id}>
                  <Td>
                    <b>{m.user.name}</b> {isMe && <span className="text-xs text-muted">(you)</span>}
                    <span className="block text-[11px] text-subtle md:hidden">{m.user.email}</span>
                  </Td>
                  <Td className="max-md:hidden">{m.user.email}</Td>
                  <Td>
                    {editable ? (
                      <select
                        aria-label={`Role for ${m.user.name}`}
                        value={m.role}
                        disabled={changeRole.isPending}
                        onChange={async (e) => {
                          try {
                            await changeRole.mutateAsync({
                              id: m.id,
                              role: e.target.value as Role,
                            });
                            toast.success(
                              `${m.user.name} is now ${ROLE_LABELS[e.target.value as Role]}.`,
                            );
                          } catch (err) {
                            toast.error(errorText(err));
                          }
                        }}
                        className="rounded-md border border-line bg-white px-2 py-1 text-[13px]"
                      >
                        {assignable(me).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium">{ROLE_LABELS[m.role]}</span>
                    )}
                  </Td>
                  <Td className="max-md:hidden">{formatDate(m.createdAt)}</Td>
                  {manage && (
                    <Td className="text-right">
                      {editable && (
                        <button
                          type="button"
                          className="text-xs font-semibold text-red-600 hover:underline"
                          onClick={() => setRemoving(m)}
                        >
                          Remove
                        </button>
                      )}
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      {manage && data.invitations.length > 0 && (
        <Card className="mt-5 overflow-hidden">
          <CardHeader title="Pending invitations" />
          <Table>
            <tbody>
              {data.invitations.map((i) => (
                <tr key={i.id}>
                  <Td>{i.email}</Td>
                  <Td>{ROLE_LABELS[i.role]}</Td>
                  <Td className="max-md:hidden">
                    {i.expired ? (
                      <span className="text-red-600">Expired</span>
                    ) : (
                      `Expires ${formatDate(i.expiresAt)}`
                    )}
                  </Td>
                  <Td className="text-right">
                    {RANK[i.role] < RANK[me] && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={async () => {
                          try {
                            await revoke.mutateAsync({ id: i.id });
                            toast.success('Invitation revoked.');
                          } catch (err) {
                            toast.error(errorText(err));
                          }
                        }}
                      >
                        Revoke
                      </button>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      <Card className="mt-5">
        <CardHeader title="What each role can do" />
        <CardBody>
          <dl className="grid gap-2 text-[13px] sm:grid-cols-[120px_1fr]">
            {(Object.keys(ROLE_HELP) as Role[]).map((r) => (
              <div key={r} className="contents">
                <dt className="font-bold">{ROLE_LABELS[r]}</dt>
                <dd className="text-muted">{ROLE_HELP[r]}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>

      {me === 'OWNER' && data.members.length > 1 && (
        <Card className="mt-5 border-red-200">
          <CardHeader
            title="Transfer ownership"
            description="Hand this company to another member. You will become an Admin."
            aside={<Button onClick={() => setTransferOpen(true)}>Transfer…</Button>}
          />
        </Card>
      )}

      {inviteOpen && <InviteDialog onClose={() => setInviteOpen(false)} roles={assignable(me)} />}
      {transferOpen && (
        <TransferDialog
          onClose={() => setTransferOpen(false)}
          members={data.members.filter((m) => m.user.id !== session?.user.id)}
          companyName={tenant.name}
        />
      )}
      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.user.name}?`}
        message="They lose access to this company immediately. Their past actions stay in the records."
        confirmLabel="Remove member"
        destructive
        loading={remove.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await remove.mutateAsync({ id: removing.id });
            toast.success(`${removing.user.name} removed.`);
          } catch (err) {
            toast.error(errorText(err));
          }
          setRemoving(null);
        }}
      />
    </>
  );
}

function InviteDialog({ onClose, roles }: { onClose: () => void; roles: Role[] }) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(roles[roles.length - 1] ?? 'VIEWER');
  const [error, setError] = useState<string | null>(null);
  const invite = useTenantMutation<{ email: string; role: Role }, { emailSent: boolean }>(
    'POST',
    '/invitations',
    ['team'],
  );
  return (
    <Modal
      open
      onClose={onClose}
      title="Invite a team member"
      description="They get an email link that expires in 7 days and must sign in with this email address."
      footer={
        <>
          <Button onClick={onClose} disabled={invite.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={invite.isPending}
            disabled={!email.trim()}
            onClick={async () => {
              setError(null);
              try {
                const res = await invite.mutateAsync({ email: email.trim(), role });
                toast[res.emailSent ? 'success' : 'error'](
                  res.emailSent
                    ? `Invitation sent to ${email.trim()}.`
                    : 'Invitation created, but the email could not be sent.',
                );
                onClose();
              } catch (err) {
                setError(errorText(err));
              }
            }}
          >
            Send invitation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <TextField
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        <SelectField
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          hint={ROLE_HELP[role]}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </SelectField>
      </div>
    </Modal>
  );
}

function TransferDialog({
  onClose,
  members,
  companyName,
}: {
  onClose: () => void;
  members: Member[];
  companyName: string;
}) {
  const toast = useToast();
  const [membershipId, setMembershipId] = useState('');
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const transfer = useTenantMutation<{ membershipId: string; confirmCompanyName: string }, void>(
    'POST',
    '/transfer-ownership',
    ['team'],
  );
  return (
    <Modal
      open
      onClose={onClose}
      title="Transfer ownership"
      description="The new Owner controls billing and the team. This cannot be undone by you afterwards."
      footer={
        <>
          <Button onClick={onClose} disabled={transfer.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={transfer.isPending}
            disabled={
              !membershipId || confirmName.trim().toLowerCase() !== companyName.toLowerCase()
            }
            onClick={async () => {
              setError(null);
              try {
                await transfer.mutateAsync({ membershipId, confirmCompanyName: confirmName });
                toast.success('Ownership transferred. Reloading your access…');
                setTimeout(() => window.location.reload(), 800);
              } catch (err) {
                setError(errorText(err));
              }
            }}
          >
            Transfer ownership
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Notice tone="error">{error}</Notice>}
        <SelectField
          label="New owner"
          value={membershipId}
          onChange={(e) => setMembershipId(e.target.value)}
        >
          <option value="">Select a member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.name} ({m.user.email})
            </option>
          ))}
        </SelectField>
        <TextField
          label={`Type "${companyName}" to confirm`}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
        />
      </div>
    </Modal>
  );
}
