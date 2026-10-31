import type { ReactNode } from 'react';
import { Brand } from './Brand';

interface AuthLayoutProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Centered card layout for sign-in, sign-up and onboarding. */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-8">
        <Brand />
      </div>
      <main className="w-full max-w-md rounded-card border border-line bg-white shadow-card">
        <div className="border-b border-line px-6 py-5">
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-[13px] text-muted">{description}</p>
        </div>
        <div className="px-6 py-6">{children}</div>
      </main>
      {footer && <div className="mt-5 text-[13px] text-muted">{footer}</div>}
    </div>
  );
}
