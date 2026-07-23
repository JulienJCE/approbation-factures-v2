'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Document } from '@/lib/types';

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(setDocuments)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Dashboard</h1>
      <p>Documents: {documents.length}</p>
      {loading ? <p>Loading...</p> : <p>Loaded {documents.length} documents</p>}
      <Link href="/volet1/comptabilite">Volet 1</Link>
      <br />
      <Link href="/volet2/employe">Volet 2</Link>
    </div>
  );
}
