'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = () => {
    sessionStorage.removeItem('user');
    router.push('/login');
  };

  useEffect(() => {
    // Vérifier le user de test
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    
    const currentUser = JSON.parse(userStr);
    setUser(currentUser);

    // Charger les documents depuis la vraie base de données
    fetch('/api/documents')
      .then(r => r.json())
      .then(setDocuments)
      .catch(err => console.error('Erreur chargement documents:', err))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenue, {user.name}</p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>{user.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🚪 Logout
        </button>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Statistiques</h2>
        <p>Documents totaux: {documents.length}</p>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h2>Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link 
            href="/volet1/comptabilite"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            📤 Upload Factures (Volet 1)
          </Link>
          <Link 
            href="/volet2/employe"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            📝 Visa Dépenses (Volet 2)
          </Link>
          <Link 
            href="/approbateur"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            ✅ Approbation
          </Link>
          <Link 
            href="/notifications"
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#fd7e14',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            🔔 Mes notifications
          </Link>
        </div>
      </div>

      <div>
        <h2>Documents Récents</h2>
        {loading ? (
          <p>Chargement...</p>
        ) : documents.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #ccc' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Nom</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '0.5rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.slice(0, 5).map((doc: any) => (
                <tr key={doc.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <Link href={`/documents/${doc.id}`} target="_blank" style={{ color: '#007bff' }}>
                      {doc.fileName}
                    </Link>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{doc.type}</td>
                  <td style={{ padding: '0.5rem' }}>{doc.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>Aucun document</p>
        )}
      </div>
    </div>
  );
}
