import crypto from 'crypto';

// Users en mémoire pour MVP (à remplacer par DB en Phase 2)
const USERS = [
  {
    id: '1',
    email: 'julien@conteneursexperts.com',
    name: 'Julien Jacques',
    passwordHash: hashPassword('123456'), // À changer après!
    role: 'admin',
  },
  {
    id: '2',
    email: 'comptable@conteneursexperts.com',
    name: 'Comptable',
    passwordHash: hashPassword('123456'),
    role: 'comptable',
  },
];

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function authenticateUser(email: string, password: string) {
  const user = USERS.find(u => u.email === email);
  
  if (!user) {
    return null;
  }

  const hash = hashPassword(password);
  if (hash !== user.passwordHash) {
    return null;
  }

  // Retourner user sans le password
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export function getCurrentUser() {
  if (typeof window === 'undefined') return null;
  const userStr = sessionStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

export function logout() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('user');
}
