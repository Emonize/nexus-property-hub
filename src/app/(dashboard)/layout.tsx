import Sidebar from '@/components/layout/Sidebar';
import RentovaAI from '@/components/ai/RentovaAI';
import { getCurrentUser } from '@/lib/actions/auth';
import type { UserRole } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentUser();
  const role = profile?.role || ('owner' as UserRole);
  const userName = profile?.full_name || 'User';

  return (
    <div className="app-layout">
      <Sidebar role={role} />
      <main className="main-content">
        {children}
      </main>
      <RentovaAI role={role} userName={userName} />
    </div>
  );
}
