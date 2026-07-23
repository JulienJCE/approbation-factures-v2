'use client';

export const dynamic = 'force-dynamic';

import { useMsal } from '@azure/msal-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Suspense } from 'react';

function LoginContent() {
  const { instance, accounts } = useMsal();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code && accounts && accounts.length > 0) {
      router.push('/dashboard');
    } else if (accounts && accounts.length > 0) {
      router.push('/dashboard');
    }
  }, [accounts, router, searchParams]);

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
