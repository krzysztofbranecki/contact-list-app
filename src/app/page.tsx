import { redirect } from 'next/navigation';

/** The contact list is the app's home — redirect straight to it. */
export default function Home() {
  redirect('/contacts');
}