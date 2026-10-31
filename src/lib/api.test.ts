import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fakeApi, type FakeApi } from '@/test/fake-api';
import { ApiError, api, resetApiStateForTests } from './api';

let server: FakeApi;
beforeEach(() => {
  resetApiStateForTests();
  server = fakeApi();
});
afterEach(() => server.restore());

describe('api client', () => {
  it('sends cookies and the CSRF token on state-changing requests only', async () => {
    server.on('POST', '/things', { status: 201, body: { ok: true } });
    server.on('GET', '/things', { status: 200, body: [] });

    await api('/things', { method: 'POST', body: { a: 1 } });
    await api('/things');

    const post = server.calls.find((c) => c.method === 'POST')!;
    expect(post.headers['X-CSRF-Token']).toBe('csrf-test-token');
    expect(post.body).toEqual({ a: 1 });
    const get = server.calls.filter((c) => c.path === '/things' && c.method === 'GET')[0]!;
    expect(get.headers['X-CSRF-Token']).toBeUndefined();
  });

  it('turns the standard error body into an ApiError with field errors', async () => {
    server.on('POST', '/auth/register', {
      status: 409,
      body: {
        error: {
          code: 'EMAIL_TAKEN',
          message: 'Taken',
          fieldErrors: { email: ['Taken'] },
          requestId: 'req-1',
        },
      },
    });
    const err = await api('/auth/register', { method: 'POST', body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 409,
      code: 'EMAIL_TAKEN',
      fieldErrors: { email: ['Taken'] },
      requestId: 'req-1',
    });
  });

  it('refreshes an expired session once and retries the request', async () => {
    let meCalls = 0;
    server.on('GET', '/auth/me', () => {
      meCalls += 1;
      return meCalls === 1
        ? { status: 401, body: { error: { code: 'UNAUTHORIZED', message: 'x' } } }
        : { status: 200, body: { user: { id: 'u1' } } };
    });
    server.on('POST', '/auth/refresh', { status: 204 });

    await expect(api('/auth/me')).resolves.toEqual({ user: { id: 'u1' } });
    expect(server.calls.filter((c) => c.path === '/auth/refresh')).toHaveLength(1);
  });

  it('does not loop when the refresh also fails', async () => {
    server.on('GET', '/auth/me', {
      status: 401,
      body: { error: { code: 'UNAUTHORIZED', message: 'x' } },
    });
    server.on('POST', '/auth/refresh', {
      status: 401,
      body: { error: { code: 'SESSION_EXPIRED', message: 'x' } },
    });

    await expect(api('/auth/me')).rejects.toMatchObject({ status: 401 });
    expect(server.calls.filter((c) => c.path === '/auth/me')).toHaveLength(1);
  });

  it('gets a new CSRF token and retries once when the old one is rejected', async () => {
    let attempts = 0;
    server.on('POST', '/things', () => {
      attempts += 1;
      return attempts === 1
        ? { status: 403, body: { error: { code: 'CSRF_INVALID', message: 'x' } } }
        : { status: 200, body: { ok: true } };
    });
    await expect(api('/things', { method: 'POST', body: {} })).resolves.toEqual({ ok: true });
    expect(server.calls.filter((c) => c.path === '/auth/csrf')).toHaveLength(2);
  });

  it('reports network failures in plain language', async () => {
    server.restore();
    const { vi } = await import('vitest');
    const spy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api('/health')).rejects.toMatchObject({ code: 'NETWORK_ERROR', status: 0 });
    spy.mockRestore();
    server = fakeApi();
  });
});
