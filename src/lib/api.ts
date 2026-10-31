import { env } from './env';

export type FieldErrors = Record<string, string[]>;

/** Error returned by the API in its standard `{ error: {...} }` shape. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: FieldErrors,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ErrorBody {
  error?: { code?: string; message?: string; fieldErrors?: FieldErrors; requestId?: string };
}

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
}

// ---- CSRF -------------------------------------------------------------------------------
// The API sets an HttpOnly csrf cookie and returns the same token in the body of
// GET /auth/csrf. We keep it in memory and send it on every state-changing request.

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

async function getCsrfToken(force = false): Promise<string> {
  if (csrfToken && !force) return csrfToken;
  csrfRequest ??= fetch(`${env.apiBaseUrl}/auth/csrf`, { credentials: 'include' })
    .then(async (res) => {
      if (!res.ok)
        throw new ApiError(res.status, 'CSRF_UNAVAILABLE', 'Cannot start a secure session.');
      csrfToken = ((await res.json()) as { csrfToken: string }).csrfToken;
      return csrfToken;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

// ---- Session refresh --------------------------------------------------------------------

let refreshing: Promise<boolean> | null = null;

/** Asks the API for a new access token. Concurrent callers share one request. */
function refreshSession(): Promise<boolean> {
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = await getCsrfToken();
  return fetch(`${env.apiBaseUrl}${path}`, {
    method,
    headers,
    credentials: 'include', // auth uses HttpOnly cookies
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
}

const NO_REFRESH = new Set(['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']);

async function toApiError(res: Response): Promise<ApiError> {
  const data = (await res.json().catch(() => undefined)) as ErrorBody | undefined;
  const e = data?.error;
  return new ApiError(
    res.status,
    e?.code ?? 'UNKNOWN_ERROR',
    e?.message ?? 'Something went wrong. Please try again.',
    e?.fieldErrors,
    e?.requestId ?? res.headers.get('X-Request-Id') ?? undefined,
  );
}

/** Calls the Vaharo API. Throws ApiError for any non-2xx response. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, options);
    // Stale CSRF token (e.g. server restarted): fetch a new one and retry once.
    if (res.status === 403 && res.headers.get('Content-Type')?.includes('json')) {
      const err = await toApiError(res.clone());
      if (err.code === 'CSRF_INVALID') {
        await getCsrfToken(true);
        res = await send(path, options);
      }
    }
    // Expired access token: refresh once and retry.
    if (res.status === 401 && !NO_REFRESH.has(path) && (await refreshSession())) {
      res = await send(path, options);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection.');
  }

  if (!res.ok) throw await toApiError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Downloads a binary response (e.g. a PDF) with the same auth handling as api(). */
export async function apiBlob(path: string): Promise<Blob> {
  let res = await send(path, {});
  if (res.status === 401 && (await refreshSession())) res = await send(path, {});
  if (!res.ok) throw await toApiError(res);
  return res.blob();
}

/** Test helper: forget the cached CSRF token. */
export function resetApiStateForTests() {
  csrfToken = null;
  csrfRequest = null;
  refreshing = null;
}
