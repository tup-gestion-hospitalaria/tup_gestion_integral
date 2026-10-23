import { Healthsite } from './healthsite';

export interface Patient {
  id: string;
  fullName: string;
  email: string;
  city: string;
  country: string;
  picture: string;
  active: boolean;
  version?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  healthsite?: Healthsite;
}

export interface PatientListParams {
  page?: number;
  limit?: number;
  q?: string;
  sort?: 'fullName' | 'email' | 'city' | 'country' | 'createdAt';
  order?: 'asc' | 'desc';
  active?: boolean;
}

export interface PatientPage {
  items: Patient[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
