'use client';

import { useState, useEffect } from 'react';
import { Document } from '@/lib/types';

export default function ApprovePage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetch(`/api/documents/${params.id}`).then(r => r.json()).then(setDoc).finally(() => setLoading(false));
  }, [params.id]);

  const handleApprove = async (status: 'approved' | 'rejected') => {
    setApproving(true);
    await fetch(`/api/documents/${params.id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    alert(status === 'approved' ? 'Approuve!' : 'Rejete!');
    setApproving(false);
  };

  if (loading) return <div className="text-center py-8">Chargement...</div>;
  if (!doc) return <div className="text-center py-8">Non trouve</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Approbation Document</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="card p-6">
            <h3 className="font-bold mb-4">Apercu Document</h3>
            <div className="bg-gray-100 border-2 border-gray-300 rounded p-8 text-center min-h-96 flex items-center justify-center">
              <div>
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600 font-medium">{doc.fileName}</p>
                <p className="text-sm text-gray-500 mt-2">Type: {doc.type === 'invoice' ? 'Facture' : 'Visa'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm text-gray-600">Fichier</p>
            <p className="font-medium">{doc.fileName}</p>
          </div>

          <div className="card p-4">
            <p className="text-sm text-gray-600">Type</p>
            <p className="font-medium">{doc.type === 'invoice' ? 'Facture Fournisseur' : 'Depense Visa'}</p>
          </div>

          <div className="card p-4">
            <p className="text-sm text-gray-600">Statut</p>
            <p className="font-medium">{doc.status === 'pending' ? 'En attente' : doc.status === 'approved' ? 'Approuve' : 'Rejete'}</p>
          </div>

          {doc.visaCode && (
            <div className="card p-4">
              <p className="text-sm text-gray-600">Code Visa</p>
              <p className="font-medium">{doc.visaCode}</p>
            </div>
          )}

          {doc.status === 'pending' && (
            <div className="space-y-2">
              <button onClick={() => handleApprove('approved')} disabled={approving} className="btn btn-success w-full disabled:opacity-50">
                {approving ? 'Traitement...' : '✓ Approuver'}
              </button>
              <button onClick={() => handleApprove('rejected')} disabled={approving} className="btn btn-danger w-full disabled:opacity-50">
                {approving ? 'Traitement...' : '✗ Rejeter'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <a href="/dashboard" className="text-ce-blue">← Retour Dashboard</a>
      </div>
    </div>
  );
}
