'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  document_id: string;
  file_name: string;
  subject: string;
  doc_status: string;
  sent_at: string;
}

export default function NotificationsPage() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));

    fetch('/api/notifications')
      .then(r => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
        } else {
          setErrorMsg(data.error || 'Erreur inconnue');
        }
      })
      .catch(err => setErrorMsg(String(err)))
      .finally(() => setLoading(false));
  }, [router]);

  if (!user) return <div style={{ padding: '2rem' }}>Chargement...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <h1>Mes notifications</h1>
      <p style={{ color: '#666' }}>Confirmations d'approbation et de rejet</p>

      {errorMsg && (
        <div style={{ margin: '1rem 0', padding: '1rem', backgroundColor: '#fee', color: '#c00', borderRadius: '4px' }}>
          ❌ {errorMsg}
        </div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <p>Chargement...</p>
        ) : notifications.length === 0 && !errorMsg ? (
          <p>Aucune notification pour le moment.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '0.75rem',
                backgroundColor: n.doc_status === 'approved' ? '#f0fff4' : '#fff5f5',
              }}
            >
              <Link href={`/documents/${n.document_id}`} target="_blank" style={{ fontWeight: 'bold', color: '#333', textDecoration: 'none' }}>
                {n.subject}
              </Link>
              <p style={{ fontSize: '0.85rem', color: '#666', margin: '0.25rem 0 0 0' }}>
                {new Date(n.sent_at).toLocaleString('fr-CA')}
              </p>
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
