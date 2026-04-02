import { NextResponse } from 'next/server';
import { getPayments } from '@/lib/actions/payments';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const tenantId = searchParams.get('tenantId') || undefined;

    const result = await getPayments({
      status: status as 'pending' | 'paid' | 'failed' | undefined,
      tenantId,
    });
    if (result.error) {
      return NextResponse.json({ error: result.error, data: [] }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch payments', data: [] }, { status: 500 });
  }
}
