import { NextResponse } from 'next/server';
import postgres from 'postgres';
import crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generatePassword(): string {
  // Mots de passe temporaires: prononçables + un chiffre + un symbole
  const adjectives = ['Bleu', 'Rouge', 'Vert', 'Noir', 'Blanc', 'Jaune', 'Or', 'Argent'];
  const animals = ['Loup', 'Aigle', 'Ours', 'Renard', 'Faucon', 'Lion', 'Tigre', 'Hibou'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const ani = animals[Math.floor(Math.random() * animals.length)];
  const num = Math.floor(Math.random() * 90 + 10);
  return `${adj}${ani}${num}!`;
}

const USERS = [
  { email: 'julien.j@conteneursexperts.com', name: 'Julien Jacques', role: 'admin', canApprove: true },
  { email: 'emre.k@conteneursexperts.com', name: 'Emre Keskin', role: 'approbateur', canApprove: true },
  { email: 'pierjean@conteneursexperts.com', name: 'Pierjean Savard', role: 'approbateur', canApprove: true },
  { email: 'patrick.p@conteneursexperts.com', name: 'Patrick Parent', role: 'approbateur', canApprove: true },
  { email: 'michel.v@conteneursexperts.com', name: 'Michel Villeneuve', role: 'approbateur', canApprove: true },
  { email: 'karine@conteneursexperts.com', name: 'Karine Fournelle', role: 'approbateur', canApprove: true },
  { email: 'franco.d@conteneursexperts.com', name: 'Franco Di Chiccio', role: 'approbateur', canApprove: true },
  { email: 'payable@conteneursexperts.com', name: 'Christine (Comptes payables)', role: 'comptabilite', canApprove: false },
  { email: 'comptabilite@conteneursexperts.com', name: 'Martine (Comptabilité)', role: 'comptabilite', canApprove: false },
];

export async function GET() {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });

  try {
    // Vider la table users (au cas où)
    await db`DELETE FROM users`;

    const created = [];

    for (const user of USERS) {
      const password = generatePassword();
      const hash = hashPassword(password);

      await db`
        INSERT INTO users (email, name, password_hash, role, can_approve, must_change_password)
        VALUES (${user.email}, ${user.name}, ${hash}, ${user.role}, ${user.canApprove}, true)
      `;

      created.push({
        name: user.name,
        email: user.email,
        role: user.role,
        password, // À envoyer une seule fois, en clair
      });
    }

    await db.end();

    return NextResponse.json({
      success: true,
      message: 'Utilisateurs créés!',
      users: created,
      note: 'IMPORTANT: Copiez ces mots de passe MAINTENANT — ils ne seront plus affichés.',
    });
  } catch (error) {
    await db.end();
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
