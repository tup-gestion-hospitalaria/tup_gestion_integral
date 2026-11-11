import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { Auth, User } from 'firebase/auth';

import * as firebaseClient from '../firebase';
import { AuthService } from './auth.service';

interface AuthHarness {
  currentUser: User | null;
  authStateCallback: ((user: User | null) => void) | undefined;
  authStateReady: ReturnType<typeof vi.fn>;
  auth: {
    readonly currentUser: User | null;
    authStateReady: ReturnType<typeof vi.fn>;
    emulatorConfig: Record<string, unknown>;
  };
}

const authHarness = vi.hoisted((): AuthHarness => {
  const harness: AuthHarness = {
    currentUser: null,
    authStateCallback: undefined,
    authStateReady: vi.fn().mockResolvedValue(undefined),
    auth: {
      get currentUser() {
        return harness.currentUser;
      },
      authStateReady: vi.fn().mockResolvedValue(undefined),
      emulatorConfig: {},
    },
  };
  harness.auth.authStateReady = harness.authStateReady;
  return harness;
});

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => authHarness.auth),
  connectAuthEmulator: vi.fn(),
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
  let router: { navigate: ReturnType<typeof vi.fn>; url: string };
  let previousAuthImpl: typeof firebaseClient.firebaseAuthLoader.getAuth;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    authHarness.currentUser = null;
    authHarness.authStateCallback = undefined;
    authHarness.authStateReady.mockClear();
    previousAuthImpl = firebaseClient.firebaseAuthLoader.getAuth;
    firebaseClient.firebaseAuthLoader.getAuth = vi
      .fn()
      .mockResolvedValue(authHarness.auth as unknown as Auth);
    router = { navigate: vi.fn(), url: '/' };

    TestBed.configureTestingModule({
      providers: [AuthService, { provide: Router, useValue: router }, provideHttpClientTesting()],
    });

    service = TestBed.inject(AuthService);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    firebaseClient.firebaseAuthLoader.getAuth = previousAuthImpl;
    TestBed.resetTestingModule();
  });

  it('waitForAuthState waits for Firebase and syncs user', async () => {
    const user = { uid: '1' } as User;
    authHarness.currentUser = user;
    vi.spyOn(service, 'refreshAccountProfile').mockResolvedValue(null);

    await service.waitForAuthState();

    expect(authHarness.authStateReady).toHaveBeenCalled();
    expect(service.user).toBe(user);
  });

  it('isAuthenticated reflects current user', async () => {
    const user = { uid: '1' } as User;
    authHarness.currentUser = user;
    vi.spyOn(service, 'refreshAccountProfile').mockResolvedValue(null);
    await service.waitForAuthState();
    expect(service.isAuthenticated()).toBe(true);

    authHarness.currentUser = null;
    service.user = null;
    expect(service.isAuthenticated()).toBe(false);
  });

  it('getCurrentUser returns synced user', async () => {
    const user = { uid: '1' } as User;
    authHarness.currentUser = user;
    vi.spyOn(service, 'refreshAccountProfile').mockResolvedValue(null);
    await service.waitForAuthState();

    expect(service.getCurrentUser()).toBe(user);
  });

  it('logout signs out and clears user', async () => {
    const { signOut } = await import('firebase/auth');
    service.user = { uid: '1' } as User;

    await service.logout();

    expect(signOut).toHaveBeenCalledWith(authHarness.auth);
    expect(service.user).toBeNull();
  });

  it('syncs user and triggers profile refresh without breaking deep links on auth state change', () => {
    router.navigate.mockClear();
    const refreshSpy = vi.spyOn(service, 'refreshAccountProfile').mockResolvedValue(null);
    authHarness.authStateCallback?.({ uid: '1' } as User);

    expect(service.user).toEqual({ uid: '1' });
    expect(refreshSpy).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('navigates to login when auth state has no user', () => {
    router.navigate.mockClear();
    authHarness.authStateCallback?.(null);

    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
