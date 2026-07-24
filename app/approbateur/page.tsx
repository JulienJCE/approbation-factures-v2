'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DocumentItem {
  id: string;
  fileName: string;
  type: string;
  status: string;
  createdAt: string;
}

export default function ApprobateurPage() {
  const [user, setUser] = useState<any>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const router = useRouter();

  const loadDocuments = () => {
    setLoading(true);
    fetch('/api/documents?status=pending')
      .then(r => r.json())
      .then(setDocuments)
      .catch(err => console.error('Erreur chargement documents:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));
    loadDocuments();
  }, [router]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionMessage('');
    try {
      const response = await fetch(`/api/documents/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, approverName: user?.name || 'Approbateur' }),
      });

      const data = await response.json();

      if (response.ok) {
        let msg = status === 'approved' ? '✅ Document approuvé!' : '❌ Document rejeté.';
        msg += data.emailLogged ? ' Notification envoyée.' : ' ⚠️ Notification NON envoyée';
        if (data.emailError) msg += ` (${data.emailError})`;
        if (data.stampError) msg += ` ⚠️ Tampon non appliqué: ${data.stampError}`;
        setActionMessage(msg);
        loadDocuments();
      } else {
        setActionMessage('❌ Erreur: ' + (data.details || data.error || 'Erreur lors du traitement'));
      }
    } catch (error) {
      setActionMessage('❌ Erreur: ' + (error instanceof Error ? error.message : 'Unknown'));
    }
  };

  if (!user) return <div style={{ padding: '2rem' }}>Chargement...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Approbation des factures</h1>
      <p>Connecté comme: {user.name}</p>

      {actionMessage && (
        <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          {actionMessage}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <p>Chargement...</p>
        ) : documents.length === 0 ? (
          <p>Aucune facture en attente d'approbation.</p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <Link
                  href={`/documents/${doc.id}`}
                  target="_blank"
                  style={{ fontWeight: 'bold', margin: 0, color: '#007bff', textDecoration: 'underline' }}
                >
                  📄 {doc.fileName}
                </Link>
                <p style={{ fontSize: '0.85rem', color: '#666', margin: 0 }}>
                  Type: {doc.type} · {new Date(doc.createdAt).toLocaleString('fr-CA')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleAction(doc.id, 'approved')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ✅ Approuver
                </button>
                <button
                  onClick={() => handleAction(doc.id, 'rejected')}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  ❌ Rejeter
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '2rem' }}>
        <Link href="/dashboard">← Retour au Dashboard</Link>
      </div>
    </div>
  );
}
