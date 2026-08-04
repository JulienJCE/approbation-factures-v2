'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { EXPENSE_CATEGORIES } from '@/lib/constants';

export default function Volet2Employe() {
  const [visaCode, setVisaCode] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [amount, setAmount] = useState('');
  const [amountTps, setAmountTps] = useState('');
  const [amountTvq, setAmountTvq] = useState('');
  const [category, setCategory] = useState('');
  const [categoryOtherDescription, setCategoryOtherDescription] = useState('');
  const [expenseExplanation, setExpenseExplanation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setFile(null);
    setAmount('');
    setAmountTps('');
    setAmountTvq('');
    setCategory('');
    setCategoryOtherDescription('');
    setExpenseExplanation('');
    // On garde le code Visa pour faciliter les soumissions multiples
  };

  /**
   * Prépare le fichier avant l'envoi :
   * - PDF : inchangé
   * - Photo (JPG/PNG/HEIC) : redimensionnée (max 2000 px) et réencodée en
   *   JPEG ~85 % via canvas → poids réduit (les photos de téléphone dépassent
   *   la limite d'upload) et compatibilité iPhone (HEIC → JPEG)
   */
  const prepareFile = async (f: File): Promise<File> => {
    if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) return f;
    try {
      const url = URL.createObjectURL(f);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('decode'));
        img.src = url;
      });
      const maxDim = 2000;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85)
      );
      if (!blob) return f;
      const baseName = f.name.replace(/\.\w+$/, '') || 'recu';
      return new File([blob], baseName + '.jpg', { type: 'image/jpeg' });
    } catch {
      // Image non décodable par ce navigateur → on laisse le serveur trancher
      return f;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Validations côté client
    if (!visaCode.trim()) {
      setMessage('❌ Veuillez entrer votre code d\'accès Visa');
      return;
    }
    if (!file) {
      setMessage('❌ Veuillez sélectionner le reçu (PDF ou photo)');
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setMessage('❌ Veuillez entrer un montant valide');
      return;
    }
    if (!category) {
      setMessage('❌ Veuillez sélectionner une catégorie');
      return;
    }
    if (category === 'Autre' && !categoryOtherDescription.trim()) {
      setMessage('❌ Veuillez décrire la dépense (catégorie Autre)');
      return;
    }

    setSubmitting(true);
    try {
      const prepared = await prepareFile(file);
      const formData = new FormData();
      formData.append('file', prepared);
      formData.append('type', 'visa');
      formData.append('volet', '2');
      formData.append('fileName', prepared.name);
      formData.append('visaCode', visaCode.trim().toUpperCase());
      formData.append('approuveurId', '');
      formData.append('amount', amount);
      if (amountTps) formData.append('amountTps', amountTps);
      if (amountTvq) formData.append('amountTvq', amountTvq);
      formData.append('category', category);
      if (categoryOtherDescription) formData.append('categoryOtherDescription', categoryOtherDescription);
      if (expenseExplanation) formData.append('expenseExplanation', expenseExplanation);

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        if (data.status === 'approved') {
          setMessage('✅ Dépense soumise et approuvée automatiquement! Tampons VISA + APPROUVÉ appliqués.');
        } else {
          let msg = '✅ Dépense soumise! Tampon VISA appliqué.';
          if (data.requestEmailSent) msg += ' 📧 Votre superviseur a été avisé pour approbation.';
          setMessage(msg);
        }
        resetForm();
      } else {
        setMessage('❌ Erreur: ' + (data.error || data.details || 'Erreur lors de la soumission'));
      }
    } catch (error) {
      setMessage('❌ Erreur: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
    } finally {
      setSubmitting(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '0.5rem', fontWeight: 500 };
  const inputStyle: React.CSSProperties = { padding: '0.5rem', width: '100%', fontSize: '1rem', boxSizing: 'border-box' };
  const fieldStyle: React.CSSProperties = { marginBottom: '1rem' };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>💳 Volet 2 - Dépense Visa</h1>
      <p style={{ color: '#555' }}>Soumettez votre reçu de dépense par carte Visa corporative.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
        <div style={fieldStyle}>
          <label style={labelStyle}>Code d'accès Visa *</label>
          <input
            type="text"
            value={visaCode}
            onChange={(e) => setVisaCode(e.target.value)}
            placeholder="XX-2026"
            disabled={submitting}
            style={{ ...inputStyle, textTransform: 'uppercase' }}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Reçu (PDF ou photo) *</label>
          <input
            type="file"
            accept="image/*,.pdf,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={submitting}
            style={{ padding: '0.5rem', maxWidth: '100%' }}
          />
          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
            📱 Sur téléphone : vous pouvez prendre le reçu en photo directement.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={labelStyle}>Montant total * ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={labelStyle}>TPS ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountTps}
              onChange={(e) => setAmountTps(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={labelStyle}>TVQ ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amountTvq}
              onChange={(e) => setAmountTvq(e.target.value)}
              placeholder="0.00"
              disabled={submitting}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Catégorie *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
            style={inputStyle}
          >
            <option value="">— Sélectionner —</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {category === 'Autre' && (
          <div style={fieldStyle}>
            <label style={labelStyle}>Description de la dépense *</label>
            <input
              type="text"
              value={categoryOtherDescription}
              onChange={(e) => setCategoryOtherDescription(e.target.value)}
              placeholder="Décrivez brièvement la dépense"
              maxLength={500}
              disabled={submitting}
              style={inputStyle}
            />
          </div>
        )}

        <div style={fieldStyle}>
          <label style={labelStyle}>Explication</label>
          <textarea
            value={expenseExplanation}
            onChange={(e) => setExpenseExplanation(e.target.value)}
            placeholder="Contexte de la dépense (ex.: dîner avec client X, déplacement chantier Y...)"
            maxLength={1000}
            rows={3}
            disabled={submitting}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: submitting ? '#ccc' : '#1e90ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {submitting ? 'Soumission en cours...' : 'Soumettre la dépense'}
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
