import { NextResponse } from 'next/server';
import { getDashboardKPIs } from '@/lib/actions/payments';

export async function GET() {
  try {
    const result = await getDashboardKPIs();
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch KPIs' }, { status: 500 });
  }
}
