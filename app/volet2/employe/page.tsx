'use client';

import { useState } from 'react';

export default function Volet2Employe() {
  const [visaCode, setVisaCode] = useState('');
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) {
      setFileName(e.dataTransfer.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visaCode || !fileName) return;
    
    await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'visa',
        fileName,
        visaCode,
        volet: 2,
        approuveurId: '',
      }),
    });
    
    setVisaCode('');
    setFileName('');
    alert('Dépense soumise!');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Volet 2: Soumission Visa</h2>
      <div className="card p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Code d&apos;accès Visa</label>
            <input type="text" value={visaCode} onChange={(e) => setVisaCode(e.target.value.toUpperCase())} placeholder="YT-2026" className="w-full px-4 py-2 border border-gray-300 rounded" />
          </div>

          <div onDragEnter={() => setDragActive(true)} onDragLeave={() => setDragActive(false)} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className={`border-2 border-dashed rounded-lg p-8 text-center ${dragActive ? 'border-ce-blue bg-blue-50' : 'border-gray-300'}`}>
            <div className="text-4xl mb-2">📸</div>
            <p className="font-medium">Glissez votre justificatif</p>
            {fileName && <p className="text-sm text-green-600 mt-2">OK {fileName}</p>}
          </div>

          <button type="submit" className="btn btn-primary w-full">Soumettre</button>
        </form>
      </div>
      <div className="mt-6"><a href="/" className="text-ce-blue">Retour</a></div>
    </div>
  );
}
