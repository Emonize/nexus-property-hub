import { Loader2 } from 'lucide-react';

export default function DashboardLoading() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      background: 'var(--nexus-bg)'
    }}>
      <Loader2 size={32} className="spin" style={{ color: 'var(--nexus-primary)' }} />
    </div>
  );
}
