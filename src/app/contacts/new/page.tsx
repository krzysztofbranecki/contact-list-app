import { listCategories, listSubcategories } from '@/db/queries';
import { createContact } from '@/lib/actions/contacts';
import { requireAuth } from '@/lib/auth/guard';
import { ContactForm } from '@/components/contact-form';

/**
 * Protected "add contact" page. requireAuth() redirects anonymous visitors
 * (the proxy already does for UX, but the page does not rely on it).
 */
export default async function NewContactPage() {
  await requireAuth();

  const categories = await listCategories();
  const business = categories.find((c) => c.code === 'business');
  const businessSubcategories = business
    ? await listSubcategories(business.id)
    : [];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="mb-4 text-2xl font-semibold">Nowy kontakt</h1>
      <ContactForm
        mode="create"
        action={createContact}
        categories={categories}
        businessSubcategories={businessSubcategories}
      />
    </main>
  );
}