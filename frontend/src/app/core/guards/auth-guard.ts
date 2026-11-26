import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const authGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  await authService.waitForAuthState();

  if (authService.isAuthenticated()) {
    return true;
  }

  const queryParams = state?.url ? { returnUrl: state.url } : undefined;

  return router.createUrlTree(['/login'], queryParams ? { queryParams } : undefined);
};
