import { NextRequest, NextResponse } from 'next/server';
import { changePassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, oldPassword, newPassword } = await request.json();

    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Champs manquants' }, { status: 400 });
    }

    const result = await changePassword(email, oldPassword, newPassword);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
