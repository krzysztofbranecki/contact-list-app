import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { LoginForm } from './login-form';

/** Login page. Signed-in users are bounced straight to the contact list. */
export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect('/contacts');
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Logowanie</h1>
      <LoginForm />
    </main>
  );
}