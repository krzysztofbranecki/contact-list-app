import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

/**
 * Form field primitives: a labeled wrapper with inline validation errors,
 * plus styled Input/Select controls. Keeps the form markup in one place so
 * individual forms don't repeat Tailwind class soup.
 */

const CONTROL_CLS =
  'rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900';

/** Inline list of validation messages for one field. */
export function FieldErrors({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <ul role="alert" className="text-sm text-red-600 dark:text-red-400">
      {messages.map((m) => (
        <li key={m}>{m}</li>
      ))}
    </ul>
  );
}

/** Labeled field wrapper: title, control, and its validation errors. */
export function Field({
  label,
  errors,
  children,
}: {
  label: string;
  errors?: string[];
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      <FieldErrors messages={errors} />
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={CONTROL_CLS} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={CONTROL_CLS} {...props} />;
}