import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

const controlClass =
  'w-full min-w-0 rounded-lg border border-field bg-white px-3 py-2.5 text-[13px] text-ink outline-none ' +
  'placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100 ' +
  'disabled:bg-slate-50 disabled:text-muted aria-invalid:border-red-400 aria-invalid:focus:ring-red-100';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  full?: boolean;
  children: ReactNode;
}

/** Label + control + hint/error, wired up with aria attributes. */
function FieldShell({ id, label, required, hint, error, full, children }: FieldShellProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', full && 'sm:col-span-2')}>
      <label htmlFor={id} className="text-xs font-bold text-slate-700">
        {label}
        {required && (
          <span className="text-red-600" aria-hidden>
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-[11px] text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-[11px] leading-snug text-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface CommonProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  full?: boolean;
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export type TextFieldProps = CommonProps & InputHTMLAttributes<HTMLInputElement>;

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, full, id, className, required, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      full={full}
    >
      <input
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(controlClass, className)}
        {...rest}
      />
    </FieldShell>
  );
});

export type SelectFieldProps = CommonProps & SelectHTMLAttributes<HTMLSelectElement>;

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, full, id, className, required, children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      id={fieldId}
      label={label}
      required={required}
      hint={hint}
      error={error}
      full={full}
    >
      <select
        ref={ref}
        id={fieldId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cn(controlClass, className)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export type TextAreaFieldProps = CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  function TextAreaField({ label, hint, error, full, id, className, required, ...rest }, ref) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell
        id={fieldId}
        label={label}
        required={required}
        hint={hint}
        error={error}
        full={full}
      >
        <textarea
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(controlClass, 'min-h-18 resize-y', className)}
          {...rest}
        />
      </FieldShell>
    );
  },
);

/** Two-column responsive grid for form fields. */
export function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-4 text-xs font-extrabold tracking-wide text-slate-700 uppercase">
      {children}
    </h3>
  );
}
