import { notFound } from 'next/navigation';
import { getContact, listCategories, listSubcategories } from '@/db/queries';
import { editContact } from '@/lib/actions/contacts';
import { requireAuth } from '@/lib/auth/guard';
import { ContactForm } from '@/components/contact-form';

/**
 * Protected "edit contact" page. The form is prefilled with everything
 * except the password — the hash never reaches the client, and an empty
 * password field means "keep current credentials".
 */
export default async function EditContactPage({
  params,
}: PageProps<'/contacts/[id]/edit'>) {
  const session = await requireAuth();

  const { id } = await params;
  const contactId = Number(id);
  if (!Number.isInteger(contactId) || contactId <= 0) notFound();

  const contact = await getContact(contactId);
  if (!contact) notFound();

  const categories = await listCategories();
  const business = categories.find((c) => c.code === 'business');
  const businessSubcategories = business
    ? await listSubcategories(business.id)
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="mb-4 text-2xl font-semibold">
        Edycja: {contact.firstName} {contact.lastName}
      </h1>
      <ContactForm
        mode="edit"
        action={editContact.bind(null, contact.id)}
        categories={categories}
        businessSubcategories={businessSubcategories}
        canChangePassword={session.contactId === contact.id}
        defaults={{
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          categoryId: contact.categoryId,
          subcategoryId: contact.subcategoryId,
          subcategoryOther: contact.subcategoryOther,
          phone: contact.phone,
          birthDate: contact.birthDate,
        }}
      />
    </main>
  );
}