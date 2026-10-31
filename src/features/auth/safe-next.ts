/** Only allows same-site relative paths, so ?next= cannot redirect to another website. */
export function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return null;
  return next;
}

/** The invitation token when ?next= points at an invitation link, so sign-up can skip the code. */
export function invitationTokenFrom(next: string | null): string | undefined {
  const path = safeNextPath(next);
  if (!path?.startsWith('/invitations/accept?')) return undefined;
  return new URLSearchParams(path.slice(path.indexOf('?') + 1)).get('token') ?? undefined;
}

/** Link to the "enter your code" page, keeping where the person was heading. */
export function verifyEmailPath(email: string, next: string | null, sent = true): string {
  const q = new URLSearchParams({ email });
  const safe = safeNextPath(next);
  if (safe) q.set('next', safe);
  if (!sent) q.set('sent', '0');
  return `/verify-email?${q.toString()}`;
}
