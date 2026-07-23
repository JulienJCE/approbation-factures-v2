export const DOCUMENT_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const DOCUMENT_TYPES = {
  INVOICE: 'invoice',
  VISA: 'visa',
} as const;

export const VOLETS = {
  VOLET_1: 1,
  VOLET_2: 2,
} as const;

export const ROLES = {
  APPROUVEUR: 'approuveur',
  EMPLOYE_VISA: 'employe_visa',
  COMPTABLE: 'comptable',
} as const;

export const STAMP_COLORS = {
  VISA: { r: 30, g: 144, b: 255 },
  APPROVED: { r: 197, g: 80, b: 79 },
} as const;

export const VALIDATION_MESSAGES = {
  EMAIL_INVALID: 'Veuillez entrer une adresse email valide',
  REQUIRED_FIELD: 'Ce champ est requis',
  VISA_CODE_INVALID: 'Code d\'accès invalide (format: XX-2026)',
} as const;

export const SUCCESS_MESSAGES = {
  DOCUMENT_CREATED: 'Document créé avec succès',
  DOCUMENT_APPROVED: 'Document approuvé',
  DOCUMENT_REJECTED: 'Document rejeté',
} as const;

export const ERROR_MESSAGES = {
  DOCUMENT_NOT_FOUND: 'Document non trouvé',
  INVALID_APPROVER: 'Approuveur invalide',
  INVALID_VISA_CODE: 'Code d\'accès Visa invalide',
} as const;
