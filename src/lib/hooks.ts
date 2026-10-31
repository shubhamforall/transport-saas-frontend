import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

export function useDebouncedValue<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/**
 * List filters kept in the URL (?q=&page=&status=...), so reloads and the back button keep
 * them. Changing any filter resets to page 1.
 */
export function useListParams<K extends string>(defaults: Record<K, string>) {
  const [params, setParams] = useSearchParams();
  const values = useMemo(() => {
    const out = { ...defaults, page: '1', q: '' } as Record<K | 'page' | 'q', string>;
    for (const key of Object.keys(out) as (K | 'page' | 'q')[]) {
      const v = params.get(key);
      if (v !== null) out[key] = v;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const set = (patch: Partial<Record<K | 'page' | 'q', string>>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch) as [string, string | undefined][]) {
          if (v === undefined || v === '' || v === (defaults as Record<string, string>)[k])
            next.delete(k);
          else next.set(k, v);
        }
        if (!('page' in patch)) next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  /** Query string for the API: only non-empty values. */
  const query = (extra: Record<string, string | number | undefined> = {}) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...values, ...extra })) {
      if (v !== undefined && v !== '') q.set(k, String(v));
    }
    return q.toString();
  };

  return { values, set, query, page: Number(values.page) || 1 };
}

/** Warns before leaving the tab with unsaved changes. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}
