import { NextResponse } from 'next/server';
import { getMaintenanceTickets } from '@/lib/actions/maintenance';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;

    const result = await getMaintenanceTickets({
      status: status as 'open' | 'triaged' | 'in_progress' | undefined,
      severity: severity as 'critical' | 'high' | 'medium' | 'low' | 'cosmetic' | undefined,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error, data: [] }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tickets', data: [] }, { status: 500 });
  }
}
