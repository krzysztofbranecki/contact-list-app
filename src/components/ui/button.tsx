import type { ButtonHTMLAttributes } from 'react';

/**
 * Tiny presentational button primitives. `buttonStyles` is exported
 * separately so links (<Link>/<a>) can share the exact same look.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'rounded bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900',
  secondary:
    'rounded border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800',
  danger:
    'rounded border border-red-300 px-3 py-1 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950',
};

/** Class string for a button-looking element (buttons and links alike). */
export function buttonStyles(variant: ButtonVariant = 'primary'): string {
  return VARIANTS[variant];
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  return <button className={buttonStyles(variant)} {...props} />;
}