'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface ExpenseDoc {
  id: string;
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedByName?: string;
  amount?: number;
  amountTps?: number;
  amountTvq?: number;
  category?: string;
  categoryOtherDescription?: string;
  expenseExplanation?: string;
  pdfUrl?: string;
  createdAt: string;
  batchSentAt?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ En attente',
  approved: '✅ Approuvée',
  rejected: '❌ Rejetée',
};

const fmtMoney = (n?: number) =>
  n != null ? n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' }) : '—';

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-CA', { timeZone: 'America/Toronto' });

export default function ChristineExpenses() {
  const [user, setUser] = useState<any>(null);
  const [docs, setDocs] = useState<ExpenseDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [employeFilter, setEmployeFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(''); // format YYYY-MM
  const router = useRouter();

  useEffect(() => {
    const userStr = sessionStorage.getItem('user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(userStr));

    fetch('/api/documents?volet=2')
      .then((r) => r.json())
      .then((data) => setDocs(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Erreur chargement dépenses:', err))
      .finally(() => setLoading(false));
  }, [router]);

  const employes = useMemo(
    () => [...new Set(docs.map((d) => d.submittedByName).filter(Boolean))].sort() as string[],
    [docs]
  );

  const filtered = useMemo(
    () =>
      docs.filter((d) => {
        if (statusFilter && d.status !== statusFilter) return false;
        if (employeFilter && d.submittedByName !== employeFilter) return false;
        if (monthFilter) {
          const m = new Date(d.createdAt).toLocaleDateString('sv-SE', { timeZone: 'America/Toronto' }).slice(0, 7);
          if (m !== monthFilter) return false;
        }
        return true;
      }),
    [docs, statusFilter, employeFilter, monthFilter]
  );

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, d) => ({
          amount: acc.amount + (d.amount || 0),
          tps: acc.tps + (d.amountTps || 0),
          tvq: acc.tvq + (d.amountTvq || 0),
        }),
        { amount: 0, tps: 0, tvq: 0 }
      ),
    [filtered]
  );

  const exportCsv = () => {
    const esc = (v: any) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const num = (n?: number) => (n != null ? String(n).replace('.', ',') : '');
    const header = ['Date', 'Employé', 'Montant', 'TPS', 'TVQ', 'Catégorie', 'Explication', 'Statut', 'Fichier', 'Reçu (URL)'];
    const lines = filtered.map((d) =>
      [
        fmtDate(d.createdAt),
        esc(d.submittedByName),
        num(d.amount),
        num(d.amountTps),
        num(d.amountTvq),
        esc(d.category === 'Autre' && d.categoryOtherDescription ? `Autre (${d.categoryOtherDescription})` : d.category),
        esc(d.expenseExplanation),
        esc(STATUS_LABELS[d.status]?.replace(/^\S+ /, '') || d.status),
        esc(d.fileName),
        esc(d.pdfUrl),
      ].join(';')
    );
    const csv = '\uFEFF' + header.join(';') + '\n' + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `depenses-visa${monthFilter ? '-' + monthFilter : ''}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const thStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid #ddd', background: '#f0f4f8', textAlign: 'left', fontSize: '0.85rem' };
  const tdStyle: React.CSSProperties = { padding: '0.5rem', border: '1px solid #ddd', fontSize: '0.85rem' };
  const tdRight: React.CSSProperties = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' };

  if (!user) return <div>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>💳 Dépenses Visa — Comptabilité</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#666' }}>
            Consultation des dépenses du Volet 2 (le paiement se gère dans Prextra)
          </p>
        </div>
        <Link href="/dashboard">← Retour au Dashboard</Link>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Statut</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="">Tous</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvée</option>
            <option value="rejected">Rejetée</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Employé</label>
          <select value={employeFilter} onChange={(e) => setEmployeFilter(e.target.value)} style={{ padding: '0.4rem' }}>
            <option value="">Tous</option>
            {employes.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Mois</label>
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ padding: '0.35rem' }} />
        </div>
        {(statusFilter || employeFilter || monthFilter) && (
          <button
            onClick={() => { setStatusFilter(''); setEmployeFilter(''); setMonthFilter(''); }}
            style={{ padding: '0.45rem 0.8rem', background: '#eee', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          >
            Réinitialiser
          </button>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            style={{ padding: '0.5rem 1rem', background: filtered.length ? '#1e90ff' : '#ccc', color: 'white', border: 'none', borderRadius: '4px', cursor: filtered.length ? 'pointer' : 'not-allowed' }}
          >
            ⬇️ Exporter CSV ({filtered.length})
          </button>
        </div>
      </div>

      {loading ? (
        <p>Chargement des dépenses...</p>
      ) : !filtered.length ? (
        <p style={{ padding: '2rem', background: '#f8f9fa', borderRadius: '4px', textAlign: 'center', color: '#666' }}>
          Aucune dépense Visa {docs.length ? 'ne correspond aux filtres' : 'pour le moment'}.
        </p>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Employé</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>TPS</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>TVQ</th>
              <th style={thStyle}>Catégorie</th>
              <th style={thStyle}>Explication</th>
              <th style={thStyle}>Statut</th>
              <th style={thStyle}>Reçu</th>
              <th style={thStyle}>Batch</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{fmtDate(d.createdAt)}</td>
                <td style={tdStyle}>{d.submittedByName || '—'}</td>
                <td style={tdRight}>{fmtMoney(d.amount)}</td>
                <td style={tdRight}>{fmtMoney(d.amountTps)}</td>
                <td style={tdRight}>{fmtMoney(d.amountTvq)}</td>
                <td style={tdStyle}>
                  {d.category || '—'}
                  {d.category === 'Autre' && d.categoryOtherDescription ? ` (${d.categoryOtherDescription})` : ''}
                </td>
                <td style={tdStyle}>{d.expenseExplanation || '—'}</td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{STATUS_LABELS[d.status] || d.status}</td>
                <td style={tdStyle}>
                  {d.pdfUrl ? (
                    <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer">📄 Voir</a>
                  ) : '—'}
                </td>
                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                  {d.batchSentAt ? `📧 ${fmtDate(d.batchSentAt)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', background: '#f0f4f8' }}>
              <td style={tdStyle} colSpan={2}>TOTAL ({filtered.length} dépense{filtered.length > 1 ? 's' : ''})</td>
              <td style={tdRight}>{fmtMoney(totals.amount)}</td>
              <td style={tdRight}>{fmtMoney(totals.tps)}</td>
              <td style={tdRight}>{fmtMoney(totals.tvq)}</td>
              <td style={tdStyle} colSpan={5}></td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
