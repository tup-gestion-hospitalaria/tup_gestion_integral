import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

export const adminAccountGuard: CanActivateFn = async (_route, state) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  await authService.waitForAuthState();

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  if (authService.accountProfile?.status !== 'approved') {
    return router.createUrlTree(['/cuenta-estado']);
  }

  if (authService.accountProfile.role !== 'admin') {
    return router.createUrlTree(['/items']);
  }

  return true;
};
