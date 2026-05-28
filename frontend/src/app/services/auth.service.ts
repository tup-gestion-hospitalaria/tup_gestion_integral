import { Injectable } from '@angular/core';

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';

import { auth } from '../firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user: User | null = null;

  constructor() {
    onAuthStateChanged(auth, (user) => {
      this.user = user;
    });
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();

    provider.setCustomParameters({
      prompt: 'select_account'
    });

    await signInWithPopup(auth, provider);
  }

  async loginWithEmail(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async registerWithEmail(
    email: string,
    password: string,
    displayName: string,
    photoURL?: string
  ): Promise<void> {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    await updateProfile(credential.user, {
      displayName,
      photoURL: photoURL || null
    });

    this.user = credential.user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  getCurrentUser(): User | null {
    return this.user;
  }
}