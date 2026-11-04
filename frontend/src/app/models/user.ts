export type UserRole = 'user' | 'admin' | null;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  role: UserRole;
  status: string;
  active: boolean;
}
