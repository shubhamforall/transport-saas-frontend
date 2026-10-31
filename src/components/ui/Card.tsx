import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-card border border-line bg-white shadow-card', className)}
      {...rest}
    />
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}

export function CardHeader({ title, description, aside }: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-5">
      <div>
        <h2 className="text-[15px] font-bold">{title}</h2>
        {description && <p className="mt-1 text-xs text-muted">{description}</p>}
      </div>
      {aside}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 max-sm:p-4', className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-t border-line px-6 py-4 max-sm:px-4',
        className,
      )}
      {...rest}
    />
  );
}
