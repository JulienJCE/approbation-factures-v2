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
    // Récupérer TOUS les utilisateurs
    const users = await db`SELECT email, name FROM users ORDER BY role, name`;

    // Aussi corriger l'email de Christine si besoin
    await db`UPDATE users SET email = 'payables@conteneursexperts.com' WHERE email = 'payable@conteneursexperts.com'`;

    const updated: Array<{ name: string; email: string; password: string }> = [];

    for (const user of users) {
      const password = generateSafePassword();
      const hash = hashPassword(password);
      const finalEmail = user.email === 'payable@conteneursexperts.com' 
        ? 'payables@conteneursexperts.com' 
        : user.email;

      await db`
        UPDATE users
        SET password_hash = ${hash}, must_change_password = true, updated_at = NOW()
        WHERE email = ${finalEmail}
      `;

      updated.push({
        name: user.name,
        email: finalEmail,
        password: password,
      });
    }

    await db.end();

    return NextResponse.json({
      success: true,
      count: updated.length,
      users: updated,
      note: 'IMPORTANT: Copiez ces mots de passe MAINTENANT - ils ne seront plus affichés.',
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
