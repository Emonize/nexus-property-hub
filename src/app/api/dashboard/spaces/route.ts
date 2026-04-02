import { NextResponse } from 'next/server';
import { getSpaces } from '@/lib/actions/spaces';

export async function GET() {
  try {
    const result = await getSpaces();
    if (result.error) {
      return NextResponse.json({ error: result.error, data: [] }, { status: 500 });
    }
    return NextResponse.json({ data: result.data });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch spaces', data: [] }, { status: 500 });
  }
}
