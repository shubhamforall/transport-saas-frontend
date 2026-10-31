import { vi } from 'vitest';

type Handler = (
  init: RequestInit & { url: string },
) => { status: number; body?: unknown } | undefined;

export interface FakeApi {
  calls: { method: string; path: string; headers: Record<string, string>; body?: unknown }[];
  on: (method: string, path: string, handler: Handler | { status: number; body?: unknown }) => void;
  restore: () => void;
}

const BASE = 'http://localhost:4000/api/v1';

/** Replaces window.fetch with a small router so components can be tested against API shapes. */
export function fakeApi(): FakeApi {
  const routes = new Map<string, Handler>();
  const calls: FakeApi['calls'] = [];

  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith(BASE) ? url.slice(BASE.length) : url;
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = (init.headers ?? {}) as Record<string, string>;
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, headers, body });

    if (method === 'GET' && path === '/auth/csrf' && !routes.has('GET /auth/csrf')) {
      return json(200, { csrfToken: 'csrf-test-token' });
    }
    // Exact match first (path + query), then the path alone so tests need not spell out queries.
    const handler =
      routes.get(`${method} ${path}`) ?? routes.get(`${method} ${path.split('?')[0]}`);
    const result = handler?.({ ...init, url });
    if (!result)
      return json(404, { error: { code: 'NOT_FOUND', message: `No fake for ${method} ${path}` } });
    return json(result.status, result.body);
  });

  return {
    calls,
    on: (method, path, handler) =>
      routes.set(`${method} ${path}`, typeof handler === 'function' ? handler : () => handler),
    restore: () => spy.mockRestore(),
  };
}

function json(status: number, body?: unknown): Response {
  return new Response(status === 204 || body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
