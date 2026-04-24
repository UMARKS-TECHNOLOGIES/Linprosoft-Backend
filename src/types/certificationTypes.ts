export interface CertificationRow {
  id: number;
  professional_id: number;
  title: string;
  issuer: string | null;
  issue_date: Date | null;
  expiry_date: Date | null;
  credential_url: string | null;
  created_at: Date;
}

export interface CertificationDTO {
  id: number;
  professionalId: number;
  title: string;
  issuer: string | null;
  issueDate: Date | null;
  expiryDate: Date | null;
  credentialUrl: string | null;
  createdAt: Date;
}

export interface CreateCertificationInput {
  title: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface UpdateCertificationInput {
  title?: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
}
