'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ComptabilitePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

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

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'invoice');
      formData.append('volet', '1');
      formData.append('fileName', file.name);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const doc = await response.json();
        
        // Sauvegarder en sessionStorage aussi
        const uploads = JSON.parse(sessionStorage.getItem('uploads') || '[]');
        uploads.push({
          id: Math.random().toString(),
          fileName: file.name,
          type: 'invoice',
          volet: 1,
          status: 'pending',
          createdAt: new Date().toISOString(),
        });
        sessionStorage.setItem('uploads', JSON.stringify(uploads));
        
        setMessage('✅ Facture uploadée avec succès!');
        setFile(null);
        
        // Rediriger au dashboard après 2 sec
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setMessage('❌ Erreur lors de l\'upload');
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
          {uploading ? 'Upload en cours...' : 'Upload'}
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
