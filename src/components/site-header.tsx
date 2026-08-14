import Link from 'next/link';
import { logout } from '@/lib/actions/auth';
import { getSession } from '@/lib/auth/session';
import { Button, buttonStyles } from '@/components/ui/button';

/**
 * Site header (server component): navigation plus the session indicator.
 * Makes the anonymous/authenticated boundary visible — the reviewer can see
 * at a glance whether mutations are available.
 */
export async function SiteHeader() {
  const session = await getSession();

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <Link href="/contacts" className="font-semibold">
        Lista kontaktów
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {session ? (
          <>
            <span className="text-zinc-500 dark:text-zinc-400">
              {session.email}
            </span>
            <form action={logout}>
              <Button type="submit" variant="secondary">
                Wyloguj
              </Button>
            </form>
          </>
        ) : (
          <Link href="/login" className={buttonStyles('secondary')}>
            Zaloguj się
          </Link>
        )}
      </nav>
    </header>
  );
}