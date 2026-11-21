import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import type { User } from 'firebase/auth';

import { environment } from '../../environments/environment';
import { getFirebaseAuth } from '../firebase';

export type UserAccountStatus = 'pending' | 'approved' | 'rejected' | 'disabled';
export type UserRole = 'user' | 'admin';

export interface AccountProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  role: UserRole | null;
  status: UserAccountStatus | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user: User | null = null;
  accountProfile: AccountProfile | null = null;

  private readonly http = inject(HttpClient);
  private authListenerStarted = false;

  constructor(private router: Router) {
    void this.ensureAuthListener();
  }

  private async ensureAuthListener(): Promise<void> {
    if (this.authListenerStarted) {
      return;
    }
    this.authListenerStarted = true;

    const auth = await getFirebaseAuth();
    const { onAuthStateChanged } = await import('firebase/auth');

    onAuthStateChanged(auth, (user) => {
      this.user = user;

      if (user) {
        void this.refreshAccountProfile();
      } else {
        this.accountProfile = null;
        if (!this.router.url || !this.router.url.includes('/login')) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  async waitForAuthState(): Promise<void> {
    const auth = await getFirebaseAuth();
    await this.ensureAuthListener();
    await auth.authStateReady();
    this.user = auth.currentUser;

    if (this.user) {
      await this.refreshAccountProfile();
    }
  }

  async loginWithGoogle(): Promise<void> {
    const auth = await getFirebaseAuth();
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');

    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const credential = await signInWithPopup(auth, provider);
    this.user = credential.user;
    await this.refreshAccountProfile();
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const auth = await getFirebaseAuth();
    const { signInWithEmailAndPassword } = await import('firebase/auth');

    const credential = await signInWithEmailAndPassword(auth, email, password);
    this.user = credential.user;
    await this.refreshAccountProfile();
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    photoURL?: string,
  ): Promise<void> {
    const auth = await getFirebaseAuth();
    const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');

    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, {
      displayName,
      photoURL: photoURL || null,
    });

    this.user = credential.user;
    await this.refreshAccountProfile();
  }

  async refreshAccountProfile(): Promise<AccountProfile | null> {
    if (!this.user) {
      this.accountProfile = null;
      return null;
    }

    try {
      const profile = await firstValueFrom(
        this.http.get<AccountProfile>(`${environment.backendApiUrl}/users/me`),
      );

      this.accountProfile = profile;
      return profile;
    } catch {
      this.accountProfile = null;
      return null;
    }
  }

  async logout(): Promise<void> {
    const auth = await getFirebaseAuth();
    const { signOut } = await import('firebase/auth');

    await signOut(auth);
    this.user = null;
    this.accountProfile = null;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  isApproved(): boolean {
    return this.accountProfile?.status === 'approved';
  }

  isAdmin(): boolean {
    return this.accountProfile?.role === 'admin';
  }

  getCurrentUser(): User | null {
    return this.user;
  }
}
