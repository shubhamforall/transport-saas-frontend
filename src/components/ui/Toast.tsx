import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ToastContext, type ToastApi } from './toast-context';

type ToastTone = 'success' | 'error';
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const push = useCallback((message: string, tone: ToastTone) => {
    const id = nextId.current++;
    setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const value = useMemo<ToastApi>(
    () => ({ success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed right-6 bottom-6 z-50 flex max-w-90 flex-col gap-2 max-sm:right-3 max-sm:left-3"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'flex items-start gap-2 rounded-[10px] px-4 py-3 text-[13px] text-white shadow-toast',
              'animate-[toast-in_.2s_ease]',
              t.tone === 'error' ? 'bg-red-700' : 'bg-[#10223d]',
            )}
          >
            {t.tone === 'error' ? (
              <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden />
            ) : (
              <CheckCircle2 className="mt-px size-4 shrink-0" aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
