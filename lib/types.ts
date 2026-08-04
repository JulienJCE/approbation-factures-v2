export interface Personne {
  id: string;
  nom: string;
  email: string;
  role: 'approuveur' | 'employe_visa' | 'comptable';
}

export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type DocumentType = 'invoice' | 'visa';
export type Volet = 1 | 2;

export type ExpenseCategory =
  | 'Restaurant'
  | 'Repas'
  | 'Déplacements'
  | 'Hébergement'
  | 'Matériel'
  | 'Fourniture'
  | 'Informatique'
  | 'Autre';

export interface Document {
  id: string;
  type: DocumentType;
  fileName: string;
  volet: Volet;
  status: DocumentStatus;
  approuveurId: string;
  visaCode?: string;
  pdfUrl?: string;
  pdfUrlStamped?: string;
  submittedByName?: string;
  submittedByEmail?: string;
  amount?: number;
  amountTps?: number;
  amountTvq?: number;
  category?: ExpenseCategory;
  categoryOtherDescription?: string;
  expenseExplanation?: string;
  batchSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  stampsApplied?: string[];
}

export interface JournalCourriel {
  id: string;
  to: string;
  subject: string;
  approuveurId: string;
  documentId: string;
  status: 'sent' | 'failed';
  sentAt: Date;
}

export interface CategorieApprobateur {
  id: string;
  nom: string;
  approuveurId: string;
}
