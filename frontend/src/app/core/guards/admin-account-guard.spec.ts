import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { adminAccountGuard } from './admin-account-guard';

const route = {} as ActivatedRouteSnapshot;
const state = { url: '/items/nuevo' } as RouterStateSnapshot;

describe('adminAccountGuard', () => {
  let authService: {
    accountProfile: { status: string; role: string };
    waitForAuthState: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    authService = {
      accountProfile: { status: 'approved', role: 'admin' },
      waitForAuthState: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: vi.fn().mockReturnValue(true),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });
    router = TestBed.inject(Router);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('permite administradores aprobados', async () => {
    const result = await TestBed.runInInjectionContext(() => adminAccountGuard(route, state));
    expect(result).toBe(true);
  });

  it('redirige usuarios comunes al listado', async () => {
    authService.accountProfile.role = 'user';
    const result = await TestBed.runInInjectionContext(() => adminAccountGuard(route, state));
    expect(result).toEqual(router.createUrlTree(['/items']));
  });
});
