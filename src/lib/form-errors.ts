import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/**
 * Copies server field errors onto the form. `rename` maps API field names to form field names
 * (e.g. { capacityMilli: 'capacity' }). Returns the message to show at the top of the form, or
 * null when every problem was attached to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  rename: Record<string, Path<T>> = {},
): string | null {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  let unmatched = false;
  for (const [key, messages] of Object.entries(err.fieldErrors ?? {})) {
    const target = rename[key] ?? key;
    if ((fields as readonly string[]).includes(target)) {
      setError(target as Path<T>, { type: 'server', message: messages[0] });
    } else {
      unmatched = true;
    }
  }
  return err.fieldErrors && !unmatched ? null : err.message;
}
