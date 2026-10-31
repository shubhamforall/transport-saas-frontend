import { describe, expect, it } from 'vitest';
import { invitationTokenFrom, safeNextPath, verifyEmailPath } from './safe-next';

describe('safeNextPath', () => {
  it('allows same-site paths', () => {
    expect(safeNextPath('/t/abc/dashboard')).toBe('/t/abc/dashboard');
  });

  it('blocks redirects to other websites', () => {
    expect(safeNextPath('https://evil.example')).toBeNull();
    expect(safeNextPath('//evil.example')).toBeNull();
    expect(safeNextPath('/\\evil.example')).toBeNull();
    expect(safeNextPath(null)).toBeNull();
  });
});

describe('invitationTokenFrom', () => {
  it('reads the token only from an invitation link', () => {
    expect(invitationTokenFrom('/invitations/accept?token=abc%2Bdef')).toBe('abc+def');
    expect(invitationTokenFrom('/t/x/dashboard?token=abc')).toBeUndefined();
    expect(invitationTokenFrom('//evil.example/invitations/accept?token=abc')).toBeUndefined();
    expect(invitationTokenFrom(null)).toBeUndefined();
  });
});

describe('verifyEmailPath', () => {
  it('keeps a safe next path and drops an unsafe one', () => {
    expect(verifyEmailPath('a@b.co', '/invitations/accept?token=x')).toBe(
      '/verify-email?email=a%40b.co&next=%2Finvitations%2Faccept%3Ftoken%3Dx',
    );
    expect(verifyEmailPath('a@b.co', 'https://evil.example', false)).toBe(
      '/verify-email?email=a%40b.co&sent=0',
    );
  });
});
