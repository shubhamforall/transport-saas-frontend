import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/cn';
import { Button } from './Button';
import { EmptyState, Skeleton } from './Feedback';
import { Table, Td, Th } from './Table';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
}

/** Table with loading skeleton, error and empty states built in. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  onRowClick,
  empty,
}: DataTableProps<T>) {
  if (error) {
    return (
      <EmptyState
        title="Could not load this list"
        description={error instanceof ApiError ? error.message : 'Please try again.'}
        action={onRetry && <Button onClick={onRetry}>Try again</Button>}
      />
    );
  }
  if (!loading && rows && rows.length === 0) return <>{empty}</>;
  return (
    <Table>
      <thead>
        <tr>
          {columns.map((c) => (
            <Th key={c.header} className={cn(c.className, c.hideOnMobile && 'max-md:hidden')}>
              {c.header}
            </Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading || !rows
          ? Array.from({ length: 5 }, (_, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <Td key={c.header} className={cn(c.hideOnMobile && 'max-md:hidden')}>
                    <Skeleton className="h-4 w-full max-w-40" />
                  </Td>
                ))}
              </tr>
            ))
          : rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer hover:bg-slate-50')}
              >
                {columns.map((c) => (
                  <Td key={c.header} className={cn(c.className, c.hideOnMobile && 'max-md:hidden')}>
                    {c.cell(row)}
                  </Td>
                ))}
              </tr>
            ))}
      </tbody>
    </Table>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: PaginationProps) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-muted">
      <span>
        {total} record{total === 1 ? '' : 's'}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <label className="relative w-full max-w-72">
      <span className="sr-only">{placeholder}</span>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-line py-2.5 pr-3 pl-9 text-[13px] outline-none focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
      />
    </label>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

export function FilterSelect({ label, value, onChange, options }: FilterSelectProps) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted">
      <span className="max-sm:sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-line bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-blue-400"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
