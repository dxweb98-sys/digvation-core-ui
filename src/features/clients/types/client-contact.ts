export type ContactRole = 'PRIMARY' | 'COMMERCIAL' | 'BILLING' | 'TECHNICAL';

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  role: ContactRole;
}

export interface ClientContactInput {
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  role: ContactRole;
}
