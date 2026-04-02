import { getCurrentUser } from '@/lib/actions/auth';
import { redirect } from 'next/navigation';

export default async function SpacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUser();
  if (profile?.role === 'tenant' || profile?.role === 'vendor') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
