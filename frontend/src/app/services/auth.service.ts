import { Injectable } from '@angular/core';

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

import { auth } from '../firebase';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user: User | null = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
    });
  }

  async waitForAuthState(): Promise<void> {
    await auth.authStateReady();
    this.user = auth.currentUser;
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const credential = await signInWithPopup(auth, provider);
    this.user = credential.user;
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    this.user = credential.user;
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    photoURL?: string,
  ): Promise<void> {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, {
      displayName,
      photoURL: photoURL || null,
    });

    this.user = credential.user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
    this.user = null;
  }

  isAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }
}
