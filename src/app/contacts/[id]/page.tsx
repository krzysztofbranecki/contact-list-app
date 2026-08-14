import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getContact } from '@/db/queries';
import { removeContact } from '@/lib/actions/contacts';
import { getSession } from '@/lib/auth/session';
import { DeleteContactButton } from '@/components/delete-contact-button';
import { buttonStyles } from '@/components/ui/button';

/**
 * Public contact details (server component): every field EXCEPT the password
 * hash, with dictionary labels. Edit/delete controls render only for
 * signed-in users.
 */
export default async function ContactDetailsPage({
  params,
}: PageProps<'/contacts/[id]'>) {
  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isInteger(contactId) || contactId <= 0) notFound();

  const [contact, session] = await Promise.all([
    getContact(contactId),
    getSession(),
  ]);
  if (!contact) notFound();

  const subcategory = contact.subcategoryName ?? contact.subcategoryOther;

  const rows: [string, string][] = [
    ['Imię', contact.firstName],
    ['Nazwisko', contact.lastName],
    ['E-mail', contact.email],
    ['Kategoria', contact.categoryName],
    ...(subcategory ? [['Podkategoria', subcategory] as [string, string]] : []),
    ['Telefon', contact.phone],
    ['Data urodzenia', contact.birthDate],
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {contact.firstName} {contact.lastName}
        </h1>
        {session && (
          <div className="flex items-center gap-2">
            <Link
              href={`/contacts/${contact.id}/edit`}
              className={buttonStyles('secondary')}
            >
              Edytuj
            </Link>
            <DeleteContactButton
              action={removeContact.bind(null, contact.id)}
            />
          </div>
        )}
      </div>

      <dl className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-4 py-2">
            <dt className="w-40 shrink-0 text-zinc-500 dark:text-zinc-400">
              {label}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6">
        <Link
          href="/contacts"
          className="text-sm underline-offset-2 hover:underline"
        >
          ← Wróć do listy
        </Link>
      </p>
    </main>
  );
}