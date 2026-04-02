import { NextResponse } from 'next/server';
import { getLeases } from '@/lib/actions/leases';

export async function GET() {
  try {
    const result = await getLeases();
    if (result.error) {
      return NextResponse.json({ error: result.error, data: [] }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch leases', data: [] }, { status: 500 });
  }
}
