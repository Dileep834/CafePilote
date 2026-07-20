import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const supplierFieldClass =
  'h-11 w-full rounded-xl border-0 bg-slate-100 px-3 text-base font-medium text-slate-800 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 disabled:cursor-not-allowed disabled:opacity-60';

export const supplierTextareaClass =
  'min-h-[88px] w-full resize-y rounded-xl border-0 bg-slate-100 px-3 py-2.5 text-base font-medium text-slate-800 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[#FF6A00]/30 disabled:cursor-not-allowed disabled:opacity-60';

export function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
      {required ? <span className="ml-0.5 text-[#FF6A00]">*</span> : null}
    </label>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl bg-slate-50/80 p-4 ring-1 ring-slate-100 sm:p-5', className)}>
      <div className="mb-4">
        <h3 className="text-sm font-bold tracking-tight text-slate-900 sm:text-base">{title}</h3>
        {description ? <p className="mt-0.5 text-xs font-medium text-slate-500 sm:text-sm">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
