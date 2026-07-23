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
    if (accounts && accounts.length > 0 && inProgress === 'none') {
      console.log('✅ User authenticated, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [accounts, inProgress, router]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup({
        scopes: ['user.read'],
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
      {inProgress && inProgress !== 'none' && <p>Authenticating...</p>}
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
