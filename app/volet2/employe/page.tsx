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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    // Validations côté client
    if (!visaCode.trim()) {
      setMessage('❌ Veuillez entrer votre code d\'accès Visa');
      return;
    }
    if (!file) {
      setMessage('❌ Veuillez sélectionner le reçu PDF');
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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'visa');
      formData.append('volet', '2');
      formData.append('fileName', file.name);
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
          <label style={labelStyle}>Reçu (PDF) *</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={submitting}
            style={{ padding: '0.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
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
          <div style={{ flex: 1 }}>
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
          <div style={{ flex: 1 }}>
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
