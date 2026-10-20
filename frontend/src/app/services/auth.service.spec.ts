import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { User } from 'firebase/auth';
import { signOut } from 'firebase/auth';

import { auth } from '../firebase';
import { AuthService } from './auth.service';

const authHarness = vi.hoisted(() => ({
  currentUser: null as User | null,
  authStateCallback: undefined as ((user: User | null) => void) | undefined,
  authStateReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    get currentUser() {
      return authHarness.currentUser;
    },
    authStateReady: authHarness.authStateReady,
  })),
  onAuthStateChanged: vi.fn((_auth: unknown, callback: (user: User | null) => void) => {
    authHarness.authStateCallback = callback;
    return vi.fn();
  }),
  signOut: vi.fn().mockResolvedValue(undefined),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({
    setCustomParameters: vi.fn(),
  })),
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let router: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    TestBed.resetTestingModule();
    authHarness.currentUser = null;
    authHarness.authStateCallback = undefined;
    authHarness.authStateReady.mockClear();
    router = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Router, useValue: router }],
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('waitForAuthState waits for Firebase and syncs user', async () => {
    const user = { uid: '1' } as User;
    authHarness.currentUser = user;

    await service.waitForAuthState();

    expect(authHarness.authStateReady).toHaveBeenCalled();
    expect(service.user).toBe(user);
  });

  it('isAuthenticated reflects auth.currentUser', () => {
    authHarness.currentUser = { uid: '1' } as User;
    expect(service.isAuthenticated()).toBe(true);

    authHarness.currentUser = null;
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getCurrentUser returns auth.currentUser', () => {
    const user = { uid: '1' } as User;
    authHarness.currentUser = user;

    expect(service.getCurrentUser()).toBe(user);
  });

  it('logout signs out and clears user', async () => {
    service.user = { uid: '1' } as User;

    await service.logout();

    expect(signOut).toHaveBeenCalledWith(auth);
    expect(service.user).toBeNull();
  });

  it('navigates to items when auth state has a user', () => {
    router.navigate.mockClear();
    authHarness.authStateCallback?.({ uid: '1' } as User);

    expect(router.navigate).toHaveBeenCalledWith(['/items']);
  });

  it('navigates to login when auth state has no user', () => {
    router.navigate.mockClear();
    authHarness.authStateCallback?.(null);

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
