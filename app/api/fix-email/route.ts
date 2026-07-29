import { NextResponse } from 'next/server';
import postgres from 'postgres';

// Utilitaire pour corriger un email utilisateur: /api/fix-email?old=X&new=Y
export async function GET(request: Request) {
  const url = new URL(request.url);
  const oldEmail = url.searchParams.get('old');
  const newEmail = url.searchParams.get('new');

  if (!oldEmail || !newEmail) {
    return NextResponse.json({ error: 'Usage: /api/fix-email?old=X&new=Y' }, { status: 400 });
  }

  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    const result = await db`
      UPDATE users SET email = ${newEmail}, updated_at = NOW() WHERE email = ${oldEmail} RETURNING name, email
    `;
    await db.end();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable avec cet email' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Email de ${result[0].name} changé de ${oldEmail} à ${newEmail}`,
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
