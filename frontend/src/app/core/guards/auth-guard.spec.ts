import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { authGuard } from './auth-guard';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('authGuard', () => {
  let authService: {
    waitForAuthState: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    authService = {
      waitForAuthState: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('waits for auth state and allows access when authenticated', async () => {
    authService.isAuthenticated.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(authService.waitForAuthState).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('redirects to login when not authenticated', async () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() => authGuard(route, state));

    expect(authService.waitForAuthState).toHaveBeenCalled();
    expect(result).toEqual(router.createUrlTree(['/login']));
  });
});
