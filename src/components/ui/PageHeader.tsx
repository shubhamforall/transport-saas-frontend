import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-5 max-sm:flex-col">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-extrabold tracking-[1.3px] text-brand uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="text-[27px] font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
