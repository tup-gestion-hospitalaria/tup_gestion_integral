import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

export const autoLoginGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  await authService.waitForAuthState();

  if (authService.isAuthenticated()) {
    return router.createUrlTree(['/items']);
  }

  return true;
};
