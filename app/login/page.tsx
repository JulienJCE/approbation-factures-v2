export const dynamic = 'force-dynamic';

'use client';

import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { instance, accounts } = useMsal();
  const router = useRouter();

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      router.replace('/dashboard');
    }
  }, [accounts, router]);

  const handleLogin = async () => {
    try {
      await instance.loginRedirect({
        scopes: ['openid', 'profile', 'email'],
      });
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h2>
          <p className="text-gray-600">Approbation Factures</p>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white font-medium py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Se connecter avec Azure AD
        </button>

        <p className="text-center text-gray-500 text-sm mt-6">
          Utilisez vos identifiants Conteneurs Experts
        </p>
      </div>
    </div>
  );
}
