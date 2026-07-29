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

// Liste connue des utilisateurs — on passe pas par SELECT pour éviter le cache Neon
const KNOWN_USERS = [
  { email: 'julien.j@conteneursexperts.com', name: 'Julien Jacques' },
  { email: 'emre.k@conteneursexperts.com', name: 'Emre Keskin' },
  { email: 'pierjean@conteneursexperts.com', name: 'Pierjean Savard' },
  { email: 'patrick.p@conteneursexperts.com', name: 'Patrick Parent' },
  { email: 'michel.v@conteneursexperts.com', name: 'Michel Villeneuve' },
  { email: 'karine@conteneursexperts.com', name: 'Karine Fournelle' },
  { email: 'franco.d@conteneursexperts.com', name: 'Franco Di Chiccio' },
  { email: 'payables@conteneursexperts.com', name: 'Christine (Comptes payables)' },
  { email: 'comptabilite@conteneursexperts.com', name: 'Martine (Comptabilité)' },
];

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    // D'abord corriger l'email de Christine si besoin
    await db`UPDATE users SET email = 'payables@conteneursexperts.com' WHERE email = 'payable@conteneursexperts.com'`;

    const updated: Array<{ name: string; email: string; password: string }> = [];

    for (const user of KNOWN_USERS) {
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
