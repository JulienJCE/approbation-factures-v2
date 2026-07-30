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
    // 1. Lire TOUS les utilisateurs de cette connexion (même vue que le UPDATE utilisera)
    const users = await db`SELECT email, name FROM users ORDER BY role, name`;

    if (users.length === 0) {
      await db.end();
      return NextResponse.json({
        error: 'Aucun utilisateur trouvé dans la connexion. Retry.',
        count: 0,
      }, { status: 500 });
    }

    // 2. Filet de sécurité : migrer un ancien compte 'payable@' (sans s) vers 'payables@' (avec s).
    //    La source (seed-users) crée maintenant directement 'payables@' — ceci ne corrige que les données historiques.
    await db`UPDATE users SET email = 'payables@conteneursexperts.com' WHERE email = 'payable@conteneursexperts.com'`;

    // 3. Re-lire les emails (car Christine peut avoir changé)
    const currentUsers = await db`SELECT email, name FROM users ORDER BY role, name`;

    const updated: Array<{ name: string; email: string; password: string }> = [];

    // 4. Update chaque utilisateur par son email actuel (dans la même connexion)
    for (const user of currentUsers) {
      const password = generateSafePassword();
      const hash = hashPassword(password);

      const result = await db`
        UPDATE users
        SET password_hash = ${hash}, must_change_password = true, updated_at = NOW()
        WHERE email = ${user.email}
        RETURNING name
      `;

      if (result.length > 0) {
        updated.push({
          name: user.name,
          email: user.email,
          password: password,
        });
      }
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
