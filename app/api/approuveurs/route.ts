import { NextResponse } from 'next/server';
import { getApprobateurs } from '@/lib/db';

export async function GET() {
  try {
    const approuveurs = await getApprobateurs();
    return NextResponse.json(approuveurs);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur' }, { status: 500 });
  }
}
// Build timestamp: Wed Jul 22 19:58:25 UTC 2026
