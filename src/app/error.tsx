'use client';

/**
 * Global error boundary — the last line of defense. Individual mutations
 * map their errors to form messages; anything that still escapes renders
 * this screen instead of a raw 500.
 */
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Coś poszło nie tak</h1>
      <p className="text-zinc-500 dark:text-zinc-400">
        Wystąpił nieoczekiwany błąd. Spróbuj ponownie.
      </p>
      <button
        onClick={reset}
        className="rounded bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Spróbuj ponownie
      </button>
    </main>
  );
}
