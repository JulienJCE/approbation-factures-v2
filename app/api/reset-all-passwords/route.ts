import { NextResponse } from 'next/server';
import postgres from 'postgres';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSafePassword(): string {
  const adjectives = ['Bleu', 'Rouge', 'Vert', 'Noir', 'Blanc', 'Jaune', 'Or', 'Argent'];
  const animals = ['Loup', 'Aigle', 'Ours', 'Renard', 'Faucon', 'Lion', 'Tigre', 'Hibou'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const ani = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 900 + 100);
  return `${adj}${ani}${num}`;
}

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    const users = await db`SELECT email, name FROM users ORDER BY role, name`;
    const updated = [];

    for (const user of users) {
      const password = generateSafePassword();
      const hash = hashPassword(password);

      await db`
        UPDATE users
        SET password_hash = ${hash}, must_change_password = true, updated_at = NOW()
        WHERE email = ${user.email}
      `;

      updated.push({ name: user.name, email: user.email, password });
    }

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Tous les mots de passe ont été réinitialisés (sans caractères spéciaux)',
      users: updated,
      note: 'IMPORTANT: Copiez ces mots de passe MAINTENANT - ils ne seront plus affichés.',
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
