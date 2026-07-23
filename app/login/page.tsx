'use client';

export const dynamic = 'force-dynamic';

import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Suspense } from 'react';

function LoginContent() {
  const { instance, accounts, inProgress } = useMsal();
  const router = useRouter();

  useEffect(() => {
    // Si l'utilisateur est connecté, redirect au dashboard
    if (accounts && accounts.length > 0 && inProgress === 'none') {
      router.push('/dashboard');
    }
  }, [accounts, inProgress, router]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup({
        scopes: ['user.read'],
        redirectUri: window.location.origin + '/login',
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Login</h1>
      <button onClick={handleLogin} style={{ padding: '0.5rem 1rem', fontSize: '1rem' }}>
        Sign in with Azure AD
      </button>
      {inProgress && inProgress !== 'none' && <p>Logging in...</p>}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
