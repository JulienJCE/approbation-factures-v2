'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const router = useRouter();

  const handleTestLogin = () => {
    // Sauvegarder un user de test en sessionStorage
    sessionStorage.setItem('user', JSON.stringify({
      id: 'test-user-123',
      name: 'Test User',
      email: 'test@conteneursexperts.com',
      role: 'admin'
    }));
    
    // Rediriger au dashboard
    router.push('/dashboard');
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Approbation Factures v2</h1>
      <p>Version de test</p>
      <button 
        onClick={handleTestLogin} 
        style={{ 
          padding: '0.75rem 1.5rem', 
          fontSize: '1rem', 
          cursor: 'pointer',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        Se connecter (Mode Test)
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
