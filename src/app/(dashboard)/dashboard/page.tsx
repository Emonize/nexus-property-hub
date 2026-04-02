import { getCurrentUser } from '@/lib/actions/auth';
import type { UserRole } from '@/types/database';
import LandlordDashboard from '@/components/dashboards/LandlordDashboard';
import TenantDashboard from '@/components/dashboards/TenantDashboard';
import VendorDashboard from '@/components/dashboards/VendorDashboard';

export default async function DashboardController() {
  const profile = await getCurrentUser();
  const role = profile?.role || ('owner' as UserRole);

  if (role === 'tenant') {
    return <TenantDashboard />;
  }
  
  if (role === 'vendor') {
    return <VendorDashboard />;
  }

  return <LandlordDashboard />;
}
