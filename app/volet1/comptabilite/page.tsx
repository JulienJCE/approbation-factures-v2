'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Approuveur {
  id: string;
  nom: string;
  email: string;
}

export default function ComptabilitePage() {
  const [file, setFile] = useState<File | null>(null);
  const [approuveurs, setApprouveurs] = useState<Approuveur[]>([]);
  const [approuveurId, setApprouveurId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetch('/api/approuveurs')
      .then(r => r.json())
      .then((data) => {
        setApprouveurs(data);
        if (data.length > 0) setApprouveurId(data[0].id);
      })
      .catch(err => console.error('Erreur chargement approuveurs:', err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Veuillez sélectionner un fichier');
      return;
    }
    if (!approuveurId) {
      setMessage('Veuillez sélectionner un approbateur');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'invoice');
      formData.append('volet', '1');
      formData.append('fileName', file.name);
      formData.append('approuveurId', approuveurId);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setMessage('✅ Facture envoyée à l\'approbateur avec succès!');
        setFile(null);

        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const data = await response.json();
        setMessage('❌ Erreur: ' + (data.details || data.error || 'Erreur lors de l\'upload'));
      }
    } catch (error) {
      setMessage('❌ Erreur: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Volet 1 - Upload Factures</h1>

      <form onSubmit={handleUpload} style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Sélectionner une facture PDF:
          </label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            disabled={uploading}
            style={{ padding: '0.5rem' }}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Envoyer à l'approbateur:
          </label>
          <select
            value={approuveurId}
            onChange={(e) => setApprouveurId(e.target.value)}
            disabled={uploading}
            style={{ padding: '0.5rem', width: '100%', fontSize: '1rem' }}
          >
            {approuveurs.map((a) => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={uploading || !file}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: uploading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
          }}
        >
          {uploading ? 'Upload en cours...' : 'Envoyer pour approbation'}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <Link href="/dashboard">← Retour au Dashboard</Link>
      </div>
    </div>
  );
}
