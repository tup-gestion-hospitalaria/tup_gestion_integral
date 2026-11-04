import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export const autoLoginGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  await authService.waitForAuthState();

  if (authService.isAuthenticated()) {
    if (authService.accountProfile?.status && authService.accountProfile.status !== 'approved') {
      return router.createUrlTree(['/cuenta-estado']);
    }
    return router.createUrlTree(['/items']);
  }

  return true;
};
