import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to login page for now
  // Later this will check authentication and redirect accordingly
  redirect('/login');
}
