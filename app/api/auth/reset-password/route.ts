import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import crypto from 'crypto';
import { sendResetEmail } from '@/lib/email';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateTempPassword(): string {
  const adjectives = ['Bleu', 'Rouge', 'Vert', 'Noir', 'Blanc', 'Jaune', 'Or', 'Argent'];
  const animals = ['Loup', 'Aigle', 'Ours', 'Renard', 'Faucon', 'Lion', 'Tigre', 'Hibou'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const ani = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${adj}${ani}${num}!`;
}

export async function POST(request: NextRequest) {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    const { email } = await request.json();

    if (!email) {
      await db.end();
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const user = await db`SELECT name, email FROM users WHERE email = ${email}`;

    if (user.length === 0) {
      await db.end();
      // Pour la sécurité, ne pas révéler si l'email existe ou non
      return NextResponse.json({ success: true, message: 'Si cet email existe, un mot de passe temporaire a été envoyé.' });
    }

    // Générer un nouveau mot de passe temporaire
    const tempPassword = generateTempPassword();
    const hash = hashPassword(tempPassword);

    await db`
      UPDATE users
      SET password_hash = ${hash}, must_change_password = true, updated_at = NOW()
      WHERE email = ${email}
    `;

    await db.end();

    // Envoyer l'email avec le nouveau mot de passe temporaire
    const emailResult = await sendResetEmail(email, user[0].name, tempPassword);

    return NextResponse.json({
      success: true,
      message: 'Si cet email existe, un mot de passe temporaire a été envoyé.',
      emailSent: emailResult.ok,
    });
  } catch (error) {
    await db.end();
    console.error('Reset password error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
