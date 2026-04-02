import Sidebar from '@/components/layout/Sidebar';
import { getCurrentUser } from '@/lib/actions/auth';
import type { UserRole } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUser();
  const role = profile?.role || ('owner' as UserRole);

  return (
    <div className="app-layout">
      <Sidebar role={role} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
