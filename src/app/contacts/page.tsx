import Link from 'next/link';
import { listContacts } from '@/db/queries';
import { getSession } from '@/lib/auth/session';
import { buttonStyles } from '@/components/ui/button';

/**
 * Public contact list (server component): basic data only, click-through to
 * details. The "add" button renders only for signed-in users; the Server
 * Action re-checks the session anyway.
 */
export default async function ContactsPage() {
  const [contacts, session] = await Promise.all([listContacts(), getSession()]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kontakty</h1>
        {session && (
          <Link href="/contacts/new" className={buttonStyles('primary')}>
            Dodaj kontakt
          </Link>
        )}
      </div>

      {contacts.length === 0 ? (
        <p className="text-zinc-500">Brak kontaktów.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-300 text-left dark:border-zinc-700">
              <th className="py-2 pr-4">Imię i nazwisko</th>
              <th className="py-2 pr-4">E-mail</th>
              <th className="py-2">Kategoria</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr
                key={c.id}
                className="border-b border-zinc-200 dark:border-zinc-800"
              >
                <td className="py-2 pr-4">
                  <Link
                    href={`/contacts/${c.id}`}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    {c.firstName} {c.lastName}
                  </Link>
                </td>
                <td className="py-2 pr-4">{c.email}</td>
                <td className="py-2">{c.categoryName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}