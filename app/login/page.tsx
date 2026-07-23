'use client';

export const dynamic = 'force-dynamic';

import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Suspense } from 'react';

function LoginContent() {
  const { accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      console.log('✅ User authenticated');
      router.push('/dashboard');
    }
  }, [accounts, router]);

  const handleLogin = async () => {
    try {
      // Redirect direct à Azure AD au lieu du popup
      const clientId = process.env.NEXT_PUBLIC_AZURE_CLIENT_ID;
      const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID;
      const redirectUri = window.location.origin + '/auth/callback';
      
      const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=user.read`;
      
      window.location.href = authUrl;
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
