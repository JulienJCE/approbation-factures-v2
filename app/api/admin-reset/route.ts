import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Route utilitaire admin: /api/admin-reset?email=X&password=Y
// Réinitialise directement le mot de passe d'un utilisateur
export async function GET(request: NextRequest) {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    const email = request.nextUrl.searchParams.get('email');
    const password = request.nextUrl.searchParams.get('password');

    if (!email || !password) {
      await db.end();
      return NextResponse.json({
        error: 'Usage: /api/admin-reset?email=...&password=...',
      }, { status: 400 });
    }

    const hash = hashPassword(password);

    const result = await db`
      UPDATE users
      SET password_hash = ${hash}, must_change_password = false, updated_at = NOW()
      WHERE email = ${email}
      RETURNING name, email
    `;

    await db.end();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Mot de passe de ${result[0].name} réinitialisé à: ${password}`,
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
