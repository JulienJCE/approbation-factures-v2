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
  { id: '2', nom: 'Emre Keskin', email: 'emre.k@contoneursexperts.com', role: 'approuveur' },
  { id: '3', nom: 'Pierjean Savard', email: 'pierjean@conteneursexperts.com', role: 'approuveur' },
  { id: '4', nom: 'Patrick Parent', email: 'patrick.p@conteneursexperts.com', role: 'approuveur' },
  { id: '5', nom: 'Michel Villeneuve', email: 'michel.v@conteneursexperts.com', role: 'approuveur' },
  { id: '6', nom: 'Karine Fournelle', email: 'karine@conteneursexperts.com', role: 'approuveur' },
  { id: '7', nom: 'Franco Di Chiccio', email: 'franco.d@contoneursexperts.com', role: 'approuveur' },
  { id: '8', nom: 'Yanick Tremblay', email: 'yanick.t@conteneursexperts.com', role: 'employe_visa' },
  { id: '9', nom: 'Marco Chappadeau', email: 'marco.c@conteneursexperts.com', role: 'employe_visa' },
  { id: '10', nom: 'Eric Cloutier', email: 'eric.c@conteneursexperts.com', role: 'employe_visa' },
];

const routageVisa = {
  'PS-2026': { employeId: '3', approuveurId: '3', autoApprove: true },
  'EK-2026': { employeId: '2', approuveurId: '2', autoApprove: true },
  'YT-2026': { employeId: '8', approuveurId: '7', autoApprove: false },
  'MC-2026': { employeId: '9', approuveurId: '5', autoApprove: false },
  'EC-2026': { employeId: '10', approuveurId: '4', autoApprove: false },
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

export async function createDocument(data: { type: 'invoice' | 'visa'; fileName: string; approuveurId: string; volet: 1 | 2; visaCode?: string }): Promise<Document> {
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

  const result = await db`INSERT INTO documents (type, file_name, volet, status, approuveur_id, visa_code, pdf_url, stamps_applied, created_at, updated_at, approved_at) VALUES (${data.type}, ${data.fileName}, ${data.volet}, ${status}, ${data.approuveurId}, ${data.visaCode || null}, ${'/'}, ${JSON.stringify(stampsApplied)}, ${now}, ${now}, ${approvedAt || null}) RETURNING *`;
  return rowToDocument(result[0]);
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const result = await db`SELECT * FROM documents WHERE id = ${id}`;
  if (!result.length) return null;
  return rowToDocument(result[0]);
}

export async function getDocuments(filters?: { volet?: number; status?: string }): Promise<Document[]> {
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
}

export async function updateDocumentStatus(id: string, status: DocumentStatus, approvedAt?: Date): Promise<Document | null> {
  const now = new Date();
  const result = await db`UPDATE documents SET status = ${status}, updated_at = ${now}, approved_at = ${approvedAt || null} WHERE id = ${id} RETURNING *`;
  if (!result.length) return null;
  return rowToDocument(result[0]);
}

export async function logEmail(data: { to: string; subject: string; approuveurId: string; documentId: string; status: 'sent' | 'failed' }): Promise<JournalCourriel> {
  const now = new Date();
  const result = await db`INSERT INTO journal_courriels (document_id, approuveur_id, to_email, subject, status, sent_at) VALUES (${data.documentId}, ${data.approuveurId}, ${data.to}, ${data.subject}, ${data.status}, ${now}) RETURNING *`;
  const row = result[0];
  return { id: row.id, to: row.to_email, subject: row.subject, approuveurId: row.approuveur_id, documentId: row.document_id, status: row.status, sentAt: new Date(row.sent_at) };
}

export async function getEmailsForDocument(documentId: string): Promise<JournalCourriel[]> {
  const result = await db`SELECT * FROM journal_courriels WHERE document_id = ${documentId}`;
  return result.map((row: any) => ({ id: row.id, to: row.to_email, subject: row.subject, approuveurId: row.approuveur_id, documentId: row.document_id, status: row.status, sentAt: new Date(row.sent_at) }));
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
