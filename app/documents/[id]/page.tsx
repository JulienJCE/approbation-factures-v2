'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';

interface DocumentDetail {
  id: string;
  fileName: string;
  type: string;
  status: string;
  pdfUrl?: string;
  pdfUrlStamped?: string;
  createdAt: string;
}

export default function DocumentViewerPage() {
  const [user, setUser] = useState<any>(null);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));

    fetch(`/api/documents/${id}`)
      .then(r => r.json())
      .then(setDoc)
      .catch(err => console.error('Erreur chargement document:', err))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!user || loading) return <div style={{ padding: '2rem' }}>Chargement...</div>;
  if (!doc) return <div style={{ padding: '2rem' }}>Document introuvable.</div>;

  // Préférer le PDF tamponné s'il existe, sinon l'original
  const pdfUrl = doc.pdfUrlStamped || doc.pdfUrl;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1>{doc.fileName}</h1>
      <p style={{ color: '#666' }}>
        Statut: <strong>{doc.status}</strong>
        {doc.pdfUrlStamped && ' · Version approuvée avec tampon'}
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            style={{ width: '100%', height: '80vh', border: '1px solid #ddd', borderRadius: '4px' }}
            title={doc.fileName}
          />
        ) : (
          <p>Aucun fichier PDF disponible pour ce document.</p>
        )}
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link
          href="/approbateur"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6f42c1',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          ← Retour à l'approbation
        </Link>
        <Link
          href="/dashboard"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px',
          }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
