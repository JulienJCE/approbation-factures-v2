import crypto from 'crypto';
import postgres from 'postgres';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'approbateur' | 'comptabilite';
  canApprove: boolean;
  mustChangePassword: boolean;
}

export async function authenticateUser(email: string, password: string): Promise<AuthUser | null> {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    const hash = hashPassword(password);
    const result = await db`
      SELECT id, email, name, role, can_approve, must_change_password
      FROM users
      WHERE email = ${email} AND password_hash = ${hash}
    `;

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      canApprove: row.can_approve,
      mustChangePassword: row.must_change_password,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  } finally {
    await db.end();
  }
}

export async function changePassword(email: string, oldPassword: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  const db = postgres(process.env.DATABASE_URL!, { max: 1, prepare: false });
  try {
    const oldHash = hashPassword(oldPassword);
    const newHash = hashPassword(newPassword);

    // Vérifier l'ancien mot de passe
    const check = await db`
      SELECT id FROM users WHERE email = ${email} AND password_hash = ${oldHash}
    `;

    if (check.length === 0) {
      return { ok: false, error: 'Ancien mot de passe incorrect' };
    }

    if (newPassword.length < 8) {
      return { ok: false, error: 'Le nouveau mot de passe doit avoir au moins 8 caractères' };
    }

    await db`
      UPDATE users
      SET password_hash = ${newHash}, must_change_password = false, updated_at = NOW()
      WHERE email = ${email}
    `;

    return { ok: true };
  } catch (error) {
    console.error('Change password error:', error);
    return { ok: false, error: String(error) };
  } finally {
    await db.end();
  }
}
