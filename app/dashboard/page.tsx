export const dynamic = 'force-dynamic';

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Document } from '@/lib/types';

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [voletFilter, setVoletFilter] = useState<1 | 2 | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadDocs = async () => {
    const res = await fetch('/api/documents');
    const data = await res.json();
    setDocuments(data);
  };

  useEffect(() => {
    loadDocs();
    const interval = setInterval(loadDocs, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredDocuments = documents.filter((doc) => {
    if (voletFilter !== 'all' && doc.volet !== voletFilter) return false;
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: documents.length,
    pending: documents.filter((d) => d.status === 'pending').length,
    approved: documents.filter((d) => d.status === 'approved').length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-3xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-4 border-l-4 border-yellow-400">
          <p className="text-sm text-gray-600">En attente</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="card p-4 border-l-4 border-green-400">
          <p className="text-sm text-gray-600">Approuves</p>
          <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
        </div>
      </div>

      <div className="card p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Volet</label>
            <select value={voletFilter} onChange={(e) => setVoletFilter(e.target.value as any)} className="w-full px-4 py-2 border border-gray-300 rounded">
              <option value="all">Tous</option>
              <option value="1">Volet 1</option>
              <option value="2">Volet 2</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="w-full px-4 py-2 border border-gray-300 rounded">
              <option value="all">Tous</option>
              <option value="pending">En attente</option>
              <option value="approved">Approuve</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold">Fichier</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Type</th>
              <th className="text-left px-6 py-3 text-sm font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">
                  <Link href={`/documents/${doc.id}/approve`} className="text-ce-blue hover:underline font-medium">
                    {doc.fileName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm">{doc.type === 'invoice' ? 'Facture' : 'Visa'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={doc.status === 'approved' ? 'text-green-600' : 'text-yellow-600'}>
                    {doc.status === 'approved' ? 'Approuve' : 'En attente'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
