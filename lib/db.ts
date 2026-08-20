import postgres from 'postgres';
import { 
  Personne, 
  Document, 
  DocumentStatus,
  JournalCourriel 
} from './types';

const db = postgres(process.env.DATABASE_URL!);

const personnes: Personne[] = [
  { id: '1', nom: 'Julien Jacques', email: 'julien.j@conteneursexperts.com', role: 'approuveur' },
  { id: '2', nom: 'Emre Keskin', email: 'emre.k@conteneursexperts.com', role: 'approuveur' },
  { id: '3', nom: 'Pierjean Savard', email: 'pierjean@conteneursexperts.com', role: 'approuveur' },
  { id: '4', nom: 'Patrick Parent', email: 'patrick.p@conteneursexperts.com', role: 'approuveur' },
  { id: '5', nom: 'Michel Villeneuve', email: 'michel.v@conteneursexperts.com', role: 'approuveur' },
  { id: '6', nom: 'Karine Fournelle', email: 'karine@conteneursexperts.com', role: 'approuveur' },
  { id: '7', nom: 'Franco De Ciccio', email: 'franco.d@conteneursexperts.com', role: 'approuveur' },
  { id: '8', nom: 'Yanick Tremblay', email: 'yanick.t@conteneursexperts.com', role: 'employe_visa' },
  { id: '9', nom: 'Marco Chapadeau', email: 'marco.c@conteneursexperts.com', role: 'employe_visa' },
  { id: '10', nom: 'Eric Cloutier', email: 'eric.c@conteneursexperts.com', role: 'employe_visa' },
  { id: '11', nom: 'Alain Charbonneau', email: 'alain.c@conteneursexperts.com', role: 'employe_visa' },
  { id: '12', nom: 'Stéphane Laprise', email: 'stephane.l@conteneursexperts.com', role: 'employe_visa' },
];

// Codes d'accès Visa : employé → approbateur.
// autoApprove = true réservé aux autorités ultimes (propriétaire, DG).
// Note : certains approbateurs (Julien, Karine, Franco) sont aussi
// détenteurs d'une carte Visa — ils ont donc leur propre code employé.
const routageVisa = {
  // Auto-approuvés (aucun supérieur hiérarchique)
  'PS-2026': { employeId: '3', approuveurId: '3', autoApprove: true },   // Pierjean Savard (propriétaire)
  'EK-2026': { employeId: '2', approuveurId: '2', autoApprove: true },   // Emre Keskin (directeur général)
  // Approbation requise
  'JJ-2026': { employeId: '1', approuveurId: '2', autoApprove: false },  // Julien Jacques → Emre Keskin
  'KF-2026': { employeId: '6', approuveurId: '2', autoApprove: false },  // Karine Fournelle → Emre Keskin
  'FD-2026': { employeId: '7', approuveurId: '2', autoApprove: false },  // Franco De Ciccio → Emre Keskin
  'SL-2026': { employeId: '12', approuveurId: '2', autoApprove: false }, // Stéphane Laprise → Emre Keskin
  'YT-2026': { employeId: '8', approuveurId: '7', autoApprove: false },  // Yanick Tremblay → Franco De Ciccio
  'AC-2026': { employeId: '11', approuveurId: '7', autoApprove: false }, // Alain Charbonneau → Franco De Ciccio
  'MC-2026': { employeId: '9', approuveurId: '5', autoApprove: false },  // Marco Chapadeau → Michel Villeneuve
  'EC-2026': { employeId: '10', approuveurId: '4', autoApprove: false }, // Eric Cloutier → Patrick Parent
};

