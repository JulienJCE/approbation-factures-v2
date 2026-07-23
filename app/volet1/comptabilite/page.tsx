'use client';

import { useState, useEffect } from 'react';
import { Personne } from '@/lib/types';

export default function Volet1Comptabilite() {
  const [approuveurs, setApprobateurs] = useState<Personne[]>([]);
  const [fileName, setFileName] = useState('');
  const [selectedApprobateur, setSelectedApprobateur] = useState('');
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    fetch('/api/approuveurs').then(r => r.json()).then(setApprobateurs);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !selectedApprobateur) return;
    
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'invoice',
        fileName,
        approuveurId: selectedApprobateur,
        volet: 1,
      }),
    });
    
    setFileName('');
    setSelectedApprobateur('');
    alert('Facture uploadée!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Volet 1: Upload Facture</h2>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            onDragEnter={() => setDragActive(true)}
            onDragLeave={() => setDragActive(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center ${dragActive ? 'border-ce-blue bg-blue-50' : 'border-gray-300'}`}
          >
            <div className="text-4xl mb-2">📄</div>
            <p className="font-medium text-gray-900">Glissez votre facture ici</p>
            {fileName && <p className="text-sm text-green-600 mt-2">✓ {fileName}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Approuveur</label>
            <select
              value={selectedApprobateur}
              onChange={(e) => setSelectedApprobateur(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded"
            >
              <option value="">-- Sélectionner --</option>
              {approuveurs.map((app) => (
                <option key={app.id} value={app.id}>{app.nom}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary w-full">Upload Facture</button>
        </form>
      </div>
      <div className="mt-6">
        <a href="/" className="text-ce-blue">← Retour</a>
      </div>
    </div>
  );
}
