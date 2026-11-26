export type ReferralPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ReferralStatus =
  'draft' | 'submitted' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

export interface ReferralDestination {
  healthsiteId: string;
  name: string;
  address: string;
}

export interface ReferralEvent {
  id: string;
  action: string;
  at: string;
  actorId: string;
  fromStatus: ReferralStatus | null;
  toStatus: ReferralStatus;
  changes: Record<string, unknown> | null;
}

export interface Referral {
  id: string;
  patientId: string;
  destination: ReferralDestination;
  reason: string;
  notes: string | null;
  priority: ReferralPriority;
  responsibleId: string;
  status: ReferralStatus;
  rejectionReason: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  submittedAt: string | null;
  decidedAt: string | null;
  closedAt: string | null;
  history?: ReferralEvent[];
}

export interface ReferralCreatePayload {
  patientId: string;
  destination: ReferralDestination;
  reason: string;
  notes: string | null;
  priority: ReferralPriority;
}

export interface ReferralListParams {
  patientId?: string;
  status?: ReferralStatus;
}

export interface ReferralTransitionPayload {
  to: ReferralStatus;
  rejectionReason?: string;
}