function rowToDocument(row: any): Document {
  return {
    id: row.id,
    type: row.type,
    fileName: row.file_name,
    volet: row.volet,
    status: row.status,
    approuveurId: row.approuveur_id,
    visaCode: row.visa_code,
    pdfUrl: row.pdf_url,
    pdfUrlStamped: row.pdf_url_stamped,
    submittedByName: row.submitted_by_name,
    submittedByEmail: row.submitted_by_email,
    amount: row.amount != null ? Number(row.amount) : undefined,
    amountTps: row.amount_tps != null ? Number(row.amount_tps) : undefined,
    amountTvq: row.amount_tvq != null ? Number(row.amount_tvq) : undefined,
    category: row.category || undefined,
    categoryOtherDescription: row.category_other_description || undefined,
    expenseExplanation: row.expense_explanation || undefined,
    cardType: row.card_type || undefined,
    batchSentAt: row.batch_sent_at ? new Date(row.batch_sent_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
    stampsApplied: row.stamps_applied,
  };
}

export async function getApprobateurs(): Promise<Personne[]> {
  return personnes.filter(p => p.role === 'approuveur');
}

export async function getEmployesVisa(): Promise<Personne[]> {
  return personnes.filter(p => p.role === 'employe_visa');
}

export async function getPersonneById(id: string): Promise<Personne | null> {
  return personnes.find(p => p.id === id) || null;
}

export async function getPersonneByEmail(email: string): Promise<Personne | null> {
  return personnes.find(p => p.email === email) || null;
}

export async function createDocument(data: { type: 'invoice' | 'visa'; fileName: string; approuveurId: string; volet: 1 | 2; visaCode?: string; pdfUrl?: string; submittedByName?: string; submittedByEmail?: string; amount?: number; amountTps?: number; amountTvq?: number; category?: string; categoryOtherDescription?: string; expenseExplanation?: string; cardType?: 'company' | 'personal' }): Promise<Document> {
  const now = new Date();
  const visaRouting = data.visaCode ? routageVisa[data.visaCode as keyof typeof routageVisa] : null;
  const stampsApplied: string[] = [];
  let status: DocumentStatus = 'pending';
  let approvedAt: Date | undefined;

  if (data.type === 'visa') {
    stampsApplied.push('visa');
    if (visaRouting?.autoApprove) {
      status = 'approved';
      approvedAt = now;
      stampsApplied.push('approved');
    }
  }

  const stampsLiteral = '{' + stampsApplied.join(',') + '}';
  const result = await db`INSERT INTO documents (type, file_name, volet, status, approuveur_id, visa_code, pdf_url, stamps_applied, submitted_by_name, submitted_by_email, amount, amount_tps, amount_tvq, category, category_other_description, expense_explanation, card_type, created_at, updated_at, approved_at) VALUES (${data.type}, ${data.fileName}, ${data.volet}, ${status}, ${data.approuveurId}, ${data.visaCode || null}, ${data.pdfUrl || null}, ${stampsLiteral}::text[], ${data.submittedByName || null}, ${data.submittedByEmail || null}, ${data.amount ?? null}, ${data.amountTps ?? null}, ${data.amountTvq ?? null}, ${data.category || null}, ${data.categoryOtherDescription || null}, ${data.expenseExplanation || null}, ${data.cardType || 'company'}, ${now}, ${now}, ${approvedAt || null}) RETURNING *`;
  return rowToDocument(result[0]);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const result = await db`SELECT * FROM documents WHERE id = ${id}`;
  if (!result.length) return null;
  return rowToDocument(result[0]);
}

export async function getDocuments(filters?: { volet?: number; status?: string }): Promise<Document[]> {
  try {
    let result;
    
    if (filters?.volet && filters?.status) {
      result = await db`SELECT * FROM documents WHERE volet = ${filters.volet} AND status = ${filters.status} ORDER BY created_at DESC`;
    } else if (filters?.volet) {
      result = await db`SELECT * FROM documents WHERE volet = ${filters.volet} ORDER BY created_at DESC`;
    } else if (filters?.status) {
      result = await db`SELECT * FROM documents WHERE status = ${filters.status} ORDER BY created_at DESC`;
    } else {
      result = await db`SELECT * FROM documents ORDER BY created_at DESC`;
    }
    
    return result.map(rowToDocument);
  } catch (error) {
    console.error('DB error fetching documents:', error);
    return [];
  }
}

export async function updateDocumentStatus(id: string, status: DocumentStatus, approvedAt?: Date): Promise<Document | null> {
  const now = new Date();
  const result = await db`UPDATE documents SET status = ${status}, updated_at = ${now}, approved_at = ${approvedAt || null} WHERE id = ${id} RETURNING *`;
  if (!result.length) return null;
  return rowToDocument(result[0]);
}

export async function saveStampedPdfUrl(id: string, pdfUrlStamped: string): Promise<void> {
  // Écraser pdf_url avec la version tamponnée (évite d'avoir besoin d'une colonne séparée)
  await db`UPDATE documents SET pdf_url = ${pdfUrlStamped} WHERE id = ${id}`;
}

export async function logEmail(data: { to: string; subject: string; approuveurId: string; documentId: string; status: 'sent' | 'failed' }): Promise<JournalCourriel | null> {
  try {
    const now = new Date();
    const result = await db`INSERT INTO journal_courriels (document_id, approuveur_id, to_email, subject, status, sent_at) VALUES (${data.documentId}, ${data.approuveurId}, ${data.to}, ${data.subject}, ${data.status}, ${now}) RETURNING *`;
    const row = result[0];
    return { id: row.id, to: row.to_email, subject: row.subject, approuveurId: row.approuveur_id, documentId: row.document_id, status: row.status, sentAt: new Date(row.sent_at) };
  } catch (error) {
    console.error('DB error logging email:', error);
    return null;
  }
}

export async function getEmailsForDocument(documentId: string): Promise<JournalCourriel[]> {
  const result = await db`SELECT * FROM journal_courriels WHERE document_id = ${documentId}`;
  return result.map((row: any) => ({ id: row.id, to: row.to_email, subject: row.subject, approuveurId: row.approuveur_id, documentId: row.document_id, status: row.status, sentAt: new Date(row.sent_at) }));
}

/**
 * Récupère les dépenses Visa (volet 2) d'une période donnée qui n'ont pas
 * encore été incluses dans un envoi batch à la comptabilité.
 * Inclut TOUS les statuts (approved, pending, rejected) — Christine gère
 * elle-même les exceptions.
 */
export async function getExpensesForMonthlyBatch(periodStart: Date, periodEnd: Date): Promise<Document[]> {
  const result = await db`SELECT * FROM documents WHERE volet = 2 AND type = 'visa' AND batch_sent_at IS NULL AND created_at >= ${periodStart} AND created_at < ${periodEnd} ORDER BY created_at ASC`;
  return result.map(rowToDocument);
}

/**
 * Marque une liste de dépenses comme incluses dans le batch mensuel
 * (évite les doublons lors des envois suivants).
 */
export async function markExpensesBatchSent(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const now = new Date();
  const result = await db`UPDATE documents SET batch_sent_at = ${now}, updated_at = ${now} WHERE id IN ${db(ids)} RETURNING id`;
  return result.length;
}

export function getVisaRouting(code: string) {
  return routageVisa[code as keyof typeof routageVisa] || null;
}

export function isValidVisaCode(code: string) {
  return code in routageVisa;
}

export function isAutoApproveVisa(code: string) {
  return routageVisa[code as keyof typeof routageVisa]?.autoApprove ?? false;
}
