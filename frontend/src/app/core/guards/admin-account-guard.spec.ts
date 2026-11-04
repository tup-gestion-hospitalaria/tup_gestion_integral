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
    accountProfile: { status: string; role: string } | null;
    waitForAuthState: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(() => {
    TestBed.resetTestingModule();
    authService = {
      accountProfile: null,
      waitForAuthState: vi.fn().mockResolvedValue(undefined),
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    });

    router = TestBed.inject(Router);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('permite acceder a una cuenta administradora aprobada', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.accountProfile = { status: 'approved', role: 'admin' };

    const result = await TestBed.runInInjectionContext(() => adminAccountGuard(route, state));

    expect(result).toBe(true);
  });

  it('redirige a login cuando no hay sesión', async () => {
    authService.isAuthenticated.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() => adminAccountGuard(route, state));

    expect(result).toEqual(
      router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }),
    );
  });

  it('redirige cuentas pendientes a su pantalla de estado', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.accountProfile = { status: 'pending', role: 'admin' };

    const result = await TestBed.runInInjectionContext(() => adminAccountGuard(route, state));

    expect(result).toEqual(router.createUrlTree(['/cuenta-estado']));
  });

  it('impide que un usuario común abra el formulario de administración', async () => {
    authService.isAuthenticated.mockReturnValue(true);
    authService.accountProfile = { status: 'approved', role: 'user' };

    const result = await TestBed.runInInjectionContext(() => adminAccountGuard(route, state));

    expect(result).toEqual(router.createUrlTree(['/items']));
  });
});
